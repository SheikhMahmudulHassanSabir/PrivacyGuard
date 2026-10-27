import { PIIEntity, PIIEntityType } from '../types/privacy';

export const SUPPORTED_PII_TYPES = new Set<string>([
  'NAME_STUDENT',
  'EMAIL',
  'PHONE_NUM',
  'STREET_ADDRESS',
  'USERNAME',
  'URL_PERSONAL',
]);

function generateDeterministicId(piiType: string, start: number, end: number): string {
  return `ent_${piiType.toLowerCase()}_${start}_${end}`;
}

/**
 * Validates that an entity span has valid integer coordinates, a supported label,
 * a valid confidence score in [0, 1], and exactly matches text.slice(start, end).
 */
export function validateEntitySpan(
  text: string,
  entity: Partial<PIIEntity>
): PIIEntity | null {
  if (typeof text !== 'string' || !entity) return null;
  const { start, end, text: entText, pii_type, confidence } = entity;

  if (
    typeof start !== 'number' ||
    typeof end !== 'number' ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end <= start ||
    end > text.length
  ) {
    return null;
  }

  const expectedSlice = text.slice(start, end);
  const actualText = typeof entText === 'string' ? entText : expectedSlice;
  if (!actualText || expectedSlice !== actualText) {
    return null;
  }

  const normalizedType = String(pii_type || entity.label || 'NAME_STUDENT').toUpperCase();
  const safeConfidence =
    typeof confidence === 'number' && Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, Math.round(confidence * 100) / 100))
      : 1.0;

  return {
    entity_id: entity.entity_id || generateDeterministicId(normalizedType, start, end),
    text: actualText,
    pii_type: normalizedType as PIIEntityType,
    start,
    end,
    label: normalizedType,
    confidence: safeConfidence,
  };
}

export function cleanTrim(
  text: string,
  start: number,
  end: number,
  matchedText: string
): { start: number; end: number; text: string } | null {
  if (typeof text !== 'string' || start < 0 || end > text.length || start >= end) {
    return null;
  }
  let s = start;
  let e = end;
  let t = matchedText;

  // Strip trailing sentence punctuation while preserving balanced parentheses if part of token
  while (e > s && t.length > 0 && '.,;:!?)]}>"\''.includes(t[t.length - 1])) {
    if (t[t.length - 1] === ')' && t.includes('(')) break;
    t = t.slice(0, -1);
    e -= 1;
  }
  // Strip leading brackets/quotes except '(' when used in phone area codes like (415) 890-2314
  while (s < e && t.length > 0 && '[<{"\''.includes(t[0])) {
    t = t.slice(1);
    s += 1;
  }
  if (s < e && t[0] === '(' && !/^\(\d{1,4}\)/.test(t)) {
    t = t.slice(1);
    s += 1;
  }

  if (s >= e || !t || text.slice(s, e) !== t) {
    return null;
  }
  return { start: s, end: e, text: t };
}

const ROLE_AND_HONORIFIC_WORDS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'doctor', 'prof', 'professor',
  'rev', 'sir', 'madam', 'patient', 'client', 'student', 'teacher',
  'instructor', 'manager', 'director', 'engineer', 'developer', 'jeweler',
  'attorney', 'counsel', 'lawyer', 'nurse', 'physician', 'officer',
  'coordinator', 'specialist', 'consultant', 'analyst', 'applicant',
  'candidate', 'employee', 'employer', 'user', 'author', 'creator',
  'customer', 'member', 'contact', 'reach', 'call', 'email', 'ask',
]);

const COMMON_NON_NAME_WORDS = new Set([
  'the', 'last', 'next', 'first', 'second', 'third', 'once', 'when', 'if',
  'however', 'because', 'using', 'while', 'after', 'before', 'during',
  'within', 'without', 'under', 'over', 'between', 'among', 'through',
  'clinical', 'medical', 'personal', 'direct', 'original', 'protected',
  'residence', 'studio', 'office', 'location', 'address', 'phone', 'email',
  'website', 'portfolio', 'university', 'hospital', 'clinic', 'department',
  'summary', 'report', 'record', 'notes', 'note', 'history', 'submitted',
  'treated', 'applied', 'located', 'please', 'thank', 'thanks', 'dear',
  'hello', 'hi', 'regards', 'sincerely', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday', 'sunday', 'january', 'february',
  'march', 'april', 'may', 'june', 'july', 'august', 'september',
  'october', 'november', 'december', 'street', 'avenue', 'boulevard',
  'terrace', 'road', 'lane', 'drive', 'court', 'place', 'square',
  'highway', 'north', 'south', 'east', 'west', 'central', 'national',
  'international', 'general', 'private', 'public', 'confidential',
  'urgent', 'emergency', 'information', 'system', 'service', 'services',
  'account', 'profile', 'project', 'research', 'benchmark', 'evaluation',
  'method', 'methods', 'result', 'results', 'data', 'dataset', 'privacy',
  'security', 'norm', 'violation', 'compliant', 'decision', 'allow', 'deny',
]);

