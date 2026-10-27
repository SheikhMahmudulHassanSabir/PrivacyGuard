import { PIIEntity, PIIEntityType } from '../types/privacy';

function generateId(): string {
  return 'ent_' + Math.random().toString(36).substring(2, 9);
}

function cleanTrim(
  text: string,
  start: number,
  end: number,
  matchedText: string
): { start: number; end: number; text: string } | null {
  let s = start;
  let e = end;
  let t = matchedText;

  while (e > s && t.length > 0 && '.,;:!?)'.includes(t[t.length - 1])) {
    t = t.slice(0, -1);
    e -= 1;
  }
  while (s < e && t.length > 0 && '([<'.includes(t[0])) {
    t = t.slice(1);
    s += 1;
  }

  if (s >= e || !t || text.slice(s, e) !== t) {
    return null;
  }
  return { start: s, end: e, text: t };
}

export class RegexDetector {
  private emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  private phonePattern = /(?:\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,6}\b|\b\d{10}\b)/g;
  private urlPattern = /\b(?:https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[A-Za-z0-9.-]+\.(?:com|org|net|edu|gov|io|ai|co|info|me)\b(?:\/[^\s<>"]*)?)/g;
  private usernamePattern = /(?:(?<=[\s(])@[A-Za-z0-9_]{3,25}\b|\busername:\s*([A-Za-z0-9_-]{3,20})\b)/gi;
  private addressPattern = /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Terrace|Ter|Road|Rd|Way|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Square|Sq|Highway|Hwy)(?:\s+(?:North|South|East|West|NE|NW|SE|SW))?\b/gi;
  private introNamePattern = /\b(?:My name is|I am|As)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;

  detect(text: string): PIIEntity[] {
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
      occupiedSpans.add(key);

      entities.push({
        entity_id: generateId(),
        text: trimmed.text,
        pii_type,
        start: trimmed.start,
        end: trimmed.end,
        label: pii_type,
        confidence,
      });
    };

    // 1. EMAIL
    const emailRe = new RegExp(this.emailPattern.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = emailRe.exec(text)) !== null) {
      addEntity('EMAIL', m.index, m.index + m[0].length, m[0], 1.0);
    }

    // 2. PHONE_NUM
    const phoneRe = new RegExp(this.phonePattern.source, 'g');
    while ((m = phoneRe.exec(text)) !== null) {
      const digitsOnly = m[0].replace(/\D/g, '');
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        addEntity('PHONE_NUM', m.index, m.index + m[0].length, m[0], 0.95);
      }
    }

    // 3. URL_PERSONAL
    const urlRe = new RegExp(this.urlPattern.source, 'g');
    while ((m = urlRe.exec(text)) !== null) {
      if (!m[0].includes('@')) {
        addEntity('URL_PERSONAL', m.index, m.index + m[0].length, m[0], 0.9);
      }
    }

    // 4. USERNAME
    const userRe = new RegExp(this.usernamePattern.source, 'gi');
    while ((m = userRe.exec(text)) !== null) {
      addEntity('USERNAME', m.index, m.index + m[0].length, m[0], 0.85);
    }

    // 5. STREET_ADDRESS
    const addrRe = new RegExp(this.addressPattern.source, 'gi');
    while ((m = addrRe.exec(text)) !== null) {
      addEntity('STREET_ADDRESS', m.index, m.index + m[0].length, m[0], 0.9);
    }

    // 6. NAME_STUDENT via intro
    const nameRe = new RegExp(this.introNamePattern.source, 'g');
    while ((m = nameRe.exec(text)) !== null) {
      if (m[1]) {
        const fullMatch = m[0];
        const subIndex = fullMatch.indexOf(m[1]);
        const start = m.index + subIndex;
        addEntity('NAME_STUDENT', start, start + m[1].length, m[1], 0.85);
      }
    }

    return entities.sort((a, b) => a.start - b.start);
  }
}

export class NERDetector {
  private static HONORIFICS = new Set([
    'mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'professor', 'manager',
    'director', 'engineer', 'developer', 'jeweler', 'attorney', 'counsel',
    'patient', 'client', 'student', 'officer', 'coordinator', 'nurse'
  ]);

  private static ADDRESS_KEYWORDS = [
    'street', 'st', 'avenue', 'ave', 'boulevard', 'blvd', 'terrace', 'ter',
    'road', 'rd', 'way', 'lane', 'ln', 'drive', 'dr', 'court', 'ct', 'place',
    'pl', 'square', 'sq', 'highway', 'hwy', 'suite', 'apt', 'apartment', 'building'
  ];

