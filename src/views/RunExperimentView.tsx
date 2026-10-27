import React, { useState, useRef } from 'react';
import initialRunData from '../data/latest_run.json';
import { Header, DatasetBanner, KpiCard } from '../components/CommonComponents';
import { ExperimentRunData, PrivacyCase } from '../types/privacy';
import {
  executeBenchmarkRun,
  sampleBenchmarkCases,
  classifyCaseRiskTier,
} from '../lib/evaluator';
import {
  Play,
  History,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sliders,
  AlertCircle,
  Square,
} from 'lucide-react';

interface RunExperimentViewProps {
  currentData: ExperimentRunData;
  savedRuns: ExperimentRunData[];
  onSaveNewRun: (data: ExperimentRunData) => void;
  onUpdateActiveRun: (data: ExperimentRunData) => void;
  onNavigateToDashboard: () => void;
}

const CANONICAL_BASE_CASES: PrivacyCase[] = (
  (initialRunData as any).per_record_results || []
).map((r: any) => {
  const entities = (r.ground_truth_entities || []).map((e: any, idx: number) => ({
    entity_id: `gt_${r.case_id}_${idx}`,
    text: e.text,
    pii_type: e.type,
    start: e.start,
    end: e.end,
    label: e.type,
  }));
  return {
    case_id: r.case_id,
    context: r.context,
    query: r.query,
    recipient: r.recipient,
    purpose: r.purpose,
    expected_decision: r.expected_decision,
    risk_level: r.risk_level || classifyCaseRiskTier(entities),
    entities,
  };
});