const ADDRESS_SUFFIXES = new Set([
  'street', 'st', 'avenue', 'ave', 'boulevard', 'blvd', 'terrace', 'ter',
  'road', 'rd', 'way', 'lane', 'ln', 'drive', 'dr', 'court', 'ct', 'place',
  'pl', 'square', 'sq', 'highway', 'hwy', 'parkway', 'pkwy', 'circle', 'cir',
]);

/**
 * Strip leading honorifics or role words from a candidate name match
 * so that "Patient Aaliyah Popova" resolves cleanly to "Aaliyah Popova"
 * with adjusted start offset.
 */
function stripRoleTokensFromName(
  fullText: string,
  start: number,
  end: number
): { start: number; end: number; text: string; strippedRole: boolean } | null {
  let currentStart = start;
  let currentEnd = end;
  let strippedRole = false;

  while (currentStart < currentEnd) {
    const slice = fullText.slice(currentStart, currentEnd);
    const firstTokenMatch = slice.match(/^([A-Za-zÀ-ÖØ-öø-ÿ]+)\.?\s+/);
    if (!firstTokenMatch) break;
    const firstWord = firstTokenMatch[1].toLowerCase();
    if (ROLE_AND_HONORIFIC_WORDS.has(firstWord) || COMMON_NON_NAME_WORDS.has(firstWord)) {
      if (ROLE_AND_HONORIFIC_WORDS.has(firstWord)) {
        strippedRole = true;
      }
      currentStart += firstTokenMatch[0].length;
    } else {
      break;
    }
  }

  // Also strip trailing non-name words if any
  while (currentStart < currentEnd) {
    const slice = fullText.slice(currentStart, currentEnd);
    const lastTokenMatch = slice.match(/\s+([A-Za-zÀ-ÖØ-öø-ÿ]+)$/);
    if (!lastTokenMatch) break;
    const lastWord = lastTokenMatch[1].toLowerCase();
    if (
      COMMON_NON_NAME_WORDS.has(lastWord) ||
      ROLE_AND_HONORIFIC_WORDS.has(lastWord) ||
      ADDRESS_SUFFIXES.has(lastWord)
    ) {
      currentEnd -= lastTokenMatch[0].length;
    } else {
      break;
    }
  }

  const finalSlice = fullText.slice(currentStart, currentEnd);
  if (!finalSlice || currentStart >= currentEnd) return null;

  const words = finalSlice.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  // Reject if any remaining word is a common non-name word or street suffix
  for (const w of words) {
    const cleanW = w.replace(/\./g, '').toLowerCase();
    if (
      COMMON_NON_NAME_WORDS.has(cleanW) ||
      ROLE_AND_HONORIFIC_WORDS.has(cleanW) ||
      ADDRESS_SUFFIXES.has(cleanW)
    ) {
      return null;
    }
  }

  return {
    start: currentStart,
    end: currentEnd,
    text: finalSlice,
    strippedRole,
  };
}