  private nameCandidatePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
  private addressContextPattern = new RegExp(
    `\\b(\\d{1,5}\\s+(?:[A-Z0-9][a-zA-Z0-9.-]+\\s+){1,4}(?:${NERDetector.ADDRESS_KEYWORDS.join('|')})(?:\\s+(?:North|South|East|West|NE|NW|SE|SW))?)\\b`,
    'gi'
  );

  detect(text: string): PIIEntity[] {
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
      occupiedSpans.add(key);

      entities.push({
        entity_id: generateId(),
        text: trimmed.text,
        pii_type,
        start: trimmed.start,
        end: trimmed.end,
        label: pii_type,
        confidence,
      });
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
    const commonWords = new Set([
      'The', 'Last', 'Next', 'First', 'Second', 'Once', 'When', 'If', 'However', 'Because', 'Using'
    ]);

    while ((m = nameRe.exec(text)) !== null) {
      const candidate = m[1];
      const start = m.index;
      const beforeStart = Math.max(0, start - 30);
      const prefix = text.slice(beforeStart, start).toLowerCase().trim();
      const tokensBefore = prefix.split(/\s+/).filter(Boolean);

      let confidence = 0.65; // Base candidate

      const last3Tokens = tokensBefore.slice(-3).map((t) => t.replace(/[.,;:()]/g, ''));
      if (last3Tokens.some((t) => NERDetector.HONORIFICS.has(t))) {
        confidence += 0.25;
      } else if (/(?:my name is|i am|name is|regarding|contact|about)\s*$/i.test(prefix)) {
        confidence += 0.25;
      } else if (start === 0) {
        confidence += 0.15;
      }

      const words = candidate.split(/\s+/);
      if (words.some((w) => commonWords.has(w))) {
        confidence -= 0.35;
      }

      if (confidence >= 0.7) {
        addEntity(
          'NAME_STUDENT',
          start,
          start + candidate.length,
          candidate,
          Math.min(1.0, Math.round(confidence * 100) / 100)
        );
      }
    }

    return entities.sort((a, b) => a.start - b.start);
  }
}

export class HybridDetector {
  private regexDetector: RegexDetector;
  private nerDetector: NERDetector;
  private enableRegex: boolean;
  private enableNer: boolean;
  private enableLlm: boolean;

  private static STRUCTURED_TYPES = new Set(['EMAIL', 'PHONE_NUM', 'URL_PERSONAL']);

  constructor(options: {
    enableRegex?: boolean;
    enableNer?: boolean;
    enableLlm?: boolean;
  } = {}) {
    this.enableRegex = options.enableRegex !== undefined ? options.enableRegex : true;
    this.enableNer = options.enableNer !== undefined ? options.enableNer : true;
    this.enableLlm = options.enableLlm !== undefined ? options.enableLlm : false;
    this.regexDetector = new RegexDetector();
    this.nerDetector = new NERDetector();
  }

  detect(text: string): PIIEntity[] {
    const candidates: PIIEntity[] = [];

    if (this.enableRegex) {
      candidates.push(...this.regexDetector.detect(text));
    }

    if (this.enableNer) {
      candidates.push(...this.nerDetector.detect(text));
    }

    if (candidates.length === 0) {
      return [];
    }

    // Group by exact character span
    const exactSpans = new Map<string, PIIEntity[]>();
    for (const ent of candidates) {
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
        // Boost confidence if multiple detectors agree
        let best = spanEntities[0];
        for (const e of spanEntities) {
          if ((e.confidence || 0) > (best.confidence || 0)) {
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

    // Sort by start asc, length desc
    deduped.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return (b.end - b.start) - (a.end - a.start);
    });

    // Resolve overlapping intervals
    const resolved: PIIEntity[] = [];
    for (const current of deduped) {
      if (resolved.length === 0) {
        resolved.push(current);
        continue;
      }

      const prev = resolved[resolved.length - 1];
      if (current.start < prev.end) {
        const currentIsStructured = HybridDetector.STRUCTURED_TYPES.has(current.pii_type);
        const prevIsStructured = HybridDetector.STRUCTURED_TYPES.has(prev.pii_type);

        if (currentIsStructured && !prevIsStructured) {
          resolved[resolved.length - 1] = current;
        } else if (prevIsStructured && !currentIsStructured) {
          // Keep previous
          continue;
        } else if ((current.confidence || 0) > (prev.confidence || 0)) {
          resolved[resolved.length - 1] = current;
        } else if (
          (current.confidence || 0) === (prev.confidence || 0) &&
          current.end - current.start > prev.end - prev.start
        ) {
          resolved[resolved.length - 1] = current;
        }
      } else {
        resolved.push(current);
      }
    }

    return resolved.sort((a, b) => a.start - b.start);
  }
}
