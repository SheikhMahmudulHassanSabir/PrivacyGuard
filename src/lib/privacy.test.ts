import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateEntitySpan,
  RegexDetector,
  NERDetector,
  ContextualLLMHeuristicDetector,
  HybridDetector,
} from './detectors';
import {
  PIIvotMethod,
  PRvLMethod,
  PIIBenchMethod,
  PrivacyLensMethod,
  ConfAIDEMethod,
  prepareSafeReplacementSpans,
} from './methods';
import {
  calculateLeakageDetailed,
  calculateUtilityDetailed,
  evaluateDetectorOnCases,
  evaluateMethodAcrossCases,
  computeMedian,
  sampleBenchmarkCases,
  classifyCaseRiskTier,
  executeBenchmarkRun,
} from './evaluator';
import {
  escapeCsvCell,
  buildCsvString,
  safeLoadStorage,
  safeSaveStorage,
} from './exportUtils';
import { PrivacyCase } from '../types/privacy';

test('validateEntitySpan enforces text.slice(start, end) === entity.text and bounds', () => {
  const text = 'Contact Alice Smith at alice@example.com.';
  const valid = validateEntitySpan(text, {
    text: 'Alice Smith',
    pii_type: 'NAME_STUDENT',
    start: 8,
    end: 19,
    confidence: 1.25,
  });
  assert.ok(valid);
  assert.equal(valid.text, 'Alice Smith');
  assert.equal(text.slice(valid.start, valid.end), valid.text);
  assert.equal(valid.confidence, 1.0);

  // Mismatched slice
  assert.equal(
    validateEntitySpan(text, {
      text: 'Bob Jones',
      pii_type: 'NAME_STUDENT',
      start: 8,
      end: 19,
    }),
    null
  );

  // Out of bounds or inverted offsets
  assert.equal(
    validateEntitySpan(text, { text: 'Alice', pii_type: 'NAME_STUDENT', start: -1, end: 5 }),
    null
  );
  assert.equal(
    validateEntitySpan(text, { text: 'Alice', pii_type: 'NAME_STUDENT', start: 10, end: 8 }),
    null
  );
  assert.equal(
    validateEntitySpan(text, { text: 'Alice', pii_type: 'NAME_STUDENT', start: 0, end: 999 }),
    null
  );
});

test('RegexDetector detects structured PII accurately without false email-domain URL overlaps', () => {
  const detector = new RegexDetector();
  const sample =
    'My name is Rahul Sharma. Email rahul.sharma@gmail.com, call (95) 94215-7906, handle @rahul_dev, username: rsharma99, site https://rahul.dev/portfolio, at 97 Lincoln Street. As A Result, everything works.';

  const entities = detector.detect(sample);

  for (const ent of entities) {
    assert.equal(
      sample.slice(ent.start, ent.end),
      ent.text,
      `Offset mismatch for ${ent.text} [${ent.start}:${ent.end}]`
    );
  }

  const byType = new Map(entities.map((e) => [e.pii_type, e.text]));
  assert.equal(byType.get('EMAIL'), 'rahul.sharma@gmail.com');
  assert.equal(byType.get('PHONE_NUM'), '(95) 94215-7906');
  assert.equal(byType.get('URL_PERSONAL'), 'https://rahul.dev/portfolio');
  assert.equal(byType.get('STREET_ADDRESS'), '97 Lincoln Street');
  assert.equal(byType.get('NAME_STUDENT'), 'Rahul Sharma');

  // Ensure "gmail.com" inside "rahul.sharma@gmail.com" was NOT falsely detected as URL_PERSONAL
  const urls = entities.filter((e) => e.pii_type === 'URL_PERSONAL');
  assert.equal(urls.length, 1);
  assert.equal(urls[0].text, 'https://rahul.dev/portfolio');

  // Ensure "As A Result" was NOT falsely detected as NAME_STUDENT
  const names = entities.filter((e) => e.pii_type === 'NAME_STUDENT');
  assert.equal(names.some((n) => n.text.includes('Result')), false);

  // Ensure both @rahul_dev and rsharma99 (without "username: " prefix) were detected
  const usernames = entities.filter((e) => e.pii_type === 'USERNAME').map((e) => e.text);
  assert.ok(usernames.includes('@rahul_dev'));
  assert.ok(usernames.includes('rsharma99'));
});