export class RegexDetector {
  private emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  private phonePattern =
    /(?:(?:\+\d{1,3}[-.\s]?)?\(\d{1,4}\)[-.\s]?\d{3,5}[-.\s]?\d{3,6}\b|\b(?:\+\d{1,3}[-.\s]?)?\d{3}[-.\s]\d{3,4}[-.\s]\d{4}\b|\b\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{4,6}\b|\b\d{10}\b)/g;
  private urlPattern =
    /(?<![@\w])(?:https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|\b[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.(?:com|org|net|edu|gov|io|ai|co|info|me|dev)\b(?:\/[^\s<>"]*)?)/g;
  private handlePattern = /(?<![A-Za-z0-9._%+-])@[A-Za-z0-9_]{3,25}\b/g;
  private labeledUsernamePattern = /\b(?:username|handle|user\s*id|login)\s*[:=]\s*(@?[A-Za-z0-9_.-]{3,25})\b/gi;
  private addressPattern =
    /\b\d{1,5}\s+(?:[A-ZÀ-ÖØ-Þ0-9][a-zà-öø-ÿA-Z0-9.-]*\s+){1,4}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Terrace|Ter|Road|Rd|Way|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Square|Sq|Highway|Hwy|Parkway|Pkwy)(?:\s+(?:North|South|East|West|NE|NW|SE|SW))?(?:(?:,\s*|\s+)(?:Apt\.?|Suite|Ste\.?|Unit|#)\s*[A-Za-z0-9-]+)?\b/gi;
  private introNamePattern =
    /\b(?:My name is|I am|Name\s*[:=]|Patient|Client|Student|Dr\.?|Prof\.?|Professor|Mr\.?|Mrs\.?|Ms\.?|Miss)\s+([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+){1,2})\b/g;

  detect(text: string): PIIEntity[] {
    if (typeof text !== 'string' || !text) return [];
    const entities: PIIEntity[] = [];
    const occupiedSpans = new Set<string>();

    const addEntity = (
      pii_type: PIIEntityType,
      start: number,
      end: number,
      rawMatch: string,
      confidence: number
    ) => {
      const trimmed = cleanTrim(text, start, end, rawMatch);
      if (!trimmed) return;
      const key = `${trimmed.start}:${trimmed.end}`;
      if (occupiedSpans.has(key)) return;

      const validated = validateEntitySpan(text, {
        text: trimmed.text,
        pii_type,
        start: trimmed.start,
        end: trimmed.end,
        label: pii_type,
        confidence,
      });
      if (!validated) return;

      occupiedSpans.add(key);
      entities.push(validated);
    };

    // 1. EMAIL
    const emailRe = new RegExp(this.emailPattern.source, 'g');
    const emailRanges: Array<[number, number]> = [];
    let m: RegExpExecArray | null;
    while ((m = emailRe.exec(text)) !== null) {
      const s = m.index;
      const e = m.index + m[0].length;
      emailRanges.push([s, e]);
      addEntity('EMAIL', s, e, m[0], 1.0);
    }

    const overlapsEmail = (s: number, e: number) =>
      emailRanges.some(([es, ee]) => s < ee && e > es);

    // 2. PHONE_NUM
    const phoneRe = new RegExp(this.phonePattern.source, 'g');
    while ((m = phoneRe.exec(text)) !== null) {
      const digitsOnly = m[0].replace(/\D/g, '');
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        addEntity('PHONE_NUM', m.index, m.index + m[0].length, m[0], 0.95);
      }
    }

    // 3. URL_PERSONAL (excluding spans inside emails)
    const urlRe = new RegExp(this.urlPattern.source, 'g');
    while ((m = urlRe.exec(text)) !== null) {
      const s = m.index;
      const e = m.index + m[0].length;
      if (!m[0].includes('@') && !overlapsEmail(s, e)) {
        addEntity('URL_PERSONAL', s, e, m[0], 0.9);
      }
    }

    // 4. USERNAME (@handle and labeled username: handle)
    const handleRe = new RegExp(this.handlePattern.source, 'g');
    while ((m = handleRe.exec(text)) !== null) {
      const s = m.index;
      const e = m.index + m[0].length;
      if (!overlapsEmail(s, e)) {
        addEntity('USERNAME', s, e, m[0], 0.88);
      }
    }

    const labeledUserRe = new RegExp(this.labeledUsernamePattern.source, 'gi');
    while ((m = labeledUserRe.exec(text)) !== null) {
      if (m[1]) {
        const subIdx = m[0].lastIndexOf(m[1]);
        const s = m.index + subIdx;
        const e = s + m[1].length;
        if (!overlapsEmail(s, e)) {
          addEntity('USERNAME', s, e, m[1], 0.9);
        }
      }
    }

    // 5. STREET_ADDRESS
    const addrRe = new RegExp(this.addressPattern.source, 'gi');
    while ((m = addrRe.exec(text)) !== null) {
      addEntity('STREET_ADDRESS', m.index, m.index + m[0].length, m[0], 0.9);
    }

    // 6. NAME_STUDENT via intro / role prefixes
    const nameRe = new RegExp(this.introNamePattern.source, 'g');
    while ((m = nameRe.exec(text)) !== null) {
      if (m[1]) {
        const fullMatch = m[0];
        const subIndex = fullMatch.indexOf(m[1]);
        const rawStart = m.index + subIndex;
        const rawEnd = rawStart + m[1].length;
        const cleaned = stripRoleTokensFromName(text, rawStart, rawEnd);
        if (cleaned) {
          addEntity('NAME_STUDENT', cleaned.start, cleaned.end, cleaned.text, 0.88);
        }
      }
    }

    return entities.sort((a, b) => a.start - b.start);
  }
}

export class NERDetector {
  private nameCandidatePattern =
    /\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]+){1,2})\b/g;
  private addressContextPattern = new RegExp(
    `\\b(\\d{1,5}\\s+(?:[A-ZÀ-ÖØ-Þ0-9][a-zà-öø-ÿA-Z0-9.-]+\\s+){1,4}(?:${Array.from(ADDRESS_SUFFIXES).join('|')})(?:\\s+(?:North|South|East|West|NE|NW|SE|SW))?(?:(?:,\\s*|\\s+)(?:Apt\\.?|Suite|Ste\\.?|Unit|#)\\s*[A-Za-z0-9-]+)?)\\b`,
    'gi'
  );

  detect(text: string): PIIEntity[] {
    if (typeof text !== 'string' || !text) return [];
    const entities: PIIEntity[] = [];
    const occupiedSpans = new Set<string>();

    const addEntity = (
      pii_type: PIIEntityType,
      start: number,
      end: number,
      rawMatch: string,
      confidence: number
    ) => {
      const trimmed = cleanTrim(text, start, end, rawMatch);
      if (!trimmed) return;
      const key = `${trimmed.start}:${trimmed.end}`;
      if (occupiedSpans.has(key)) return;

      const validated = validateEntitySpan(text, {
        text: trimmed.text,
        pii_type,
        start: trimmed.start,
        end: trimmed.end,
        label: pii_type,
        confidence,
      });
      if (!validated) return;

      occupiedSpans.add(key);
      entities.push(validated);
    };

    // 1. Contextual Street Addresses
    const addrRe = new RegExp(this.addressContextPattern.source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = addrRe.exec(text)) !== null) {
      const matchStr = m[1] || m[0];
      const matchStart = m.index + m[0].indexOf(matchStr);
      addEntity('STREET_ADDRESS', matchStart, matchStart + matchStr.length, matchStr, 0.88);
    }

    // 2. Contextual Names
    const nameRe = new RegExp(this.nameCandidatePattern.source, 'g');
    while ((m = nameRe.exec(text)) !== null) {
      const rawCandidate = m[1];
      const rawStart = m.index;
      const rawEnd = rawStart + rawCandidate.length;

      // Strip leading role/honorific words if captured inside the candidate
      const cleaned = stripRoleTokensFromName(text, rawStart, rawEnd);
      if (!cleaned) continue;

      const { start, end, text: candidate, strippedRole } = cleaned;
      const words = candidate.split(/\s+/).filter(Boolean);

      const beforeStart = Math.max(0, start - 35);
      const prefix = text.slice(beforeStart, start).toLowerCase().trim();
      const afterEnd = Math.min(text.length, end + 35);
      const suffix = text.slice(end, afterEnd).toLowerCase().trim();
      const tokensBefore = prefix.split(/\s+/).filter(Boolean);

      let confidence = 0.65;

      const last3Tokens = tokensBefore.slice(-3).map((t) => t.replace(/[.,;:()]/g, ''));
      if (strippedRole || last3Tokens.some((t) => ROLE_AND_HONORIFIC_WORDS.has(t))) {
        confidence += 0.25;
      } else if (
        /(?:my name is|i am|name is|regarding|contact|about|by|for|from|with|student|patient|client)\s*$/i.test(
          prefix
        )
      ) {
        confidence += 0.25;
      } else if (
        /^(?:is\s+a\b|was\b|has\b|submitted\b|applied\b|treated\b|lives\b|resides\b|works\b|graduated\b|reported\b|at\b|,)/i.test(
          suffix
        )
      ) {
        confidence += 0.2;
      } else if (start === 0 && words.length >= 2) {
        confidence += 0.15;
      }

      // Single-word candidate after stripping role requires explicit honorific or strong context
      if (words.length === 1 && !strippedRole && !last3Tokens.some((t) => ROLE_AND_HONORIFIC_WORDS.has(t))) {
        confidence -= 0.2;
      }

      if (confidence >= 0.7) {
        addEntity(
          'NAME_STUDENT',
          start,
          end,
          candidate,
          Math.min(1.0, Math.round(confidence * 100) / 100)
        );
      }
    }

    return entities.sort((a, b) => a.start - b.start);
  }
}

