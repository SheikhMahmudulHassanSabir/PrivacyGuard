import { PIIEntity, PrivacyCase, MethodResult } from '../types/privacy';
import { HybridDetector } from './detectors';

// Simple fast string hash for deterministic surrogates
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// -------------------------------------------------------------
// 1. PIIvot: Context-Preserving Synthetic Pseudonymization
// -------------------------------------------------------------
export class PIIvotMethod {
  private static SYNTHETIC_NAMES = [
    'Alex Morgan', 'Jordan Taylor', 'Casey Rivera', 'Taylor Brooks',
    'Morgan Bailey', 'Riley Campbell', 'Avery Reed', 'Reese Parker',
    'Cameron Hayes', 'Dakota Ellis', 'Kendall Ward', 'Skyler Bennett'
  ];

  private static SYNTHETIC_STREETS = [
    '104 Maple Street', '742 Evergreen Terrace', '350 Fifth Avenue',
    '820 Pine Boulevard', '214 Oak Lane', '567 Willow Way'
  ];

  constructor(private detector: HybridDetector = new HybridDetector()) {}

  private generateSurrogate(entity: PIIEntity, surrogateMap: Record<string, string>): string {
    const raw = entity.text.trim();
    if (surrogateMap[raw]) {
      return surrogateMap[raw];
    }

    const h = hashString(raw);
    let surrogate = '';

    switch (entity.pii_type) {
      case 'NAME_STUDENT':
        surrogate = PIIvotMethod.SYNTHETIC_NAMES[h % PIIvotMethod.SYNTHETIC_NAMES.length];
        break;
      case 'EMAIL':
        surrogate = `user_${h % 1000}@synthetic-privacy.org`;
        break;
      case 'PHONE_NUM': {
        const p1 = 100 + (h % 900);
        const p2 = 1000 + (Math.floor(h / 1000) % 9000);
        surrogate = `(555) ${p1}-${p2}`;
        break;
      }
      case 'STREET_ADDRESS':
        surrogate = PIIvotMethod.SYNTHETIC_STREETS[h % PIIvotMethod.SYNTHETIC_STREETS.length];
        break;
      case 'USERNAME':
        surrogate = `@user_${h % 9999}`;
        break;
      case 'URL_PERSONAL':
        surrogate = `https://profile.synthetic.org/${h % 1000}`;
        break;
      default:
        surrogate = `[${entity.pii_type}]`;
    }

    surrogateMap[raw] = surrogate;
    return surrogate;
  }

  run(caseData: PrivacyCase, precomputedEntities?: PIIEntity[]): MethodResult {
    const start = performance.now();
    const entities = precomputedEntities ?? this.detector.detect(caseData.context);

    // Replace in reverse order
    const sorted = [...entities].sort((a, b) => b.start - a.start);
    const surrogateMap: Record<string, string> = {};
    let protectedText = caseData.context;
    const masked: PIIEntity[] = [];

    for (const ent of sorted) {
      const surrogate = this.generateSurrogate(ent, surrogateMap);
      protectedText = protectedText.slice(0, ent.start) + surrogate + protectedText.slice(ent.end);
      masked.push(ent);
    }

    const latency = performance.now() - start;

    return {
      case_id: caseData.case_id,
      method_name: 'piivot',
      original_text: caseData.context,
      protected_text: protectedText,
      detected_entities: entities,
      masked_entities: masked,
      latency_ms: Math.round(latency * 100) / 100,
      reasoning: `PIIvot context-preserving pseudonymization applied to ${masked.length} entities.`,
      metadata: {
        surrogate_map: surrogateMap,
        strategy: 'context_preserving_pseudonymization'
      }
    };
  }

  async runAsync(caseData: PrivacyCase): Promise<MethodResult> {
    const entities = await this.detector.detectAsync(caseData.context);
    return this.run(caseData, entities);
  }
}