test('NERDetector strips leading role/honorific prefixes and avoids sentence-start false positives', () => {
  const ner = new NERDetector();

  const text1 =
    'Patient Aaliyah Popova has a history of illness. Client Marcus Vance and Student Elena Rostova attended. Clinical Notes Summary is ready.';
  const detected = ner.detect(text1);

  for (const ent of detected) {
    assert.equal(text1.slice(ent.start, ent.end), ent.text);
  }

  const nameTexts = detected.filter((e) => e.pii_type === 'NAME_STUDENT').map((e) => e.text);
  assert.deepEqual(nameTexts, ['Aaliyah Popova', 'Marcus Vance', 'Elena Rostova']);
  assert.equal(nameTexts.some((n) => n.startsWith('Patient ')), false);
  assert.equal(nameTexts.some((n) => n.includes('Clinical Notes')), false);
});

test('NERDetector & HybridDetector handle Unicode names and propagate repeated mentions', () => {
  const detector = new HybridDetector({ enableRegex: true, enableNer: true, enableLlm: true });
  const text =
    'Patient José García arrived at 97 Lincoln Street. Later, José reported that García was feeling better.';
  const entities = detector.detect(text);

  for (const ent of entities) {
    assert.equal(text.slice(ent.start, ent.end), ent.text);
  }

  const nameEntities = entities.filter((e) => e.pii_type === 'NAME_STUDENT');
  assert.equal(nameEntities.length, 3);
  assert.equal(nameEntities[0].text, 'José García');
  assert.equal(nameEntities[1].text, 'José');
  assert.equal(nameEntities[2].text, 'García');
});

test('ContextualLLMHeuristicDetector extracts single-token possessive and action-object names', () => {
  const llmDet = new ContextualLLMHeuristicDetector();
  const text = "Please contact Elena regarding Rahul's email and medical record.";
  const entities = llmDet.detect(text);

  for (const ent of entities) {
    assert.equal(text.slice(ent.start, ent.end), ent.text);
  }
  const names = entities.map((e) => e.text);
  assert.ok(names.includes('Elena'));
  assert.ok(names.includes('Rahul'));
});

test('All five privacy protection methods preserve immutability and prevent residual leakage', () => {
  const detector = new HybridDetector({ enableRegex: true, enableNer: true, enableLlm: true });
  // Use "Alex Morgan" specifically to verify PIIvot surrogate collision avoidance!
  const originalContext =
    'Patient Alex Morgan can be reached at alex.morgan@clinic.org or (415) 890-2314. Alex lives at 104 Maple Street.';
  const inputCase: PrivacyCase = {
    case_id: 'case_test_1',
    context: originalContext,
    query: "What is Alex's email address?",
    recipient: 'marketing',
    purpose: 'advertising',
    entities: detector.detect(originalContext),
  };

  const piivotRes = new PIIvotMethod(detector).run(inputCase);
  const prvlRes = new PRvLMethod(detector).run(inputCase);
  const piiBenchRes = new PIIBenchMethod(detector).run(inputCase);
  const privacyLensRes = new PrivacyLensMethod(detector).run(inputCase);
  const confaideRes = new ConfAIDEMethod(detector).run(inputCase);

  // Original input must remain untouched
  assert.equal(inputCase.context, originalContext);

  // PIIvot must replace all entities and never collide with "Alex Morgan" or "104 Maple Street"
  const piivotLeak = calculateLeakageDetailed(inputCase.entities, piivotRes.protected_text || '');
  assert.equal(piivotLeak.leakage_rate, 0, `PIIvot leaked: ${JSON.stringify(piivotLeak.leaked_entities)}`);

  // PRvL must replace all entities with canonical <TYPE_N> symbols
  const prvlLeak = calculateLeakageDetailed(inputCase.entities, prvlRes.protected_text || '');
  assert.equal(prvlLeak.leakage_rate, 0);
  assert.ok(prvlRes.protected_text?.includes('<PERSON_1>'));
  assert.ok(prvlRes.protected_text?.includes('<EMAIL_1>'));

  // PII-Bench retains EMAIL and NAME_STUDENT (mentioned in query "What is Alex's email address?")
  // while redacting PHONE_NUM and STREET_ADDRESS
  assert.ok(piiBenchRes.protected_text?.includes('alex.morgan@clinic.org'));
  assert.ok(piiBenchRes.protected_text?.includes('[REDACTED_PHONE_NUM]'));
  assert.ok(piiBenchRes.protected_text?.includes('[REDACTED_STREET_ADDRESS]'));

  // PrivacyLens & ConfAIde must DENY marketing/advertising and redact all entities
  assert.equal(privacyLensRes.privacy_decision, 'DENY');
  assert.equal(
    calculateLeakageDetailed(inputCase.entities, privacyLensRes.protected_text || '').leakage_rate,
    0
  );
  assert.equal(confaideRes.privacy_decision, 'DENY');
  assert.equal(
    calculateLeakageDetailed(inputCase.entities, confaideRes.protected_text || '').leakage_rate,
    0
  );
});

