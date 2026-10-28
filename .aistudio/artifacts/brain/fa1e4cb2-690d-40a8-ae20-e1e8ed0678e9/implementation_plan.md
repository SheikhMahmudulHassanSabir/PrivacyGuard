# Unified Cross-Method Benchmark Evaluation Plan

## 1. Objective & Diagnosis
Currently, the benchmark evaluation pipeline (`src/lib/evaluator.ts`) and baseline dataset (`src/data/latest_run.json`) split the five privacy methods into two mutually exclusive evaluation branches:
- **Transformation Methods (`piivot`, `prvl`, `pii_bench`)**: Compute `leakage_rate`, `cases_with_leakage_pct`, and `utility_score`, but set `context_accuracy`, `unsafe_allow_rate`, and `unnecessary_deny_rate` to `null` (rendered as `N/A (Transform)` in the UI).
- **Contextual Decision Methods (`privacylens`, `confaide`)**: Compute `context_accuracy`, `unsafe_allow_rate`, and `unnecessary_deny_rate`, but set `leakage_rate`, `cases_with_leakage_pct`, and `utility_score` to `null` (rendered as `N/A (Decision)` in the UI).

Even though `PrivacyLensMethod` and `ConfAIDEMethod` already produce a `protected_text` on every case (retaining original text on `ALLOW` and redacting detected PII spans on `DENY`), those outputs were ignored when computing aggregate leakage and utility metrics. Similarly, transformation methods did not derive an effective contextual compliance outcome against ground-truth `ALLOW`/`DENY` case labels.

---

## 2. Unified Evaluation Methodology

### A. Universal Output Contract Across All 5 Methods (`src/lib/methods.ts`)
Every method execution (`MethodResult`) will populate both a `protected_text` and a derived or explicit `privacy_decision`:
1. **PIIvot (`piivot`)**:
   - Replaces detected PII with realistic synthetic surrogates.
   - Derives contextual compliance decision: When a case requires `DENY` (untrusted flow / high-risk PII), compliance is satisfied if all sensitive ground-truth PII (`NAME_STUDENT`, `EMAIL`, `PHONE_NUM`, `STREET_ADDRESS`) is pseudonymized/removed (`leakage === 0`); when a case is `ALLOW`, compliance is satisfied if utility/context is preserved (`utility_score >= 0.5`).
2. **PRvL (`prvl`)**:
   - Replaces detected PII with canonical symbolic variables (`<PERSON_1>`, `<EMAIL_1>`, etc.) and generates a formal logic proof (`PROHIBIT_DISCLOSURE` vs. `ALLOW_SYMBOLIC_SUBSTITUTION`).
   - Evaluates contextual compliance using the same unified protection verification rule.
3. **PII-Bench (`pii_bench`)**:
   - Retains query-relevant PII and masks non-relevant PII (`[REDACTED_*]`).
   - Evaluates contextual compliance based on whether unauthorized sensitive entities were masked on `DENY` cases while preserving task-relevant utility on `ALLOW` cases.
4. **PrivacyLens (`privacylens`) & ConfAIde (`confaide`)**:
   - Explicitly evaluate contextual integrity norms / multi-factor risk to output `ALLOW` or `DENY`.
   - On `DENY`, redact detected PII spans in `protected_text`; on `ALLOW`, retain the original text in `protected_text`.
   - Evaluate `leakage_rate`, `cases_with_leakage_pct`, and `utility_score` directly on their `protected_text` across all evaluated cases (where unauthorized residual PII on `DENY` cases or unredacted sensitive PII counts toward leakage, and `utility_score` measures token retention and Jaccard similarity of `protected_text` vs. `context`).

### B. Standardized Metric Definitions & Scales (`src/lib/evaluator.ts` & `src/types/privacy.ts`)
All six core metrics will be computed as non-null numbers for all five methods:
- **Detector F1 (`detector_f1`)**: Normalized decimal (`0.000` to `1.000`), representing the F1 score of the active detector pipeline on the evaluated sample.
- **Leakage Rate (`leakage_rate`)**: Percentage (`0.0%` to `100.0%` in UI, stored as `0.000`–`1.000` ratio) of ground-truth PII entities that remain exposed in `protected_text` (for contextual audit methods, evaluated across restricted/denied disclosures and overall output).
- **Cases w/ Leakage (`cases_with_leakage_pct`)**: Percentage (`0.0%` to `100.0%`) of evaluated cases where at least one ground-truth PII entity leaked into `protected_text`.
- **Utility Score (`utility_score`)**: Normalized decimal (`0.000` to `1.000`), computed as `0.6 * non_pii_retention + 0.4 * token_jaccard` between `context` and `protected_text`.
- **Context Accuracy (`context_accuracy`)**: Percentage (`0.0%` to `100.0%` in UI, stored as `0.000`–`1.000` ratio) of cases where the method's protection/decision outcome satisfies the ground-truth contextual norm (`expected_decision`).
- **Median Latency (`median_latency_ms`)**: Numeric latency in milliseconds (`ms`), formatted to 2 decimal places.

---

## 3. Planned File Changes

1. **`src/types/privacy.ts`**:
   - Update `MethodMetrics` interface so `leakage_rate`, `cases_with_leakage_pct`, `utility_score`, `context_accuracy`, `unsafe_allow_rate`, and `unnecessary_deny_rate` are strictly `number` across all methods.
2. **`src/lib/methods.ts`**:
   - Enhance `PIIvotMethod`, `PRvLMethod`, and `PIIBenchMethod` to also include a derived `privacy_decision` (`ALLOW` or `DENY` based on whether sensitive composite/contact PII triggered strict protection vs. safe flow) so every method has a complete record in per-case inspection and comparison tables.
3. **`src/lib/evaluator.ts`**:
   - Unify `evaluateMethodAcrossCases()` so it computes `leakage_rate`, `cases_with_leakage_pct`, `total_leaked_entities`, `utility_score`, `context_accuracy`, `unsafe_allow_rate`, and `unnecessary_deny_rate` for **all 5 methods** without branching into `null` fields.
   - Update `applicability_matrix` and `metric_definitions` to document how all six metrics apply uniformly across both transformation and contextual decision paradigms.
4. **`src/data/latest_run.json`**:
   - Update the pre-populated baseline benchmark run (`method_metrics` and `applicability_matrix`) so that on initial page load, the Summary Table and Trade-Off Scatter Plot immediately display complete, non-null numeric metrics for all 5 methods.
5. **`src/views/OverviewView.tsx` & `src/views/BenchmarkResultsView.tsx`**:
   - Remove all `N/A (Decision)` and `N/A (Transform)` fallback badges from the Cross-Method Performance Summary Table, Trade-Off Scatter Plot, and Method Cards.
   - Plot all 5 methods on the Privacy-Utility Trade-Off Scatter Plot (`Leakage Rate` vs. `Utility Score`) and display Context Accuracy for all 5 methods.
   - Ensure consistent formatting (`0.000` for Detector F1 and Utility Score; `0.0%` for Leakage Rate, Cases w/ Leakage, and Context Accuracy; `0.00 ms` for Median Latency) and update CSV export formatting so exported tables contain zero `N/A` values.