// -------------------------------------------------------------
// 2. PRvL: Logic-Driven Symbolic Tokenization
// -------------------------------------------------------------
export class PRvLMethod {
  private static TYPE_PREFIXES: Record<string, string> = {
    NAME_STUDENT: 'PERSON',
    EMAIL: 'EMAIL',
    PHONE_NUM: 'PHONE',
    STREET_ADDRESS: 'ADDRESS',
    USERNAME: 'USER',
    URL_PERSONAL: 'URL'
  };

  constructor(private detector: HybridDetector = new HybridDetector()) {}

  run(caseData: PrivacyCase, precomputedEntities?: PIIEntity[]): MethodResult {
    const start = performance.now();
    const entities = precomputedEntities ?? this.detector.detect(caseData.context);

    const symbolicMap: Record<string, string> = {};
    const typeCounters: Record<string, number> = {};

    const entitiesSorted = [...entities].sort((a, b) => a.start - b.start);
    for (const ent of entitiesSorted) {
      if (!symbolicMap[ent.text]) {
        const prefix = PRvLMethod.TYPE_PREFIXES[ent.pii_type] || ent.pii_type;
        typeCounters[prefix] = (typeCounters[prefix] || 0) + 1;
        symbolicMap[ent.text] = `<${prefix}_${typeCounters[prefix]}>`;
      }
    }

    let protectedText = caseData.context;
    const sortedReverse = [...entities].sort((a, b) => b.start - a.start);
    for (const ent of sortedReverse) {
      const symVar = symbolicMap[ent.text] || `<${ent.pii_type}>`;
      protectedText = protectedText.slice(0, ent.start) + symVar + protectedText.slice(ent.end);
    }

    const detectedTypes = new Set(entities.map((e) => e.pii_type));
    const hasName = detectedTypes.has('NAME_STUDENT');
    const hasContact = detectedTypes.has('EMAIL') || detectedTypes.has('PHONE_NUM');
    const hasAddress = detectedTypes.has('STREET_ADDRESS');

    let logicProof = '';
    if (hasName && (hasContact || hasAddress)) {
      logicProof = 'PROHIBIT_DISCLOSURE: CompositeIdentityDetected(NAME ^ (CONTACT v ADDRESS)) -> StrictRedactionRequired';
    } else {
      logicProof = `ALLOW_SYMBOLIC_SUBSTITUTION: IndependentAttributes(${entities.length}) -> CanonicalDeIdentificationApplied`;
    }

    const latency = performance.now() - start;

    return {
      case_id: caseData.case_id,
      method_name: 'prvl',
      original_text: caseData.context,
      protected_text: protectedText,
      detected_entities: entities,
      masked_entities: entities,
      latency_ms: Math.round(latency * 100) / 100,
      reasoning: `PRvL symbolic transformation applied. Logic Proof: ${logicProof}`,
      metadata: {
        symbolic_map: symbolicMap,
        logic_proof: logicProof,
        strategy: 'symbolic_logic_canonicalization'
      }
    };
  }

  async runAsync(caseData: PrivacyCase): Promise<MethodResult> {
    const entities = await this.detector.detectAsync(caseData.context);
    return this.run(caseData, entities);
  }
}

// -------------------------------------------------------------
// 3. PII-Bench: Query & Task-Aware Selective Masking
// -------------------------------------------------------------
export class PIIBenchMethod {
  private static INTENT_KEYWORDS: Record<string, string[]> = {
    EMAIL: ['email', 'e-mail', 'mail', 'inbox'],
    PHONE_NUM: ['phone', 'telephone', 'mobile', 'cell', 'dial', 'call', 'hotline'],
    NAME_STUDENT: ['who', 'name', 'author', 'creator', 'doctor', 'developer', 'jeweler', 'individual'],
    STREET_ADDRESS: ['where', 'street', 'avenue', 'boulevard', 'studio', 'office', 'residence', 'physical address', 'postal'],
    URL_PERSONAL: ['website', 'url', 'link', 'portfolio', 'homepage'],
    USERNAME: ['username', 'handle', 'login', 'account']
  };

  constructor(private detector: HybridDetector = new HybridDetector()) {}