test('PII-Bench word-boundary matching avoids substring false positives like "recall" or "whole"', () => {
  const detector = new HybridDetector({ enableRegex: true, enableNer: true });
  const context = 'Patient Elena Rostova can be called at (212) 645-9920.';
  const caseData: PrivacyCase = {
    case_id: 'case_piibench_boundary',
    context,
    // "recall" contains "call" as substring; "whole" contains "who" as substring
    query: 'Can you recall the whole medical diagnosis summary?',
    entities: detector.detect(context),
  };

  const res = new PIIBenchMethod(detector).run(caseData);
  // Neither NAME_STUDENT nor PHONE_NUM should be kept
  assert.equal(res.kept_entities?.length, 0);
  assert.equal(res.masked_entities.length, 2);
  assert.ok(!res.protected_text?.includes('Elena Rostova'));
  assert.ok(!res.protected_text?.includes('(212) 645-9920'));
});

test('calculateLeakageDetailed accurately detects leaked @usernames and +international phones', () => {
  const entities = [
    {
      entity_id: '1',
      text: '@rahul_sharma',
      pii_type: 'USERNAME',
      start: 10,
      end: 23,
      label: 'USERNAME',
    },
    {
      entity_id: '2',
      text: '+1-800-555-0199',
      pii_type: 'PHONE_NUM',
      start: 28,
      end: 43,
      label: 'PHONE_NUM',
    },
  ];

  const leakedOutput = 'Reach out @rahul_sharma or +1-800-555-0199 immediately.';
  const leakReport = calculateLeakageDetailed(entities, leakedOutput);
  assert.equal(leakReport.leakage_rate, 1.0);
  assert.equal(leakReport.leaked_entities.length, 2);

  const cleanOutput = 'Reach out [REDACTED_USERNAME] or [REDACTED_PHONE_NUM] immediately.';
  const cleanReport = calculateLeakageDetailed(entities, cleanOutput);
  assert.equal(cleanReport.leakage_rate, 0.0);
  assert.equal(cleanReport.leaked_entities.length, 0);
});