/**
 * Stage 3: Zero-Shot Contextual Semantic Heuristic Detector
 * Operates 100% locally in-browser without transmitting sensitive PII to external servers.
 * Captures single-token names in possessive/discourse contexts (e.g., "Rahul's", "Contact Elena"),
 * appositive introductions, and unstructured residential references.
 */
export class ContextualLLMHeuristicDetector {
  private possessiveOrActionNamePattern =
    /(?:\b(?:contact|reach|call|email|ask|meet|patient|student|client|dr\.?|prof\.?)\s+([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,20})\b|\b([A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ]{2,20})'s\s+(?:email|phone|address|portfolio|record|studio|office|home|residence|account|case|medical|thesis)\b)/g;

  detect(text: string): PIIEntity[] {
    if (typeof text !== 'string' || !text) return [];
    const entities: PIIEntity[] = [];

    const re = new RegExp(this.possessiveOrActionNamePattern.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const target = m[1] || m[2];
      if (!target) continue;
      const lower = target.toLowerCase();
      if (
        COMMON_NON_NAME_WORDS.has(lower) ||
        ROLE_AND_HONORIFIC_WORDS.has(lower) ||
        ADDRESS_SUFFIXES.has(lower)
      ) {
        continue;
      }
      const subIdx = m[0].indexOf(target);
      if (subIdx < 0) continue;
      const start = m.index + subIdx;
      const end = start + target.length;
      const validated = validateEntitySpan(text, {
        text: target,
        pii_type: 'NAME_STUDENT',
        start,
        end,
        label: 'NAME_STUDENT',
        confidence: 0.82,
      });
      if (validated) {
        entities.push(validated);
      }
    }

    return entities;
  }
}

export class HybridDetector {
  private regexDetector: RegexDetector;
  private nerDetector: NERDetector;
  private llmHeuristicDetector: ContextualLLMHeuristicDetector;
  private enableRegex: boolean;
  private enableNer: boolean;
  private enableLlm: boolean;