  private isEntityRelevant(entity: PIIEntity, queryStr: string): boolean {
    const ql = queryStr.toLowerCase();
    const hasEmailPhrase = ql.includes('email address') || ql.includes('e-mail address');

    if (
      entity.pii_type === 'STREET_ADDRESS' &&
      hasEmailPhrase &&
      !['street', 'live', 'where', 'studio', 'physical'].some((k) => ql.includes(k))
    ) {
      return false;
    }

    const keywords = PIIBenchMethod.INTENT_KEYWORDS[entity.pii_type] || [];
    for (const kw of keywords) {
      if (ql.includes(kw)) {
        return true;
      }
    }

    if (entity.text.length > 3 && ql.includes(entity.text.toLowerCase())) {
      return true;
    }

    return false;
  }

  run(caseData: PrivacyCase, precomputedEntities?: PIIEntity[]): MethodResult {
    const start = performance.now();
    const entities = precomputedEntities ?? this.detector.detect(caseData.context);

    const queryText = (caseData.query || '').toLowerCase();
    const purposeText = (caseData.purpose || '').toLowerCase();
    const hasTaskContext = Boolean(queryText.trim() || purposeText.trim());

    const keptEntities: PIIEntity[] = [];
    const maskedEntities: PIIEntity[] = [];

    for (const ent of entities) {
      if (hasTaskContext && this.isEntityRelevant(ent, queryText)) {
        keptEntities.push(ent);
      } else {
        maskedEntities.push(ent);
      }
    }

    let protectedText = caseData.context;
    const sortedReverse = [...maskedEntities].sort((a, b) => b.start - a.start);
    for (const ent of sortedReverse) {
      const replacement = `[REDACTED_${ent.pii_type}]`;
      protectedText = protectedText.slice(0, ent.start) + replacement + protectedText.slice(ent.end);
    }

    const latency = performance.now() - start;
    const reasoning = `PII-Bench task-aware filtering: Retained ${keptEntities.length} task-relevant entities (${keptEntities.map((e) => e.pii_type).join(', ')}); Redacted ${maskedEntities.length} non-relevant entities to minimize leakage.`;

    return {
      case_id: caseData.case_id,
      method_name: 'pii_bench',
      original_text: caseData.context,
      protected_text: protectedText,
      detected_entities: entities,
      masked_entities: maskedEntities,
      kept_entities: keptEntities,
      latency_ms: Math.round(latency * 100) / 100,
      reasoning,
      metadata: {
        kept_types: keptEntities.map((e) => e.pii_type),
        masked_types: maskedEntities.map((e) => e.pii_type),
        has_query_context: hasTaskContext,
        strategy: 'query_aware_selective_retention'
      }
    };
  }

  async runAsync(caseData: PrivacyCase): Promise<MethodResult> {
    const entities = await this.detector.detectAsync(caseData.context);
    return this.run(caseData, entities);
  }
}

// -------------------------------------------------------------
// 4. PrivacyLens: Helen Nissenbaum's Contextual Integrity Audit
// -------------------------------------------------------------
export class PrivacyLensMethod {
  private static TRUSTED_ROLES: Record<string, string[]> = {
    doctor: ['treatment', 'emergency', 'medical', 'diagnosis', 'care'],
    nurse: ['treatment', 'emergency', 'care'],
    teacher: ['education', 'academic', 'emergency', 'grading', 'school'],
    professor: ['academic', 'research', 'education'],
    attorney: ['legal', 'defense', 'representation', 'compliance'],
    lawyer: ['legal', 'compliance'],
    employer: ['payroll', 'work', 'employment', 'benefits']
  };

  private static UNTRUSTED_RECIPIENTS = [
    'stranger', 'unknown', 'public', 'advertiser', 'marketing', 'third_party', 'vendor'
  ];
  private static SUSPICIOUS_PURPOSES = [
    'advertising', 'marketing', 'curiosity', 'commercial', 'monetization', 'tracking', 'unknown'
  ];

  constructor(private detector: HybridDetector = new HybridDetector()) {}

