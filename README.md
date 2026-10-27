# PrivacyGuard: A Context-Aware PII Protection and Comparative Evaluation Framework

## Abstract

**PrivacyGuard** is a unified, reproducible research benchmark and evaluation framework for analyzing Personally Identifiable Information (PII) protection paradigms across unstructured text. Existing privacy tools typically conflate entity detection accuracy with downstream redaction quality, or apply static, context-blind masking that destroys task utility. PrivacyGuard addresses this methodological gap by decoupling the **Multi-Stage Hybrid Detection Layer** from five distinct **Privacy Protection Paradigms**—spanning synthetic pseudonymization (**PIIvot**), first-order symbolic logic canonicalization (**PRvL**), query-aware selective retention (**PII-Bench**), Helen Nissenbaum's Contextual Integrity normative auditing (**PrivacyLens**), and multi-factor quantitative risk scoring (**ConfAIde**). Evaluated over a verified corpus of **4,434 cases** and **22,226 ground-truth entity spans** across **11 operational domains**, PrivacyGuard enforces a strict **Metrics Applicability Matrix** to measure detection precision/recall, boundary-aware residual leakage, structural/semantic utility preservation, and normative decision accuracy.

---

## 1. Research Motivation and Problem Statement

Modern language pipelines process unstructured documents containing heterogeneous personal identifiers. In evaluating privacy-preserving mechanisms, three foundational challenges arise:

1. **Conflation of Detection and Transformation**: When a redaction pipeline leaks an entity, standard benchmarks rarely distinguish whether the failure occurred in the *entity detector* (a False Negative span miss) or in the *privacy transformation policy* (deliberate task-driven retention).
2. **The Privacy–Utility Trade-Off**: Unconditional masking (`[REDACTED]`) eliminates disclosure risk for detected spans but breaks grammatical structure, coreference chains, and downstream task utility (e.g., answering a legitimate inquiry about a user's contact address).
3. **Transformation vs. Normative Auditing**: Not all privacy mechanisms modify text. Frameworks grounded in **Contextual Integrity (CI)** evaluate whether an information flow is normatively appropriate (`ALLOW` vs. `DENY`) given the sender, recipient, attribute type, and transmission purpose. Penalizing an auditing engine for not redacting text in an authorized flow introduces severe evaluation bias.

PrivacyGuard resolves these challenges through a modular architecture that isolates detection benchmarking from paradigm-specific evaluation.

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Unified Evaluation Corpus                             │
│      4,434 Annotated Cases · 22,226 Ground-Truth Spans · 11 Domains          │
│      SHA-256 Fingerprint: csv_e28fb80c1095_json_f4229455a3e3                 │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Stage 1: Multi-Stage Hybrid Detector                      │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────┐  │
│  │ Heuristic Regex Layer  │  │ Contextual NER Tagger  │  │ Optional LLM   │  │
│  │ EMAIL, PHONE_NUM,      │  │ Honorific/Role Anchors │  │ Zero-Shot      │  │
│  │ URL_PERSONAL, USERNAME │  │ NAME_STUDENT, ADDRESS  │  │ Reasoning      │  │
│  └───────────┬────────────┘  └───────────┬────────────┘  └───────┬────────┘  │
│              └───────────────────────────┼───────────────────────┘           │
│                                          ▼                                   │
│           Exact-Span Consensus Boost & Overlap Conflict Resolution           │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                 Stage 2: Five Privacy Protection Paradigms                   │
│                                                                              │
│  [Text Transformation Paradigms]         [Normative & Risk Audit Paradigms]  │
│  01. PIIvot (Synthetic Surrogates)       04. PrivacyLens (5-Param CI Audit)  │
│  02. PRvL (Symbolic Logic Tokens)        05. ConfAIde (Multi-Factor Risk)    │
│  03. PII-Bench (Query-Aware Masking)                                         │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│               Stage 3: Fair Evaluation & Applicability Engine                │
│  • Entity-Level Detection: Precision, Recall, F1 (Overall & Per-Category)    │
│  • Transformation Metrics: Boundary-Safe Leakage Rate & Composite Utility    │
│  • Normative Metrics: CI Decision Accuracy, Unsafe ALLOW, Unnecessary DENY   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Unified Benchmark Dataset

The PrivacyGuard benchmark dataset is a single unified corpus constructed with zero dropped records and 100% character-slice alignment (`text[start:end] == entity.text`).

### 3.1 Corpus Summary Statistics

| Metric | Value | Notes |
| :--- | :--- | :--- |
| **Total Annotated Cases** | `4,434` | 100% preservation rate across source records |
| **Cases Containing PII** | `4,425` (`99.80%`) | 9 clean baseline cases (`0.20%`) without PII |
| **Total Ground-Truth Entities** | `22,226` | Mean of `5.02` entities per PII-containing case |
| **Offset Slice Alignment** | `22,226 / 22,226` (`100%`) | Zero character-index drift |
| **Dataset Fingerprint** | `csv_e28fb80c1095_json_f4229455a3e3` | Cryptographic SHA-256 verification hash |

### 3.2 Ground-Truth Entity Distribution

| PII Category | Entity Count | Corpus Share | Structural Nature |
| :--- | :--- | :--- | :---
| `NAME_STUDENT` | `11,112` | `50.0%` | Unstructured / Context-dependent proper nouns |
| `EMAIL` | `3,794` | `17.1%` | Structured syntactic identifier |
| `STREET_ADDRESS` | `3,543` | `15.9%` | Semi-structured locative sequence |
| `PHONE_NUM` | `2,439` | `11.0%` | Structured numeric/alphanumeric sequence |
| `USERNAME` | `718` | `3.2%` | Handle / account identifier |
| `URL_PERSONAL` | `620` | `2.8%` | Web URI / personal portfolio link |

### 3.3 Domain and Risk Tier Distribution

- **Risk Tiers**: `CRITICAL` (`2,774` cases, `62.6%`), `HIGH` (`1,523` cases, `34.3%`), `MEDIUM` (`119` cases, `2.7%`), `LOW` (`9` cases, `0.2%`), `NONE` (`9` cases, `0.2%`).
- **Operational Domains (11)**: General Professional (`33.1%`), Healthcare (`18.2%`), Services (`13.4%`), Technology (`7.9%`), Creative Media (`6.5%`), Corporate Business (`5.0%`), Finance (`4.7%`), Legal (`3.4%`), Aviation & Transport (`2.9%`), Education (`2.9%`), and Science (`2.0%`).

---

## 4. Methodology

### 4.1 Multi-Stage Hybrid Detection Layer

The detection pipeline (`HybridDetector`) combines deterministic and contextual extractors:

1. **Deterministic Regex Detector (`RegexDetector`)**: High-precision regular expressions targeting `EMAIL` ($c = 1.00$), `PHONE_NUM` (7–15 digits, $c = 0.95$), `URL_PERSONAL` ($c = 0.90$), `USERNAME` ($c = 0.85$), street patterns ($c = 0.90$), and introductory name anchors ($c = 0.85$).
2. **Contextual Sequence Tagger (`NERDetector`)**: Evaluates capitalized multi-token sequences (`NAME_STUDENT`) and street-keyword spans (`STREET_ADDRESS`). Base candidate confidence ($0.65$) is boosted ($+0.25$) when preceded within 30 characters by professional honorifics/roles (`dr`, `patient`, `student`, `attorney`, `engineer`) or introductory phrases, and penalized ($-0.35$) for common sentence-initial non-name tokens.
3. **Consensus Deduplication and Conflict Resolution**:
   - **Exact-Span Agreement**: When multiple detectors identify the identical character span $[s, e)$, confidence is boosted: $c_{\text{final}} = \min(1.0, \max(c_i) + 0.15)$.
   - **Overlap Priority Routing**: Overlapping intervals $[s_1, e_1) \cap [s_2, e_2) \neq \emptyset$ are resolved by prioritizing structured categories (`EMAIL`, `PHONE_NUM`, `URL_PERSONAL`) over unstructured spans, then selecting higher confidence, and finally longer character span length.
   - **Reverse-Offset Substitution**: All text replacements execute in descending order of start offset ($s_k > s_{k-1} > \dots > s_1$) to guarantee zero character-index drift.

### 4.2 The Five Privacy Protection Paradigms

| Paradigm | Research Inspiration | Mechanism | Output Type |
| :--- | :--- | :--- | :---
| **01. PIIvot** | *PIIvot* (EMNLP 2025) | Deterministic hash-mapped synthetic surrogates (e.g., *Alex Morgan*, `user_104@synthetic-privacy.org`) preserving syntax and coreference. | Transformed Text |
| **02. PRvL** | *PRvL* (arXiv:2508.05545) | Canonical symbolic tokenization (`<PERSON_1>`, `<EMAIL_1>`) paired with a First-Order Logic composite identity proof. | Transformed Text + Logic Proof |
| **03. PII-Bench** | *PII-Bench* (ACL 2026) | Query-intent classification that retains task-essential entities while redacting extraneous PII (`[REDACTED_TYPE]`). | Selectively Masked Text |
| **04. PrivacyLens** | *PrivacyLens* (arXiv:2409.00138) | Audits 5 Contextual Integrity parameters (*Sender, Recipient, Subject, Attribute, Transmission Principle*). | `ALLOW` / `DENY` + Audit Proof |
| **05. ConfAIde** | *ConfAIde* (arXiv:2310.17884) | Multi-factor quantitative risk scoring across domain, exposure, recipient trust, and purpose necessity. | Risk Score $[0,1]$ + Tier + `ALLOW` / `DENY` |

#### Formal Equations for Symbolic and Risk Paradigms

- **PRvL Composite Identity Proof**:
  $$\text{CompositeRisk}(E) \iff (\text{NAME\_STUDENT} \in E) \land \big((\text{EMAIL} \in E) \lor (\text{PHONE\_NUM} \in E) \lor (\text{STREET\_ADDRESS} \in E)\big)$$
  If $\text{CompositeRisk}(E)$ holds, PRvL emits `PROHIBIT_DISCLOSURE` and enforces strict canonical de-identification across all linked identifiers.

- **ConfAIde Multi-Factor Risk Score**:
  $$R = \text{clip}_{[0,1]}\left(0.40 \cdot S_e + 0.30 \cdot S_d + 0.20 \cdot T_r + 0.10 \cdot P_n\right)$$
  where $S_e \in [0.05, 0.90]$ denotes Entity Exposure (composite identity vs. isolated weak identifier), $S_d \in [0.30, 0.95]$ denotes Domain Sensitivity (e.g., Healthcare $= 0.95$, Finance $= 0.90$), $T_r \in [0.20, 0.90]$ denotes Recipient Untrustworthiness, and $P_n \in [0.10, 0.85]$ denotes Purpose Risk. Risk scores map to tiers: `CRITICAL` ($\ge 0.80$), `HIGH` ($\ge 0.60$), `MEDIUM` ($\ge 0.35$), `LOW` ($\ge 0.15$), and `NONE` ($< 0.15$). A normative `DENY` is triggered whenever $R \ge 0.50$.

---

## 5. Evaluation Metrics and Applicability Matrix

### 5.1 Formal Metric Definitions

1. **Entity-Level Detection Precision, Recall, and $F_1$**:
   Evaluated on normalized $( \text{clean}(e.\text{text}), e.\text{pii\_type} )$ tuples against ground-truth annotations $G$ and predicted spans $P$:
   $$\text{Precision} = \frac{|G \cap P|}{|P|}, \quad \text{Recall} = \frac{|G \cap P|}{|G|}, \quad F_1 = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

2. **Boundary-Aware Residual Leakage Rate ($L$)**:
   Checks whether ground-truth entities $g \in G$ remain exposed in protected text $T'$ using word-boundary regular expressions (`\b...\b`) to prevent false-positive substring matches (e.g., preventing `"Al"` from matching inside `"Also"`):
   $$L(G, T') = \frac{1}{|G|} \sum_{g \in G} \mathbb{I}\left(\text{exposed}(g, T')\right)$$