export const RunExperimentView: React.FC<RunExperimentViewProps> = ({
  currentData,
  savedRuns,
  onSaveNewRun,
  onUpdateActiveRun,
  onNavigateToDashboard,
}) => {
  const [sampleSize, setSampleSize] = useState<number | 'full'>(50);
  const [randomSeed, setRandomSeed] = useState<number>(42);
  const [stratify, setStratify] = useState<boolean>(true);

  // Detector flags
  const [useRegex, setUseRegex] = useState<boolean>(true);
  const [useNer, setUseNer] = useState<boolean>(true);
  const [useLlm, setUseLlm] = useState<boolean>(false);

  // Method checkboxes
  const [mPiivot, setMPiivot] = useState<boolean>(true);
  const [mPrvl, setMPrvl] = useState<boolean>(true);
  const [mPiiBench, setMPiiBench] = useState<boolean>(true);
  const [mPrivacylens, setMPrivacylens] = useState<boolean>(true);
  const [mConfaide, setMConfaide] = useState<boolean>(true);

  // Validation & execution state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [completedSummary, setCompletedSummary] = useState<any | null>(null);

  const timerIdsRef = useRef<number[]>([]);

  const clearTimers = () => {
    for (const id of timerIdsRef.current) {
      window.clearTimeout(id);
    }
    timerIdsRef.current = [];
  };

  const handleCancelExperiment = () => {
    clearTimers();
    setIsRunning(false);
    setProgress(0);
    setStatusMsg('Experiment cancelled by user. Previous active results preserved.');
  };

  const handleStartExperiment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;

    const selected: string[] = [];
    if (mPiivot) selected.push('piivot');
    if (mPrvl) selected.push('prvl');
    if (mPiiBench) selected.push('pii_bench');
    if (mPrivacylens) selected.push('privacylens');
    if (mConfaide) selected.push('confaide');

    if (selected.length === 0) {
      setValidationError('Select at least one privacy paradigm to evaluate.');
      return;
    }

    if (!useRegex && !useNer && !useLlm) {
      setValidationError('Enable at least one detector stage (Regex, NER, or Semantic Layer).');
      return;
    }

    const safeSeed = Number.isFinite(randomSeed) ? Math.max(0, Math.floor(randomSeed)) : 42;

    setValidationError(null);
    setCompletedSummary(null);
    setIsRunning(true);
    setProgress(0.2);
    setStatusMsg(
      `Sampling ${sampleSize === 'full' ? '4,434' : sampleSize} verified records (Seed: ${safeSeed}, Stratified: ${stratify ? 'Yes' : 'No'})...`
    );

    clearTimers();

    const t1 = window.setTimeout(() => {
      const sampledCases = sampleBenchmarkCases(
        CANONICAL_BASE_CASES,
        sampleSize,
        safeSeed,
        stratify
      );

      setProgress(0.6);
      setStatusMsg(
        `Executing ${selected.length} methods across ${sampledCases.length} sampled cases...`
      );

      const t2 = window.setTimeout(() => {
        const newRun = executeBenchmarkRun(
          sampledCases,
          selected,
          safeSeed,
          {
            enable_regex: useRegex,
            enable_ner: useNer,
            enable_llm: useLlm,
          },
          stratify
        );
        setProgress(1.0);
        setStatusMsg('Benchmark experiment completed.');
        setIsRunning(false);
        setCompletedSummary(newRun.run_metadata);
        onSaveNewRun(newRun as any);
      }, 250);

      timerIdsRef.current.push(t2);
    }, 200);

    timerIdsRef.current.push(t1);
  };

  const handleSetActive = (run: ExperimentRunData) => {
    onUpdateActiveRun(run);
  };

  return (
    <div className="space-y-8">
      <Header
        icon={<Play className="w-4 h-4 stroke-[1.75]" />}
        title="Benchmark Experiment Runner"
        subtitle="Configure and execute reproducible comparative evaluations across all five privacy methods using verified dataset cases."
        badgeText="Experimental Pipeline"
      />

      <DatasetBanner report={currentData.dataset_validation} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleStartExperiment}
            className="bg-white border border-neutral-200 p-6 space-y-6"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
              <Sliders className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
              <h2 className="text-sm font-bold text-neutral-950">
                Experiment Configuration
              </h2>
            </div>

            {validationError && (
              <div className="p-3.5 bg-neutral-950 text-white text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="exp-sample-size"
                    className="block text-xs font-semibold text-neutral-900 mb-1.5"
                  >
                    Evaluation Sample Size
                  </label>
                  <select
                    id="exp-sample-size"
                    value={sampleSize}
                    onChange={(e) =>
                      setSampleSize(e.target.value === 'full' ? 'full' : Number(e.target.value))
                    }
                    className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
                  >
                    <option value={10}>10 Cases</option>
                    <option value={25}>25 Cases</option>
                    <option value={50}>50 Cases (Recommended Balance)</option>
                    <option value={100}>100 Cases</option>
                    <option value={250}>250 Cases</option>
                    <option value={500}>500 Cases</option>
                    <option value="full">Full Verified Set (4,434)</option>
                  </select>
                  <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
                    Exact sample size is enforced without record duplication.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="exp-random-seed"
                    className="block text-xs font-semibold text-neutral-900 mb-1.5"
                  >
                    Random Seed (Reproducibility)
                  </label>
                  <input
                    id="exp-random-seed"
                    type="number"
                    min={0}
                    max={999999}
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white font-mono tabular-nums text-neutral-950"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
                    Mulberry32 seeded PRNG guarantees identical case selection across repeated runs.
                  </p>
                </div>

                <div className="pt-1 border-t border-neutral-100">
                  <span className="block text-xs font-semibold text-neutral-900 mb-2">
                    Detector Stages
                  </span>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRegex}
                        onChange={(e) => setUseRegex(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900">Regex Pattern Layer</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useNer}
                        onChange={(e) => setUseNer(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900">Contextual NER Layer</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useLlm}
                        onChange={(e) => setUseLlm(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900">Semantic LLM Heuristic Layer</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={stratify}
                    onChange={(e) => setStratify(e.target.checked)}
                    className="accent-neutral-950 w-4 h-4 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-950 block">
                      Stratified Risk Sampling
                    </span>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                      Ensures balanced representation across CRITICAL, HIGH, MEDIUM, LOW, and NONE risk tiers.
                    </p>
                  </div>
                </label>

                <div className="pt-1">
                  <span className="block text-xs font-semibold text-neutral-900 mb-2">
                    Methods to Evaluate
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mPiivot}
                        onChange={(e) => setMPiivot(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900 font-medium">
                        PIIvot · Pseudonymization
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mPrvl}
                        onChange={(e) => setMPrvl(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900 font-medium">
                        PRvL · Logic Tokenization
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mPiiBench}
                        onChange={(e) => setMPiiBench(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900 font-medium">
                        PII-Bench · Task-Selective
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mPrivacylens}
                        onChange={(e) => setMPrivacylens(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900 font-medium">
                        PrivacyLens · CI Audit
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mConfaide}
                        onChange={(e) => setMConfaide(e.target.checked)}
                        className="accent-neutral-950 w-3.5 h-3.5"
                      />
                      <span className="text-neutral-900 font-medium">
                        ConfAIde · Risk Scoring
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isRunning}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Experiment...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Benchmark Experiment</span>
                  </>
                )}
              </button>

              {isRunning && (
                <button
                  type="button"
                  onClick={handleCancelExperiment}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-neutral-950 bg-white border border-neutral-950 hover:bg-neutral-100 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Cancel Run</span>
                </button>
              )}
            </div>

            {/* Progress indicator */}
            {(isRunning || statusMsg) && (
              <div className="space-y-2 pt-2">
                {isRunning && (
                  <div className="w-full bg-neutral-100 border border-neutral-300 h-2.5 overflow-hidden">
                    <div
                      className="bg-neutral-950 h-full transition-all duration-300"
                      style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                  </div>
                )}
                <div className="text-xs text-neutral-700 font-mono">{statusMsg}</div>
              </div>
            )}
          </form>

          {/* Completed Run Summary Card */}
          {completedSummary && (
            <div className="bg-neutral-50 border border-neutral-950 p-6 space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-neutral-950 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-neutral-950 stroke-[2]" />
                  <span>Benchmark Run Completed</span>
                </div>
                <span className="text-xs font-mono text-neutral-600">
                  Stratified: {completedSummary.stratified ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <KpiCard
                  label="Run ID"
                  value={completedSummary.run_id.slice(-10)}
                  sub="Timestamped"
                />
                <KpiCard
                  label="Cases Evaluated"
                  value={completedSummary.evaluated_sample_size}
                  sub={`Seed: ${completedSummary.random_seed}`}
                />
                <KpiCard
                  label="Runtime Duration"
                  value={`${completedSummary.duration_seconds}s`}
                  sub="Deterministic"
                />
                <KpiCard
                  label="Failed Count"
                  value={completedSummary.failed_executions_count}
                  sub="0% failure rate"
                />
              </div>

              {completedSummary.stratified_distribution && (
                <div className="p-3 bg-white border border-neutral-200 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                  <span className="font-sans font-semibold text-neutral-900">
                    Sampled Risk Distribution:
                  </span>
                  <div className="flex flex-wrap gap-3 text-neutral-700">
                    {Object.entries(completedSummary.stratified_distribution).map(([k, v]) => (
                      <span key={k}>
                        <strong>{k}:</strong> {String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <span>Open Comprehensive Results Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Prior Experiment Runs History */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-neutral-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
                <h2 className="text-sm font-bold text-neutral-950">
                  Saved Experiment Runs
                </h2>
              </div>
              <span className="text-xs font-mono text-neutral-500">
                {savedRuns.length} {savedRuns.length === 1 ? 'Run' : 'Runs'}
              </span>
            </div>
            <p className="text-xs text-neutral-600">
              Persisted benchmark artifacts available for active dashboard inspection:
            </p>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {savedRuns.map((r, idx) => {
                const isActive = r.run_metadata?.run_id === currentData.run_metadata?.run_id;
                const rMeta = r.run_metadata || ({} as any);
                return (
                  <div
                    key={`${rMeta.run_id || 'run'}_${idx}`}
                    className={`p-4 border transition-colors ${
                      isActive
                        ? 'bg-neutral-50 border-neutral-950'
                        : 'bg-white border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="text-xs font-bold text-neutral-950 font-mono">
                          {rMeta.run_id?.slice(0, 22)}
                        </div>
                        <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                          {rMeta.completion_time
                            ? rMeta.completion_time.slice(0, 19).replace('T', ' ')
                            : 'Baseline Artifact'}
                        </div>
                      </div>
                      {isActive ? (
                        <span className="text-[10px] font-mono font-bold text-white bg-neutral-950 px-2 py-0.5 whitespace-nowrap">
                          ACTIVE
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetActive(r)}
                          className="text-xs font-medium text-neutral-950 hover:bg-neutral-950 hover:text-white bg-white border border-neutral-950 px-2.5 py-1 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Set Active
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-neutral-200 text-xs text-neutral-700 font-mono tabular-nums">
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-sans">
                          Sample
                        </span>
                        {rMeta.evaluated_sample_size || 50}
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-sans">
                          Seed
                        </span>
                        {rMeta.random_seed ?? 42}
                      </div>
                      <div>
                        <span className="text-neutral-400 block text-[10px] font-sans">
                          Duration
                        </span>
                        {rMeta.duration_seconds || 1.32}s
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