  private evaluateCiNorms(
    recipient: string,
    purpose: string,
    infoTypes: Set<string>
  ): { decision: 'ALLOW' | 'DENY'; reasoning: string } {
    const rec = (recipient || 'unknown').toLowerCase().trim();
    const pur = (purpose || 'unknown').toLowerCase().trim();

    // 1. Untrusted recipient
    if (PrivacyLensMethod.UNTRUSTED_RECIPIENTS.some((u) => rec.includes(u))) {
      const sensitive = ['NAME_STUDENT', 'PHONE_NUM', 'EMAIL', 'STREET_ADDRESS'];
      if (sensitive.some((t) => infoTypes.has(t))) {
        return {
          decision: 'DENY',
          reasoning: `Norm Violation: Recipient '${rec}' has no legitimate entitlement to sensitive attributes (${Array.from(infoTypes).join(', ')}).`
        };
      }
    }

    // 2. Suspicious purpose
    if (PrivacyLensMethod.SUSPICIOUS_PURPOSES.some((p) => pur.includes(p))) {
      if (infoTypes.size > 0) {
        return {
          decision: 'DENY',
          reasoning: `Norm Violation: Transmission principle '${pur}' violates contextual privacy expectations for private personal data.`
        };
      }
    }

    // 3. Trusted domain role matching
    for (const [trustedRec, legitimatePurposes] of Object.entries(PrivacyLensMethod.TRUSTED_ROLES)) {
      if (rec.includes(trustedRec)) {
        if (legitimatePurposes.some((lp) => pur.includes(lp)) || pur === 'emergency') {
          return {
            decision: 'ALLOW',
            reasoning: `Norm Compliant: Recipient '${rec}' is authorized to access attributes for appropriate contextual purpose '${pur}'.`
          };
        } else {
          return {
            decision: 'DENY',
            reasoning: `Norm Violation: Inappropriate transmission principle '${pur}' for professional role '${rec}'.`
          };
        }
      }
    }

    // 4. If no PII present
    if (infoTypes.size === 0) {
      return {
        decision: 'ALLOW',
        reasoning: 'Norm Compliant: No sensitive personal identifiers detected in transmission.'
      };
    }

    // 5. Low-sensitivity public identifiers
    const onlyPublic = Array.from(infoTypes).every((t) => t === 'USERNAME' || t === 'URL_PERSONAL');
    if (onlyPublic) {
      return {
        decision: 'ALLOW',
        reasoning: `Norm Compliant: Low-sensitivity public identifiers (${Array.from(infoTypes).join(', ')}) permissible for general service context.`
      };
    }

    return {
      decision: 'DENY',
      reasoning: `Norm Violation: Transmission of sensitive attributes (${Array.from(infoTypes).join(', ')}) to unverified recipient '${rec}' without explicit valid purpose.`
    };
  }

  run(caseData: PrivacyCase, precomputedEntities?: PIIEntity[]): MethodResult {
    const start = performance.now();
    const entities = precomputedEntities ?? this.detector.detect(caseData.context);
    const infoTypes = new Set(entities.map((e) => e.pii_type));

    const { decision, reasoning } = this.evaluateCiNorms(
      caseData.recipient || 'unknown',
      caseData.purpose || 'unknown',
      infoTypes
    );

    let protectedText = caseData.context;
    const masked: PIIEntity[] = [];
    if (decision === 'DENY') {
      const sortedReverse = [...entities].sort((a, b) => b.start - a.start);
      for (const ent of sortedReverse) {
        const replacement = `[REDACTED_${ent.pii_type}]`;
        protectedText = protectedText.slice(0, ent.start) + replacement + protectedText.slice(ent.end);
        masked.push(ent);
      }
    }

    const latency = performance.now() - start;

    return {
      case_id: caseData.case_id,
      method_name: 'privacylens',
      original_text: caseData.context,
      protected_text: protectedText,
      detected_entities: entities,
      masked_entities: masked,
      privacy_decision: decision,
      reasoning,
      latency_ms: Math.round(latency * 100) / 100,
      metadata: {
        ci_parameters: {
          recipient: caseData.recipient,
          purpose: caseData.purpose,
          info_types: Array.from(infoTypes)
        },
        strategy: 'contextual_integrity_norm_evaluation'
      }
    };
  }

