# PrivacyGuard — Minimalist Monochrome UI/UX Redesign

This redesign transforms PrivacyGuard into a refined, high-contrast black-and-white research workspace. Every emoji across headers, tabs, status alerts, and buttons is replaced with crisp vector iconography, while colored accents, thick left card stripes, and decorative pill badges are replaced with clean hairline borders, typographic hierarchy, and monochrome pattern encodings.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and visual decisions incorporate your confirmed preferences from the clarification phase:

- **Confirmed Decision 1 — Monochrome Light Posture**: Crisp white canvas (`#FFFFFF`) paired with jet-black ink (`#0A0A0A`), subtle stone-gray structural surfaces (`#FAFAFA`), and 1px hairline borders (`#E5E5E5` and `#171717`).
- **Confirmed Decision 2 — Three-Zone Top Horizontal Navigation**: A single-row top navigation bar featuring the clean brand mark on the left, five single-line navigation links with monochrome vector icons in the center, and a primary action trigger on the right.
- **Confirmed Decision 3 — Strictly Monochrome Data & Status Encoding**: Decisions (`ALLOW` vs. `DENY`), risk tiers, and analytical charts distinguish categories through solid black fills, crisp 1px outlines, SVG diagonal hatch patterns, and explicit icon-plus-label pairings rather than hue.

---

### 1. Overview & Core Concept

- **What It Does**: Provides an interactive evaluation and benchmarking environment for five context-aware PII protection paradigms (PIIvot, PRvL, PII-Bench, PrivacyLens, and ConfAIde) paired with a multi-stage hybrid detection pipeline and a 7-tab empirical results dashboard.
- **Target Audience / Persona**: Privacy researchers, security engineers, and compliance auditors who require a distraction-free, publication-grade analytical instrument for inspecting entity spans, normative decisions, and privacy-utility trade-offs.
- **Key Value**: Eliminates visual noise and chromatic clutter so complex tabular telemetry, character-offset spans, and first-order logic proofs can be scanned with maximum legibility and zero eye fatigue.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **System Overview Flow**: Users land on a structured executive summary displaying dataset verification status (4,434 cases, 22,226 ground-truth entities), a 4-column hairline-divided metric strip, an editorial 01–05 breakdown of the five protection paradigms, and quick-launch action cards with vector icons.
  2. **Interactive Test Flow**: Users configure detector layers (Regex, NER, LLM) in a clean left configuration panel, enter source text and contextual parameters in the main workspace, and inspect protected output code blocks, monochrome decision indicators, and character-span tables.
  3. **Side-by-Side Comparison Flow**: Users run all five paradigms simultaneously on a single case and compare outcomes in a high-density tabular grid with expandable reasoning proofs.
  4. **Benchmark Experiment Flow**: Users configure sample size, random seed, and stratified risk sampling, monitor live execution progress via a sharp monochrome progress bar, and switch active benchmark runs from the saved run registry.
  5. **Results Dashboard & Case Explorer Flow**: Users navigate seven icon-labeled analytical tabs featuring monochrome bar charts, SVG pattern-encoded category breakdowns, a top-left quadrant scatter plot, and a granular before/after Case Explorer with CSV and JSON export actions.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Swiss editorial & utilitarian technical precision. Clean grid geometry, exposed 1px structural hairlines, generous whitespace, and zero decorative chrome.
  - *Color Palette & Mood* (60-30-10 Monochrome Allocation):
    - **60% Dominant Neutral Canvas**: Pure white (`#FFFFFF`) primary viewport background.
    - **30% Structural Surfaces & Hairlines**: Off-white (`#FAFAFA`) secondary panels and table headers, neutral borders (`#E5E5E5`), and muted metadata ink (`#525252`).
    - **10% High-Intent Ink Accent**: Jet black (`#0A0A0A`) concentrated strictly on primary CTAs, active navigation underlines, inverted `DENY` / `CRITICAL` indicators, and primary data bars.
  - *Typography & Hierarchy*:
    - **Display & UI Structure**: `Plus Jakarta Sans` (SemiBold 600 / Bold 700, tight tracking `-0.02em`, `text-wrap: balance` on headings).
    - **Body Prose**: `Plus Jakarta Sans` (Regular 400 / Medium 500, 15px body scale, comfortable 65ch reading measure).
    - **Telemetry, Offsets & Code**: `JetBrains Mono` with `font-variant-numeric: tabular-nums` enforced across all latency figures, F1 scores, character spans (`[start:end]`), and SHA-256 fingerprints.
  - *Component Styling & Layout*:
    - **Three-Zone Top Bar Contract**: Zone 1 displays the `PrivacyGuard` wordmark with a minimal vector shield icon; Zone 2 houses the 5 single-line view links (`Overview`, `Interactive Test`, `Compare Methods`, `Run Experiment`, `Results Dashboard`); Zone 3 provides a single high-contrast `New Benchmark` CTA button.
    - **Single-Elevation Depth & Hairline Grids**: Removes all `border-l-4` colored stripes and nested drop-shadow cards. KPI strips and paradigm lists use clean 1px solid borders (`border-neutral-200`) and subtle hover border transitions (`hover:border-neutral-900`).
    - **Zero-Pill Metadata Discipline**: Method labels, dataset fingerprints, and category tags render as clean typographic labels with `·` or `/` separators or crisp rectangular architectural tags where status distinction is required.

