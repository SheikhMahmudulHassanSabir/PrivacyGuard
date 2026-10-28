import React from 'react';
import { Header, DatasetBanner, KpiCard, MethodBadge } from '../components/CommonComponents';
import { ExperimentRunData } from '../types/privacy';
import {
  Shield,
  ShieldCheck,
  Cpu,
  ArrowUpRight,
  FlaskConical,
  Scale,
  Play,
  BarChart3,
  Layers,
  Database,
  Activity,
  Compass,
} from 'lucide-react';

interface OverviewViewProps {
  experimentData: ExperimentRunData;
  onNavigate: (tabId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ experimentData, onNavigate }) => {
  const meta = experimentData?.run_metadata;
  const valReport = experimentData?.dataset_validation;
  const detBench = experimentData?.detector_benchmark;
  const methods = experimentData?.method_metrics || [];

  const totalCases = valReport?.total_csv_records || 4434;
  const detF1 = detBench?.overall?.f1 != null ? detBench.overall.f1.toFixed(3) : 'N/A';
  const detP = detBench?.overall?.precision != null ? detBench.overall.precision.toFixed(3) : 'N/A';

  const paradigms = [
    {
      index: '01',
      id: 'piivot',
      title: 'Context-Preserving Synthetic Pseudonymization',
      description:
        'Replaces detected PII entities with realistic synthetic surrogates (e.g., Alex Morgan, user_104@synthetic-privacy.org), maintaining grammatical fluency, casing, and semantic structure without leaking sensitive source data.',
    },
    {
      index: '02',
      id: 'prvl',
      title: 'Logic-Driven Symbolic Tokenization',
      description:
        'Replaces sensitive entities with deterministic canonical logic tokens (<PERSON_1>, <EMAIL_1>) paired with a First-Order Logic constraint proof to verify composite disclosure risk.',
    },
    {
      index: '03',
      id: 'pii_bench',
      title: 'Query & Task-Aware Selective Masking',
      description:
        'Inspects downstream task intent to selectively retain query-critical PII (e.g., preserving contact details when answering "What is their email?") while strictly redacting extraneous personal attributes.',
    },
    {
      index: '04',
      id: 'privacylens',
      title: 'Contextual Integrity (CI) Normative Audit',
      description:
        'Audits information flows across five contextual parameters (Sender, Recipient, Subject, Attribute, Transmission Principle) to render normative ALLOW or DENY privacy decisions.',
    },
    {
      index: '05',
      id: 'confaide',
      title: 'Multi-Factor Contextual Privacy Risk Reasoning',
      description:
        'Computes quantitative disclosure risk across Domain Sensitivity (Sd), Entity Exposure (Se), Recipient Trust (Tr), and Purpose Necessity (Pn), mapping to standardized risk tiers.',
    },
  ];

  const navCards = [
    {
      id: 'test',
      title: 'Interactive Test',
      description:
        'Test individual text inputs live across all five methods with granular entity span visualizers.',
      icon: FlaskConical,
    },
    {
      id: 'compare',
      title: 'Compare Methods',
      description:
        'Run all five methods side-by-side on the exact same input case with direct output comparisons.',
      icon: Scale,
    },
    {
      id: 'experiment',
      title: 'Run Experiment',
      description:
        'Execute benchmark runs across configurable sample sizes with live progress tracking.',
      icon: Play,
    },
    {
      id: 'dashboard',
      title: 'Results Dashboard',
      description:
        'Explore empirical benchmark metrics, leakage rates, utility curves, and the Case Explorer.',
      icon: BarChart3,
    },
  ];

  return (
    <div className="space-y-10">
      <Header
        icon={<Shield className="w-4 h-4 stroke-[1.75]" />}
        title="PrivacyGuard Framework"
        subtitle="Context-Aware Personally Identifiable Information (PII) Protection & Comparative Research Benchmark"
        badgeText="v1.2 Research Edition"
      />

      {/* 1. Dataset Status Banner */}
      {valReport && <DatasetBanner report={valReport} />}

      {/* 2. KPI Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Verified Dataset Cases"
          value={totalCases.toLocaleString()}
          sub="4,434 annotated cases · 11 domains"
          icon={<Database className="w-4 h-4 stroke-[1.5]" />}
        />
        <KpiCard
          label="Latest Benchmark Run"
          value={meta ? `${meta.evaluated_sample_size} Cases` : '50 Cases'}
          sub={`ID: ${meta?.run_id?.slice(0, 18) || 'pg_exp_active'}`}
          icon={<Activity className="w-4 h-4 stroke-[1.5]" />}
        />
        <KpiCard
          label="Detector Baseline F1"
          value={detF1}
          sub={`Precision: ${detP}`}
          icon={<ShieldCheck className="w-4 h-4 stroke-[1.5]" />}
        />
        <KpiCard
          label="Evaluated Paradigms"
          value={`${methods.length || 5} Methods`}
          sub="Deterministic & contextual engines"
          icon={<Layers className="w-4 h-4 stroke-[1.5]" />}
        />
      </div>

      {/* 3. System Architecture & Research Paradigms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 border border-neutral-200 bg-white">
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
              <h2 className="text-base font-bold text-neutral-950">
                The Five Privacy Protection Paradigms
              </h2>
            </div>
            <span className="text-xs font-mono text-neutral-500">01 — 05</span>
          </div>

          <div className="divide-y divide-neutral-200">
            {paradigms.map((p) => (
              <div key={p.id} className="p-5 hover:bg-neutral-50/80 transition-colors">
                <div className="flex flex-wrap items-baseline gap-2.5 mb-1.5">
                  <span className="text-xs font-mono font-bold text-neutral-400">
                    {p.index}.
                  </span>
                  <MethodBadge method={p.id} />
                  <span className="text-neutral-300" aria-hidden="true">/</span>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    {p.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 pl-6 leading-relaxed">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="border border-neutral-200 bg-white p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-200">
              <Cpu className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
              <h2 className="text-base font-bold text-neutral-950">
                Multi-Stage Detection Pipeline
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              The detection layer coordinates three specialized extraction stages with deterministic conflict resolution:
            </p>

            <div className="space-y-3 text-xs text-neutral-700 divide-y divide-neutral-100">
              <div className="pt-2 first:pt-0">
                <strong className="font-semibold text-neutral-950 block mb-0.5">
                  01. Heuristic Regex Layer
                </strong>
                <p className="text-neutral-600 leading-relaxed">
                  Deterministic pattern matching for structured identifiers:{' '}
                  <code className="font-mono text-neutral-900">EMAIL</code>,{' '}
                  <code className="font-mono text-neutral-900">PHONE_NUM</code>,{' '}
                  <code className="font-mono text-neutral-900">URL_PERSONAL</code>, and{' '}
                  <code className="font-mono text-neutral-900">USERNAME</code>.
                </p>
              </div>

              <div className="pt-3">
                <strong className="font-semibold text-neutral-950 block mb-0.5">
                  02. Contextual Sequence Tagger
                </strong>
                <p className="text-neutral-600 leading-relaxed">
                  Rule-based syntactic sequence matcher for proper names (
                  <code className="font-mono text-neutral-900">NAME_STUDENT</code>) and street structures (
                  <code className="font-mono text-neutral-900">STREET_ADDRESS</code>).
                </p>
              </div>

              <div className="pt-3">
                <strong className="font-semibold text-neutral-950 block mb-0.5">
                  03. Optional LLM Reasoning Layer
                </strong>
                <p className="text-neutral-600 leading-relaxed">
                  Zero-shot contextual entity extraction and normative boundary audit.
                </p>
              </div>

              <div className="pt-3">
                <strong className="font-semibold text-neutral-950 block mb-0.5">
                  04. Span Deduplication & Calibration
                </strong>
                <p className="text-neutral-600 leading-relaxed">
                  Resolves overlapping character intervals and executes substitutions in reverse offset order to prevent index drift.
                </p>
              </div>
            </div>

            <div className="mt-5 p-4 bg-neutral-50 border border-neutral-900 text-xs text-neutral-800 space-y-1.5">
              <div className="font-bold flex items-center gap-2 text-neutral-950">
                <ShieldCheck className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
                <span>Unified Evaluation Pipeline</span>
              </div>
              <p className="leading-relaxed text-neutral-600">
                All five methods are evaluated on the exact same ground-truth dataset across six standardized metrics: <strong className="text-neutral-950">Detector F1</strong>, <strong className="text-neutral-950">Leakage Rate</strong>, <strong className="text-neutral-950">Cases w/ Leakage</strong>, <strong className="text-neutral-950">Utility Score</strong>, <strong className="text-neutral-950">Context Accuracy</strong>, and <strong className="text-neutral-950">Median Latency</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3.5 Standardized Cross-Method Benchmark Summary */}
      {methods.length > 0 && (
        <div className="border border-neutral-200 bg-white">
          <div className="p-5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-neutral-950">
                Standardized Cross-Method Evaluation Summary
              </h2>
              <p className="text-xs text-neutral-600 mt-0.5">
                Empirical comparison across all five privacy paradigms on the shared {meta?.evaluated_sample_size || 50}-case ground-truth sample.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 border border-neutral-950 bg-white hover:bg-neutral-950 hover:text-white transition-colors cursor-pointer"
            >
              <span>Full Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <tr>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Detector F1</th>
                  <th className="py-3 px-4 text-right">Leakage Rate</th>
                  <th className="py-3 px-4 text-right">Cases w/ Leakage</th>
                  <th className="py-3 px-4 text-right">Utility Score</th>
                  <th className="py-3 px-4 text-right">Context Accuracy</th>
                  <th className="py-3 px-4 text-right">Median Latency</th>
                  <th className="py-3 px-4 text-right">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-mono tabular-nums">
                {methods.map((m) => {
                  const leakPct = ((m.leakage_rate ?? 0) * 100).toFixed(1);
                  const casesPct = (m.cases_with_leakage_pct ?? 0).toFixed(1);
                  const casesCount =
                    m.cases_with_leakage_count ??
                    Math.round(((m.cases_with_leakage_pct ?? 0) / 100) * (m.total_cases || 50));
                  const utilStr = (m.utility_score ?? 0).toFixed(3);
                  const ctxPct = ((m.context_accuracy ?? 0) * 100).toFixed(1);
                  return (
                    <tr key={m.method_name} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-sans whitespace-nowrap">
                        <MethodBadge method={m.method_name} />
                      </td>
                      <td className="py-3 px-4 text-neutral-600 font-sans text-[11px]">
                        {m.category}
                      </td>
                      <td className="py-3 px-4 text-neutral-800 text-right">
                        {(m.detector_f1 ?? detBench?.overall?.f1 ?? 0).toFixed(3)}
                      </td>
                      <td
                        className="py-3 px-4 text-neutral-950 font-semibold text-right"
                        title={`${m.total_leaked_entities ?? 0} / ${m.total_ground_truth_entities ?? 186} ground-truth entities exposed`}
                      >
                        {leakPct}%
                      </td>
                      <td
                        className="py-3 px-4 text-neutral-800 text-right"
                        title={`${casesCount} / ${m.total_cases} cases with >=1 exposed entity`}
                      >
                        {casesPct}% ({casesCount}/{m.total_cases})
                      </td>
                      <td className="py-3 px-4 text-neutral-950 font-semibold text-right">
                        {utilStr}
                      </td>
                      <td className="py-3 px-4 text-neutral-950 font-semibold text-right">
                        {ctxPct}%
                      </td>
                      <td className="py-3 px-4 text-neutral-800 text-right">
                        {m.median_latency_ms.toFixed(2)} ms
                      </td>
                      <td className="py-3 px-4 text-neutral-950 font-bold text-right">
                        {((1.0 - (m.failure_rate || 0)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Navigation Guide Cards */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
          <h2 className="text-base font-bold text-neutral-950">Workspace Modules</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {navCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                onClick={() => onNavigate(card.id)}
                className="text-left bg-white border border-neutral-200 p-5 hover:border-neutral-950 transition-colors group cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 border border-neutral-900 bg-white group-hover:bg-neutral-950 group-hover:text-white text-neutral-950 flex items-center justify-center transition-colors">
                      <Icon className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-950 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-950">{card.title}</h3>
                  <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