  async runAsync(caseData: PrivacyCase): Promise<MethodResult> {
    const entities = await this.detector.detectAsync(caseData.context);
    return this.run(caseData, entities);
  }
}

// -------------------------------------------------------------
// 5. ConfAIde: Multi-Factor Contextual Privacy Risk Reasoning
// -------------------------------------------------------------
export class ConfAIDEMethod {
  private static DOMAIN_WEIGHTS: Record<string, number> = {
    healthcare: 0.95,
    finance: 0.90,
    legal: 0.85,
    education: 0.60,
    corporate_business: 0.55,
    aviation_transport: 0.45,
    science: 0.40,
    technology: 0.35,
    creative_media: 0.30,
    services: 0.30,
    general_professional: 0.35
  };

  private static TRUSTED_RECIPIENTS = [
    'doctor', 'nurse', 'physician', 'teacher', 'professor', 'attorney', 'lawyer'
  ];
  private static HIGH_RISK_RECIPIENTS = [
    'stranger', 'unknown', 'public', 'advertiser', 'marketing', 'vendor'
  ];

  constructor(private detector: HybridDetector = new HybridDetector()) {}

  private inferDomain(text: string): string {
    const tl = text.toLowerCase();
    if (['patient', 'doctor', 'asthma', 'medical', 'treatment', 'hospital', 'clinic'].some((w) => tl.includes(w))) {
      return 'healthcare';
    }
    if (['bank', 'account', 'credit', 'financial', 'ssn', 'tax', 'loan'].some((w) => tl.includes(w))) {
      return 'finance';
    }
    if (['student', 'teacher', 'school', 'grade', 'class', 'university'].some((w) => tl.includes(w))) {
      return 'education';
    }
    if (['legal', 'court', 'attorney', 'counsel', 'lawyer', 'lawsuit'].some((w) => tl.includes(w))) {
      return 'legal';
    }
    if (['developer', 'code', 'software', 'portal', 'platform', 'backend'].some((w) => tl.includes(w))) {
      return 'technology';
    }
    if (['jeweler', 'restored', 'craft', 'studio', 'repair', 'necklace'].some((w) => tl.includes(w))) {
      return 'services';
    }
    if (['flight', 'aviation', 'radar', 'airport', 'planes'].some((w) => tl.includes(w))) {
      return 'aviation_transport';
    }
    return 'general_professional';
  }

  private calculateRisk(
    domain: string,
    entityTypes: Set<string>,
    recipient: string,
    purpose: string
  ): { risk_score: number; risk_tier: string; factors: Record<string, any> } {
    const s_d = ConfAIDEMethod.DOMAIN_WEIGHTS[domain] || 0.40;

    const hasName = entityTypes.has('NAME_STUDENT');
    const hasDirectContact = entityTypes.has('PHONE_NUM') || entityTypes.has('EMAIL') || entityTypes.has('STREET_ADDRESS');
    const hasWeak = entityTypes.has('USERNAME') || entityTypes.has('URL_PERSONAL');
    const hasOther = entityTypes.size > 0 && !hasName && !hasDirectContact && !hasWeak;

    let s_e = 0.05;
    if (hasName && hasDirectContact) {
      s_e = 0.90;
    } else if (hasDirectContact) {
      s_e = 0.70;
    } else if (hasName || hasOther) {
      s_e = 0.45;
    } else if (hasWeak) {
      s_e = 0.20;
    }

    const rec = (recipient || 'unknown').toLowerCase();
    let t_r = 0.60;
    if (ConfAIDEMethod.TRUSTED_RECIPIENTS.some((tr) => rec.includes(tr))) {
      t_r = 0.20;
    } else if (ConfAIDEMethod.HIGH_RISK_RECIPIENTS.some((hr) => rec.includes(hr))) {
      t_r = 0.90;
    }

    const pur = (purpose || 'unknown').toLowerCase();
    let p_n = 0.65;
    if (pur.includes('emergency') || pur.includes('vital')) {
      p_n = 0.10;
    } else if (['treatment', 'education', 'service', 'academic', 'repair', 'work'].some((legit) => pur.includes(legit))) {
      p_n = 0.30;
    } else if (['advertising', 'marketing', 'curiosity', 'unknown'].some((susp) => pur.includes(susp))) {
      p_n = 0.85;
    }

    let riskScore = 0.40 * s_e + 0.30 * s_d + 0.20 * t_r + 0.10 * p_n;
    riskScore = Math.max(0.0, Math.min(1.0, Math.round(riskScore * 1000) / 1000));

    let riskTier = 'NONE';
    if (riskScore >= 0.80) riskTier = 'CRITICAL';
    else if (riskScore >= 0.60) riskTier = 'HIGH';
    else if (riskScore >= 0.35) riskTier = 'MEDIUM';
    else if (riskScore >= 0.15) riskTier = 'LOW';

    return {
      risk_score: riskScore,
      risk_tier: riskTier,
      factors: {
        domain,
        domain_sensitivity: s_d,
        entity_exposure: s_e,
        recipient_trust: t_r,
        purpose_necessity: p_n,
        risk_score: riskScore,
        risk_tier: riskTier
      }
    };
  }