  private static STRUCTURED_TYPES = new Set(['EMAIL', 'PHONE_NUM', 'URL_PERSONAL', 'USERNAME']);

  constructor(
    options: {
      enableRegex?: boolean;
      enableNer?: boolean;
      enableLlm?: boolean;
    } = {}
  ) {
    this.enableRegex = options.enableRegex !== undefined ? options.enableRegex : true;
    this.enableNer = options.enableNer !== undefined ? options.enableNer : true;
    this.enableLlm = options.enableLlm !== undefined ? options.enableLlm : false;
    this.regexDetector = new RegexDetector();
    this.nerDetector = new NERDetector();
    this.llmHeuristicDetector = new ContextualLLMHeuristicDetector();
  }

  detect(text: string): PIIEntity[] {
    if (typeof text !== 'string' || !text.trim()) {
      return [];
    }

    const candidates: PIIEntity[] = [];

    if (this.enableRegex) {
      candidates.push(...this.regexDetector.detect(text));
    }

    if (this.enableNer) {
      candidates.push(...this.nerDetector.detect(text));
    }

    if (this.enableLlm) {
      candidates.push(...this.llmHeuristicDetector.detect(text));
    }

    if (candidates.length === 0) {
      return [];
    }

    // Validate all candidate spans strictly
    const validCandidates: PIIEntity[] = [];
    for (const c of candidates) {
      const v = validateEntitySpan(text, c);
      if (v) validCandidates.push(v);
    }

    // Group by exact character span [start:end]
    const exactSpans = new Map<string, PIIEntity[]>();
    for (const ent of validCandidates) {
      const key = `${ent.start}:${ent.end}`;
      const group = exactSpans.get(key) || [];
      group.push(ent);
      exactSpans.set(key, group);
    }

    const deduped: PIIEntity[] = [];
    for (const [, spanEntities] of exactSpans.entries()) {
      if (spanEntities.length === 1) {
        deduped.push(spanEntities[0]);
      } else {
        // Prefer structured type or highest confidence, boosting agreement by +0.15
        let best = spanEntities[0];
        for (const e of spanEntities) {
          const eStruct = HybridDetector.STRUCTURED_TYPES.has(e.pii_type);
          const bestStruct = HybridDetector.STRUCTURED_TYPES.has(best.pii_type);
          if (eStruct && !bestStruct) {
            best = e;
          } else if (eStruct === bestStruct && (e.confidence || 0) > (best.confidence || 0)) {
            best = e;
          }
        }
        const boosted = Math.min(1.0, (best.confidence || 0.8) + 0.15);
        deduped.push({
          ...best,
          confidence: Math.round(boosted * 100) / 100,
        });
      }
    }

    // Propagate confirmed entities (repeated occurrences of exact values or distinctive name parts)
    const propagated = this.propagateRepeatedEntities(text, deduped);

    // Sort by start asc, length desc, confidence desc
    propagated.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      const lenDiff = b.end - b.start - (a.end - a.start);
      if (lenDiff !== 0) return lenDiff;
      return (b.confidence || 0) - (a.confidence || 0);
    });