- **Interactive Feedback & Motion**:
  - Snappy 150ms opacity and border-color transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).
  - Clear `focus-visible:ring-2 focus-visible:ring-neutral-900` keyboard focus states across all inputs, selectors, and tabs.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Complete Emoji Eradication & Vector Icon Substitution**
  - *Chosen Approach*: Audit every heading, badge, button, tab label, alert banner, and HTML favicon to strip all Unicode emojis and replace functional affordances with 1.5px-stroke `lucide-react` monochrome icons.
  - *Why*: Emojis render inconsistently across operating systems and clash with a serious research benchmark aesthetic; vector icons maintain uniform stroke weight and alignment.
  - *Alternatives Considered*: Keeping text-only labels everywhere—passed over because functional icons on navigation tabs, export buttons, and status alerts speed up visual scanning.

- **Decision 2: Pattern & Contrast Encoding for Monochrome Charts & Statuses**
  - *Chosen Approach*: Encode multi-series data (such as Precision vs. Recall vs. F1) using distinct monochrome treatments: solid black (`#0A0A0A`), mid-charcoal (`#737373`), and crisp 1px outlined bars with diagonal SVG hatch patterns. Encode `ALLOW` with a clean bordered frame and check icon, and `DENY` with an inverted solid black frame, white text, and X icon.
  - *Why*: Preserves 100% color-blind accessibility and strict black-and-white purity without losing the ability to distinguish data series at a glance.
  - *Alternatives Considered*: Using grayscale shades alone—passed over because three adjacent gray bars can be difficult to tell apart without outline/pattern differentiation.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Application Shell (Top Bar)                        │
│  [Zone 1: Brand Mark] ─── [Zone 2: 5 Monochrome Nav Links] ─── [Action] │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐           ┌───────────────┐           ┌───────────────┐
│ Overview &    │           │ Interactive & │           │ Benchmark &   │
│ Architecture  │           │ Compare Views │           │ Analytics     │
├───────────────┤           ├───────────────┤           ├───────────────┤
│ • Dataset     │           │ • Detector    │           │ • Experiment  │
│   Status Bar  │           │   Config      │           │   Runner      │
│ • 4-Col KPI   │           │ • Live Case   │           │ • 7-Tab       │
│   Hairline    │           │   Form        │           │   Results     │
│   Grid        │           │ • Side-by-Side│           │   Dashboard   │
│ • 01-05       │           │   Diff Table  │           │ • Monochrome  │
│   Paradigms   │           │ • Span Offset │           │   SVG Charts  │
│ • Quick Nav   │           │   Inspector   │           │ • Case        │
│   Cards       │           │               │           │   Explorer    │
└───────┬───────┘           └───────┬───────┘           └───────┬───────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Shared Monochrome Design System & Engine                 │
│  • Common UI Primitives (Headers, Hairline KPIs, Monochrome Statuses)   │
│  • Pattern/Outline SVG Charts (Category Bars, Scatter, Donut)           │
│  • Vectorized Detection & 5-Method Evaluation Pipeline                  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - Active benchmark state (`ExperimentRunData`) holds run metadata, dataset validation snapshots, per-category detector benchmarks, method evaluation summaries, and all 50 individual case records.
  - Saved runs state maintains a session list of executed experiments so users can run custom sample sizes or seeds and immediately switch the active dashboard dataset.

- **Interactive Component & State Mapping**:
  - **Top Navigation Bar**: Clicking any of the 5 view links or the primary `Run Benchmark` action updates `activeView` state and scrolls to the top of the workspace.
  - **Interactive Test & Compare Forms**: Toggling detector checkboxes (`Regex`, `NER`, `LLM`), editing source text/query/recipient/purpose, and submitting triggers the deterministic `HybridDetector` and method runners, updating the results list and collapsible span tables.
  - **Experiment Runner**: Adjusting sample size, seed, stratification, and method checkboxes and clicking `Start Benchmark Experiment` runs `executeBenchmarkRun`, animates the monochrome progress bar, appends the new artifact to `savedRuns`, and updates `currentRunData`.
  - **Results Dashboard Tabs & Case Explorer**: Clicking any of the 7 icon-annotated analytical tabs switches the active analytical panel; selecting a case in the Case Explorer dropdown updates the inspected context, ground-truth entity table, and per-method transformation tabs; clicking CSV or JSON export triggers immediate file downloads.