  run(caseData: PrivacyCase, precomputedEntities?: PIIEntity[]): MethodResult {
    const start = performance.now();
    const entities = precomputedEntities ?? this.detector.detect(caseData.context);
    const entityTypes = new Set(entities.map((e) => e.pii_type));

    const domain = this.inferDomain(caseData.context);
    const { risk_score, risk_tier, factors } = this.calculateRisk(
      domain,
      entityTypes,
      caseData.recipient || 'unknown',
      caseData.purpose || 'unknown'
    );

    const decision = risk_score >= 0.50 || risk_tier === 'HIGH' || risk_tier === 'CRITICAL' ? 'DENY' : 'ALLOW';

    let protectedText = caseData.context;
    const masked: PIIEntity[] = [];
    if (decision === 'DENY') {
      const sortedReverse = [...entities].sort((a, b) => b.start - a.start);
      for (const ent of sortedReverse) {
        const replacement = `[${ent.pii_type}]`;
        protectedText = protectedText.slice(0, ent.start) + replacement + protectedText.slice(ent.end);
        masked.push(ent);
      }
    }

    const latency = performance.now() - start;
    const reasoning = `ConfAIde Risk Assessment: Score=${risk_score.toFixed(2)} (${risk_tier} Risk). Domain '${domain}', Recipient '${caseData.recipient || 'unspecified'}', Purpose '${caseData.purpose || 'unspecified'}'. Privacy Decision: ${decision}.`;

    return {
      case_id: caseData.case_id,
      method_name: 'confaide',
      original_text: caseData.context,
      protected_text: protectedText,
      detected_entities: entities,
      masked_entities: masked,
      privacy_decision: decision,
      reasoning,
      latency_ms: Math.round(latency * 100) / 100,
      metadata: {
        risk_score,
        risk_tier,
        factors,
        strategy: 'multi_factor_risk_reasoning'
      }
    };
  }

  async runAsync(caseData: PrivacyCase): Promise<MethodResult> {
    const entities = await this.detector.detectAsync(caseData.context);
    return this.run(caseData, entities);
  }
}

export function runAllMethods(
  caseData: PrivacyCase,
  detector: HybridDetector,
  precomputedEntities?: PIIEntity[]
): Record<string, MethodResult> {
  const m1 = new PIIvotMethod(detector).run(caseData, precomputedEntities);
  const m2 = new PRvLMethod(detector).run(caseData, precomputedEntities);
  const m3 = new PIIBenchMethod(detector).run(caseData, precomputedEntities);
  const m4 = new PrivacyLensMethod(detector).run(caseData, precomputedEntities);
  const m5 = new ConfAIDEMethod(detector).run(caseData, precomputedEntities);

  return {
    piivot: m1,
    prvl: m2,
    pii_bench: m3,
    privacylens: m4,
    confaide: m5,
  };
}

export async function runAllMethodsAsync(
  caseData: PrivacyCase,
  detector: HybridDetector
): Promise<Record<string, MethodResult>> {
  const entities = await detector.detectAsync(caseData.context);
  return runAllMethods(caseData, detector, entities);
}