test('Evaluation metrics handle zero denominators, empty inputs, and even-length medians accurately', () => {
  assert.equal(computeMedian([]), 0);
  assert.equal(computeMedian([10]), 10);
  assert.equal(computeMedian([1, 3, 5, 7]), 4); // (3 + 5) / 2 = 4
  assert.equal(computeMedian([1, 2, 9]), 2);

  const emptyLeak = calculateLeakageDetailed([], 'some text');
  assert.equal(emptyLeak.leakage_rate, 0);

  const emptyUtil = calculateUtilityDetailed('', '');
  assert.equal(emptyUtil.utility_score, 1.0);

  const detector = new HybridDetector();
  const emptyBench = evaluateDetectorOnCases([], detector);
  assert.equal(emptyBench.overall.precision, 0);
  assert.equal(emptyBench.overall.recall, 0);
  assert.equal(emptyBench.overall.f1, 0);

  const emptyMetrics = evaluateMethodAcrossCases([], [], 'piivot', 0);
  assert.equal(emptyMetrics.total_cases, 0);
  assert.equal(emptyMetrics.leakage_rate, 0);
});

test('sampleBenchmarkCases respects exact sample size, seed determinism, and stratification', () => {
  const basePool: PrivacyCase[] = [
    {
      case_id: 'c1',
      context: 'Patient Aaliyah Popova at aaliyah@aol.edu.',
      entities: [
        { entity_id: 'e1', text: 'Aaliyah Popova', pii_type: 'NAME_STUDENT', start: 8, end: 22, label: 'NAME_STUDENT' },
        { entity_id: 'e2', text: 'aaliyah@aol.edu', pii_type: 'EMAIL', start: 26, end: 41, label: 'EMAIL' },
      ],
    },
    {
      case_id: 'c2',
      context: 'Anonymous telemetry log #42.',
      entities: [],
    },
  ];

  // Test expansion to 25, 100, and 250 cases
  const s25a = sampleBenchmarkCases(basePool, 25, 42, true);
  const s25b = sampleBenchmarkCases(basePool, 25, 42, true);
  const s25DiffSeed = sampleBenchmarkCases(basePool, 25, 99, true);

  assert.equal(s25a.length, 25);
  // Seed determinism
  assert.deepEqual(
    s25a.map((c) => c.case_id),
    s25b.map((c) => c.case_id)
  );
  // Different seed produces different ordering/selection
  assert.notDeepEqual(
    s25a.map((c) => c.case_id),
    s25DiffSeed.map((c) => c.case_id)
  );

  // Zero duplicate case_ids
  const uniqueIds = new Set(s25a.map((c) => c.case_id));
  assert.equal(uniqueIds.size, 25);

  // Verify all expanded cases have valid entity offsets and populated risk_level
  const s100 = sampleBenchmarkCases(basePool, 100, 7, true);
  assert.equal(s100.length, 100);
  for (const c of s100) {
    assert.ok(c.risk_level);
    for (const e of c.entities) {
      assert.equal(c.context.slice(e.start, e.end), e.text);
    }
  }

  // Verify executeBenchmarkRun records stratified flag, clean run_id, and risk distribution
  const runResult = executeBenchmarkRun(s25a, ['piivot', 'privacylens'], 42, undefined, false);
  assert.match(runResult.run_metadata.run_id, /^pg_exp_\d{14}_s42$/);
  assert.equal(runResult.run_metadata.evaluated_sample_size, 25);
  assert.equal(runResult.run_metadata.stratified, false);
  const totalDist = Object.values(runResult.run_metadata.stratified_distribution).reduce(
    (a, b) => a + b,
    0
  );
  assert.equal(totalDist, 25);
});

test('CSV and storage utilities prevent formula injection and handle special characters', () => {
  assert.equal(escapeCsvCell('=1+1'), `"'=1+1"`);
  assert.equal(escapeCsvCell('+SUM(A1:A2)'), `"'+SUM(A1:A2)"`);
  assert.equal(escapeCsvCell('@user_handle'), `"'@user_handle"`);
  assert.equal(escapeCsvCell('Text with "quotes" and #hash?query'), `"Text with ""quotes"" and #hash?query"`);

  const csv = buildCsvString(['Method', 'Output'], [['PIIVOT', 'Hello "World" #1']]);
  assert.equal(csv, `"Method","Output"\n"PIIVOT","Hello ""World"" #1"`);

  // In Node environment without window.localStorage, safeLoadStorage / safeSaveStorage do not throw
  assert.deepEqual(safeLoadStorage('nonexistent', { ok: true }), { ok: true });
  assert.equal(safeSaveStorage('key', { ok: true }), false);
});