    // Resolve overlapping intervals deterministically
    const resolved: PIIEntity[] = [];
    for (const current of propagated) {
      let shouldAdd = true;
      for (let i = 0; i < resolved.length; i++) {
        const existing = resolved[i];
        // Check interval overlap: [current.start, current.end) vs [existing.start, existing.end)
        if (current.start < existing.end && current.end > existing.start) {
          const currentIsStructured = HybridDetector.STRUCTURED_TYPES.has(current.pii_type);
          const existingIsStructured = HybridDetector.STRUCTURED_TYPES.has(existing.pii_type);

          const currentWins =
            (currentIsStructured && !existingIsStructured) ||
            (currentIsStructured === existingIsStructured &&
              ((current.confidence || 0) > (existing.confidence || 0) ||
                ((current.confidence || 0) === (existing.confidence || 0) &&
                  current.end - current.start > existing.end - existing.start)));

          if (currentWins) {
            resolved.splice(i, 1);
            i--;
          } else {
            shouldAdd = false;
            break;
          }
        }
      }
      if (shouldAdd) {
        resolved.push(current);
      }
    }

    return resolved.sort((a, b) => a.start - b.start);
  }

  /**
   * Ensures that once a sensitive entity (such as a person's full name or distinctive first/last name)
   * is detected in a document, any subsequent or repeated occurrences of that same entity value in the
   * document are also detected so redaction never leaves repeated mentions exposed.
   */
  private propagateRepeatedEntities(text: string, initialEntities: PIIEntity[]): PIIEntity[] {
    const result = [...initialEntities];
    const existingKeys = new Set(initialEntities.map((e) => `${e.start}:${e.end}`));

    const tokensToPropagate: Array<{ token: string; pii_type: PIIEntityType; confidence: number }> = [];

    for (const ent of initialEntities) {
      if (ent.text.length >= 3) {
        tokensToPropagate.push({
          token: ent.text,
          pii_type: ent.pii_type as PIIEntityType,
          confidence: Math.max(0.75, (ent.confidence || 0.85) - 0.05),
        });
      }
      // For multi-word NAME_STUDENT, also propagate distinctive first/last name tokens (>= 3 chars)
      if (ent.pii_type === 'NAME_STUDENT') {
        const parts = ent.text.split(/\s+/).filter((p) => p.length >= 3);
        for (const part of parts) {
          const cleanPart = part.replace(/[.,;:!?]/g, '');
          const lower = cleanPart.toLowerCase();
          if (
            cleanPart.length >= 3 &&
            !COMMON_NON_NAME_WORDS.has(lower) &&
            !ROLE_AND_HONORIFIC_WORDS.has(lower) &&
            !ADDRESS_SUFFIXES.has(lower)
          ) {
            tokensToPropagate.push({
              token: cleanPart,
              pii_type: 'NAME_STUDENT',
              confidence: 0.78,
            });
          }
        }
      }
    }

    for (const item of tokensToPropagate) {
      const escaped = item.token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![A-Za-z0-9@_.-])${escaped}(?![A-Za-z0-9_.-])`, 'g');
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        const s = m.index;
        const e = s + m[0].length;
        const key = `${s}:${e}`;
        if (existingKeys.has(key)) continue;

        const validated = validateEntitySpan(text, {
          text: m[0],
          pii_type: item.pii_type,
          start: s,
          end: e,
          label: item.pii_type,
          confidence: item.confidence,
        });
        if (validated) {
          existingKeys.add(key);
          result.push(validated);
        }
      }
    }

    return result;
  }
}