3. **Composite Downstream Utility Score ($U$)**:
   Combines non-PII vocabulary retention ($R_{\text{non-PII}}$) and token-set Jaccard similarity ($J(T, T')$):
   $$U(T, T', G) = 0.60 \cdot R_{\text{non-PII}}(T, T', G) + 0.40 \cdot \frac{|\text{tokens}(T) \cap \text{tokens}(T')|}{|\text{tokens}(T) \cup \text{tokens}(T')|}$$

4. **Contextual Integrity Decision Metrics**:
   - **Context Decision Accuracy**: Fraction of cases where predicted decision $\hat{d} \in \{\text{ALLOW}, \text{DENY}\}$ matches ground-truth normative expectation $d^*$.
   - **Unsafe ALLOW Rate**: $\Pr(\hat{d} = \text{ALLOW} \mid d^* = \text{DENY})$ (privacy violation rate; target $= 0.0\%$).
   - **Unnecessary DENY Rate**: $\Pr(\hat{d} = \text{DENY} \mid d^* = \text{ALLOW})$ (over-blocking rate).

### 5.2 Fair Metrics Applicability Matrix

| Method | Paradigm Category | Detector $F_1$ | Leakage Rate ($L$) | Utility Score ($U$) | Context Accuracy | Latency (ms) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PIIvot** | Redaction & Pseudonymization | Inherited | Applicable (Target: `0.0`) | Applicable (Target: `1.0`) | N/A (Unconditional Transform) | Applicable |
| **PRvL** | Redaction & Pseudonymization | Inherited | Applicable (Target: `0.0`) | Applicable (Target: `1.0`) | N/A (Symbolic Transform) | Applicable |
| **PII-Bench** | Redaction & Pseudonymization | Inherited | Applicable (Query-Filtered) | Applicable (Query-Prioritized) | N/A (Task-Selective Masking) | Applicable |
| **PrivacyLens** | Contextual Decision & Risk | Inherited | N/A (Normative Audit Engine) | N/A (Normative Audit Engine) | Applicable (Target: `1.0`) | Applicable |
| **ConfAIde** | Contextual Decision & Risk | Inherited | N/A (Risk Scoring Engine) | N/A (Risk Scoring Engine) | Applicable (Target: `1.0`) | Applicable |

---

## 6. Empirical Benchmark Results

Evaluated on the stratified benchmark sample ($N = 50$ cases, random seed $= 42$, $124$ ground-truth entities across all 5 risk tiers):

### 6.1 Baseline Detector Performance (By PII Category)

| PII Category | Precision | Recall | $F_1$-Score | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Support |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `EMAIL` | `0.850` | `1.000` | `0.919` | `17` | `3` | `0` | `17` |
| `URL_PERSONAL` | `0.789` | `1.000` | `0.882` | `15` | `4` | `0` | `15` |
| `STREET_ADDRESS` | `0.769` | `0.625` | `0.690` | `10` | `3` | `6` | `16` |
| `PHONE_NUM` | `0.600` | `0.600` | `0.600` | `6` | `4` | `4` | `10` |
| `NAME_STUDENT` | `0.900` | `0.353` | `0.507` | `18` | `2` | `33` | `51` |
| `USERNAME` | `0.600` | `0.200` | `0.300` | `3` | `2` | `12` | `15` |
| **Overall Hybrid Baseline** | **`0.793`** | **`0.556`** | **`0.654`** | **`69`** | **`18`** | **`55`** | **`124`** |

### 6.2 Comparative Method Performance

| Method | Category | Detector $F_1$ | Leakage Rate | Cases w/ Leak | Utility Score | Context Acc | Unsafe ALLOW | Median Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **PIIvot** | Redaction & Pseudonymization | `0.654` | `0.345` | `54.0%` | `0.986` | N/A | N/A | `0.81 ms` |
| **PRvL** | Redaction & Pseudonymization | `0.654` | `0.345` | `54.0%` | `0.988` | N/A | N/A | `0.82 ms` |
| **PII-Bench** | Redaction & Pseudonymization | `0.654` | `0.348` | `54.0%` | `0.989` | N/A | N/A | `0.88 ms` |
| **PrivacyLens** | Contextual Decision & Risk | `0.654` | N/A | N/A | N/A | `0.780` (`78.0%`) | `16.7%` | `1.07 ms` |
| **ConfAIde** | Contextual Decision & Risk | `0.654` | N/A | N/A | N/A | `0.720` (`72.0%`) | `16.7%` | `1.10 ms` |

### 6.3 Key Scientific Findings

1. **Structured vs. Unstructured Detection Bottleneck**: Structured identifiers (`EMAIL`, `URL_PERSONAL`) achieve `100.0%` recall under deterministic regex rules, whereas unstructured proper nouns (`NAME_STUDENT`) without preceding honorific anchors account for `60.0%` ($33 / 55$) of all detector false negatives.
2. **Residual Leakage Attribution**: Because PIIvot and PRvL deterministically mask `100%` of *detected* entities, their `0.345` residual leakage rate is strictly upper-bounded by detector recall ($1 - \text{Recall}$).
3. **High Structural Fidelity**: Synthetic surrogate substitution (**PIIvot**, $U = 0.986$) and symbolic tokenization (**PRvL**, $U = 0.988$) preserve nearly `99%` of non-PII lexical structure at sub-millisecond median latency ($\approx 0.81\text{ ms}$).
4. **Normative Auditing Efficacy**: **PrivacyLens** achieves `78.0%` agreement with ground-truth Contextual Integrity norms across multi-domain scenarios while maintaining a conservative posture (`31 DENY` vs. `19 ALLOW`).

---

## 7. Interactive Research Workspace

The web application provides five specialized modules designed in a high-contrast minimalist monochrome interface:

1. **Overview**: Displays live dataset verification status, SHA-256 fingerprint, baseline KPIs, and architectural specifications.
2. **Interactive Test**: Allows researchers to toggle individual detector layers (`Regex`, `NER`, `LLM`), input custom clinical/financial/educational narratives, and inspect character-offset entity tables and reasoning proofs.
3. **Compare**: Executes all five paradigms side-by-side on identical inputs to contrast text transformation against normative `ALLOW`/`DENY` auditing.
4. **Experiment**: Launches reproducible stratified benchmark runs with configurable sample sizes (`10` to `4,434` cases) and random seeds.
5. **Dashboard**: Features seven analytical tabs—*Executive Summary*, *PII Detection*, *Leakage Analysis*, *Utility & Trade-Offs*, *Contextual Risk*, *Case Explorer*, and *Metadata & Export* (with one-click CSV and JSON artifact downloads).

---

## 8. Installation and Reproducibility

```bash
# Install dependencies
npm install

# Start the interactive benchmark workspace on port 3000
npm run dev

# Type-check and build production bundle
npm run build
```

---

## 9. Primary Literature References

1. **PIIvot**: *Context-Preserving Synthetic Pseudonymization for Privacy-Safe Text Generation* (EMNLP 2025). `https://aclanthology.org/2025.emnlp-main.1397.pdf`
2. **PRvL**: *Privacy-Preserving Reasoning via First-Order Symbolic Logic* (arXiv:2508.05545). `https://arxiv.org/pdf/2508.05545`
3. **PII-Bench**: *Query-Aware Selective Masking and Task-Relevant PII Evaluation* (ACL 2026). `https://aclanthology.org/2026.acl-long.227.pdf`
4. **PrivacyLens**: *Evaluating Contextual Integrity Norms in Language Models* (arXiv:2409.00138). `https://arxiv.org/pdf/2409.00138`
5. **ConfAIde**: *Contextual Privacy Risk Reasoning and Tiered Disclosure Assessment* (arXiv:2310.17884). `https://arxiv.org/html/2310.17884v1`