test('Unified evaluation produces finite non-null standardized metrics for all five methods', () => {
  const basePool: PrivacyCase[] = [
    {
      case_id: 'u1',
      context:
        'Patient Aaliyah Popova was admitted. Contact her at aaliyah.popova@aol.edu or (415) 890-2314 at 97 Lincoln Street.',
      query: "What is Aaliyah's email address?",
      recipient: 'doctor',
      purpose: 'treatment',
      expected_decision: 'ALLOW',
      entities: [
        { entity_id: 'e1', text: 'Aaliyah Popova', pii_type: 'NAME_STUDENT', start: 8, end: 22, label: 'NAME_STUDENT' },
        { entity_id: 'e2', text: 'aaliyah.popova@aol.edu', pii_type: 'EMAIL', start: 52, end: 74, label: 'EMAIL' },
        { entity_id: 'e3', text: '(415) 890-2314', pii_type: 'PHONE_NUM', start: 78, end: 92, label: 'PHONE_NUM' },
        { entity_id: 'e4', text: '97 Lincoln Street', pii_type: 'STREET_ADDRESS', start: 96, end: 113, label: 'STREET_ADDRESS' },
      ],
    },
    {
      case_id: 'u2',
      context:
        'Client Marcus Vance applied for a loan. Reach him at marcus.vance@finbank.org or (212) 645-9920.',
      query: 'Extract full contact details for advertising.',
      recipient: 'marketing',
      purpose: 'advertising',
      expected_decision: 'DENY',
      entities: [
        { entity_id: 'e5', text: 'Marcus Vance', pii_type: 'NAME_STUDENT', start: 7, end: 19, label: 'NAME_STUDENT' },
        { entity_id: 'e6', text: 'marcus.vance@finbank.org', pii_type: 'EMAIL', start: 53, end: 77, label: 'EMAIL' },
        { entity_id: 'e7', text: '(212) 645-9920', pii_type: 'PHONE_NUM', start: 81, end: 95, label: 'PHONE_NUM' },
      ],
    },
  ];

  const sampled = sampleBenchmarkCases(basePool, 20, 42, true);
  const allMethods = ['piivot', 'prvl', 'pii_bench', 'privacylens', 'confaide'];
  const run = executeBenchmarkRun(sampled, allMethods, 42, {
    enable_regex: true,
    enable_ner: true,
    enable_llm: false,
  });

  assert.equal(run.method_metrics.length, 5);
  for (const m of run.method_metrics) {
    assert.ok(allMethods.includes(m.method_name));
    assert.equal(typeof m.detector_f1, 'number');
    assert.ok(Number.isFinite(m.detector_f1) && m.detector_f1 >= 0 && m.detector_f1 <= 1);
    assert.equal(typeof m.leakage_rate, 'number');
    assert.ok(Number.isFinite(m.leakage_rate) && m.leakage_rate >= 0 && m.leakage_rate <= 1);
    assert.equal(typeof m.cases_with_leakage_pct, 'number');
    assert.ok(Number.isFinite(m.cases_with_leakage_pct) && m.cases_with_leakage_pct >= 0 && m.cases_with_leakage_pct <= 100);
    assert.equal(typeof m.utility_score, 'number');
    assert.ok(Number.isFinite(m.utility_score) && m.utility_score >= 0 && m.utility_score <= 1);
    assert.equal(typeof m.context_accuracy, 'number');
    assert.ok(Number.isFinite(m.context_accuracy) && m.context_accuracy >= 0 && m.context_accuracy <= 1);
    assert.equal(typeof m.median_latency_ms, 'number');
    assert.ok(Number.isFinite(m.median_latency_ms) && m.median_latency_ms >= 0);
  }

  for (const [, matrixEntry] of Object.entries(run.applicability_matrix)) {
    for (const val of Object.values(matrixEntry)) {
      assert.equal(String(val).includes('N/A'), false);
    }
  }
});

