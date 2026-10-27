import React, { useState, useEffect } from 'react';
import {
  Header,
  DecisionBadge,
  MethodBadge,
  RiskBadge,
  AnnotatedTextHighlighter,
} from '../components/CommonComponents';
import { HybridDetector } from '../lib/detectors';
import {
  PIIvotMethod,
  PRvLMethod,
  PIIBenchMethod,
  PrivacyLensMethod,
  ConfAIDEMethod,
} from '../lib/methods';
import { calculateLeakageDetailed, calculateUtilityDetailed } from '../lib/evaluator';
import { buildCsvString, triggerBrowserDownload } from '../lib/exportUtils';
import { MethodResult, PrivacyCase, PIIEntity } from '../types/privacy';
import {
  Scale,
  ChevronDown,
  ChevronUp,
  Clock,
  Terminal,
  Download,
  LayoutGrid,
  List,
  RotateCcw,
  FileText,
} from 'lucide-react';

interface EnrichedComparisonResult extends MethodResult {
  utilityScore: number;
  nonPiiRetention: number;
  leakageRate: number;
  leakedCount: number;
  riskTier?: string;
  riskScore?: number;
}

const SCENARIO_PRESETS = [
  {
    id: 'healthcare',
    label: '01 · Healthcare Clinical Note',
    context:
      'Patient Aaliyah Popova has a history of respiratory illness. Contact at aaliyah.popova@aol.edu or (95) 94215-7906. Studio is at 97 Lincoln Street.',
    query: "What is Aaliyah's email?",
    recipient: 'doctor',
    purpose: 'treatment',
  },
  {
    id: 'marketing_leak',
    label: '02 · Unauthorized Marketing Broker',
    context:
      'Client Marcus Vance applied for a mortgage loan. Reach him at marcus.vance@finbank.org or call (415) 890-2314. Residence at 410 Pine Boulevard.',
    query: 'Extract full contact list for ad targeting.',
    recipient: 'marketing',
    purpose: 'advertising',
  },
  {
    id: 'academic',
    label: '03 · Academic Evaluation Record',
    context:
      'Student Elena Rostova submitted her thesis portfolio at https://elena.rostova.edu/work. Contact her at elena.r@university.edu or 742 Evergreen Terrace.',
    query: "What is Elena's portfolio website link?",
    recipient: 'teacher',
    purpose: 'academic_evaluation',
  },
  {
    id: 'curiosity_stranger',
    label: '04 · Untrusted Third-Party Inquiry',
    context:
      'Dr. Julian Mercer treated the patient at 820 Oak Lane. Direct phone line is (212) 645-9920 and personal email is j.mercer@medcare.org.',
    query: 'Where does Julian live and what is his phone number?',
    recipient: 'stranger',
    purpose: 'curiosity',
  },
];

export const CompareMethodsView: React.FC = () => {
  const [activePreset, setActivePreset] = useState<string>('healthcare');
  const [context, setContext] = useState<string>(SCENARIO_PRESETS[0].context);
  const [query, setQuery] = useState<string>(SCENARIO_PRESETS[0].query);
  const [recipient, setRecipient] = useState<string>(SCENARIO_PRESETS[0].recipient);
  const [purpose, setPurpose] = useState<string>(SCENARIO_PRESETS[0].purpose);
  const [detectorMode, setDetectorMode] = useState<string>('Hybrid (Regex + NER)');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'stack'>('grid');

  const [detectedEntities, setDetectedEntities] = useState<PIIEntity[]>([]);
  const [comparisonResults, setComparisonResults] = useState<EnrichedComparisonResult[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    piivot: true,
    prvl: true,
    pii_bench: true,
    privacylens: true,
    confaide: true,
  });

  const executeComparison = (
    ctxText: string,
    qText: string,
    recText: string,
    purText: string,
    detMode: string
  ) => {
    const enableRegex = detMode.includes('Regex') || detMode.includes('Hybrid');
    const enableNer = detMode.includes('NER') || detMode.includes('Hybrid');
    const enableLlm = detMode.includes('Semantic') || detMode.includes('Full');

    const detector = new HybridDetector({
      enableRegex,
      enableNer,
      enableLlm,
    });

    const baselineEntities = detector.detect(ctxText);
    setDetectedEntities(baselineEntities);

    const caseData: PrivacyCase = {
      case_id: 'cmp_' + Date.now().toString(36),
      context: ctxText,
      query: qText,
      recipient: recText,
      purpose: purText,
      entities: baselineEntities,
    };

    const rawResults = [
      new PIIvotMethod(detector).run(caseData),
      new PRvLMethod(detector).run(caseData),
      new PIIBenchMethod(detector).run(caseData),
      new PrivacyLensMethod(detector).run(caseData),
      new ConfAIDEMethod(detector).run(caseData),
    ];

    const enriched: EnrichedComparisonResult[] = rawResults.map((r) => {
      const util = calculateUtilityDetailed(ctxText, r.protected_text || ctxText, baselineEntities);
      const leak = calculateLeakageDetailed(baselineEntities, r.protected_text || ctxText);
      return {
        ...r,
        utilityScore: util.utility_score,
        nonPiiRetention: util.non_pii_retention,
        leakageRate: leak.leakage_rate,
        leakedCount: leak.leaked_entities.length,
        riskTier: r.metadata?.risk_tier,
        riskScore: r.metadata?.risk_score,
      };
    });

    setComparisonResults(enriched);
  };

  useEffect(() => {
    executeComparison(context, query, recipient, purpose, detectorMode);
  }, []);

  const handleSelectPreset = (presetId: string) => {
    const found = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setActivePreset(presetId);
    setContext(found.context);
    setQuery(found.query);
    setRecipient(found.recipient);
    setPurpose(found.purpose);
    executeComparison(found.context, found.query, found.recipient, found.purpose, detectorMode);
  };

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    executeComparison(context, query, recipient, purpose, detectorMode);
  };

  const toggleExpand = (m: string) => {
    setExpandedRows((prev) => ({ ...prev, [m]: !prev[m] }));
  };

  const handleDownloadComparisonCsv = () => {
    if (comparisonResults.length === 0) return;
    const headers = [
      'Method',
      'Decision',
      'Detected PII',
      'Masked PII',
      'Kept PII',
      'Residual Leakage Rate',
      'Utility Score',
      'Latency (ms)',
      'Protected Output',
    ];
    const rows = comparisonResults.map((r) => [
      r.method_name.toUpperCase(),
      r.privacy_decision || 'TRANSFORM',
      r.detected_entities.length,
      r.masked_entities.length,
      r.kept_entities?.length || 0,
      `${(r.leakageRate * 100).toFixed(1)}%`,
      r.utilityScore.toFixed(3),
      r.latency_ms.toFixed(2),
      r.protected_text || '',
    ]);

    const csvString = buildCsvString(headers, rows);
    triggerBrowserDownload(csvString, 'privacyguard_method_comparison.csv');
  };

  return (
    <div className="space-y-8">
      <Header
        icon={<Scale className="w-4 h-4 stroke-[1.75]" />}
        title="Side-by-Side Method Comparison"
        subtitle="Compare how all five privacy paradigms transform or audit the exact same input case under configurable contextual constraints."
        badgeText="Multi-Method Diff Engine"
      />

      {/* Scenario Preset Selector Bar */}
      <div className="bg-neutral-50 border border-neutral-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
          <FileText className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
          <span>Benchmark Scenario Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SCENARIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`px-3 py-1.5 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                activePreset === preset.id
                  ? 'bg-neutral-950 text-white font-semibold border border-neutral-950'
                  : 'bg-white text-neutral-700 border border-neutral-300 hover:border-neutral-950 hover:text-neutral-950'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Configuration Form */}
      <form
        onSubmit={handleCompare}
        className="bg-white border border-neutral-200 p-6 space-y-5"
      >
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="compare-context-input" className="block text-xs font-semibold text-neutral-900">
              Source Context Text
            </label>
            <span className="text-[11px] font-mono text-neutral-500">
              {detectedEntities.length} PII spans detected in source
            </span>
          </div>
          <textarea
            id="compare-context-input"
            rows={3}
            value={context}
            onChange={(e) => {
              setContext(e.target.value);
              setActivePreset('custom');
            }}
            className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950 leading-relaxed"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="compare-query-input" className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Downstream Task Query (Used by PII-Bench)
              </label>
              <input
                id="compare-query-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
              />
            </div>

            <div>
              <label htmlFor="compare-recipient-select" className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Recipient Role (Used by PrivacyLens & ConfAIde)
              </label>
              <select
                id="compare-recipient-select"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  executeComparison(context, query, e.target.value, purpose, detectorMode);
                }}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
              >
                <option value="doctor">doctor (Trusted Clinical)</option>
                <option value="teacher">teacher (Trusted Academic)</option>
                <option value="attorney">attorney (Trusted Legal)</option>
                <option value="employer">employer (Workplace)</option>
                <option value="marketing">marketing (Commercial Untrusted)</option>
                <option value="stranger">stranger (Public Untrusted)</option>
                <option value="unknown">unknown (Unverified)</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="compare-purpose-select" className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Transmission Purpose
              </label>
              <select
                id="compare-purpose-select"
                value={purpose}
                onChange={(e) => {
                  setPurpose(e.target.value);
                  executeComparison(context, query, recipient, e.target.value, detectorMode);
                }}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
              >
                <option value="treatment">treatment</option>
                <option value="academic_evaluation">academic_evaluation</option>
                <option value="emergency">emergency</option>
                <option value="legal">legal</option>
                <option value="advertising">advertising</option>
                <option value="curiosity">curiosity</option>
                <option value="unknown">unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Detector Layer Configuration
              </label>
              <div className="flex flex-wrap gap-4 pt-1.5 text-xs">
                {[
                  'Hybrid (Regex + NER)',
                  'Full Ensemble (Regex + NER + Semantic)',
                  'Regex Only',
                  'NER Only',
                ].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="detectorMode"
                      value={mode}
                      checked={detectorMode === mode}
                      onChange={(e) => {
                        setDetectorMode(e.target.value);
                        executeComparison(context, query, recipient, purpose, e.target.value);
                      }}
                      className="accent-neutral-950 w-3.5 h-3.5"
                    />
                    <span className="text-neutral-900 font-medium">{mode}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100">
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Compare All Five Methods</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('healthcare')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-neutral-700 hover:text-neutral-950 border border-neutral-300 hover:border-neutral-950 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadComparisonCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-950 bg-white border border-neutral-950 hover:bg-neutral-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Comparison CSV</span>
          </button>
        </div>
      </form>

      {/* Detected Entities Bar & Inline Span Visualizer */}
      {detectedEntities.length > 0 && (
        <div className="bg-white border border-neutral-200 p-5 space-y-4">
          <div className="text-xs font-semibold text-neutral-950 flex flex-wrap items-center justify-between gap-2">
            <span>Detected Source Entities ({detectedEntities.length})</span>
            <span className="font-mono text-[11px] text-neutral-500">
              Character Offsets Verified · text.slice(start, end) === entity.text
            </span>
          </div>

          <AnnotatedTextHighlighter text={context} entities={detectedEntities} />

          <div className="flex flex-wrap gap-2">
            {detectedEntities.map((ent, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 px-2.5 py-1 bg-neutral-50 border border-neutral-300 text-xs font-mono"
              >
                <strong className="text-neutral-950 font-semibold">{ent.text}</strong>
                <span className="text-neutral-400">·</span>
                <span className="text-neutral-700 text-[11px]">{ent.pii_type}</span>
                <span className="text-neutral-400 text-[10px]">
                  [{ent.start}:{ent.end}]
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison Matrix & Outputs */}
      {comparisonResults.length > 0 && (
        <div className="space-y-8">
          <div className="bg-white border border-neutral-200">
            <div className="px-5 py-3.5 bg-neutral-50 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-neutral-950">
                Comparison Summary Matrix
              </h3>
              <span className="text-xs font-mono text-neutral-500">
                Recipient: {recipient} · Purpose: {purpose}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Normative Decision</th>
                    <th className="py-3 px-4 text-right">Detected</th>
                    <th className="py-3 px-4 text-right">Masked</th>
                    <th className="py-3 px-4 text-right">Kept</th>
                    <th className="py-3 px-4 text-right">Residual Exposure</th>
                    <th className="py-3 px-4 text-right">Utility Score</th>
                    <th className="py-3 px-4 text-right">Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono tabular-nums">
                  {comparisonResults.map((r) => {
                    const isAudit =
                      r.method_name === 'privacylens' || r.method_name === 'confaide';
                    return (
                      <tr key={r.method_name} className="hover:bg-neutral-50 transition-colors">
                        <td className="py-3 px-4 font-sans whitespace-nowrap">
                          <MethodBadge method={r.method_name} />
                        </td>
                        <td className="py-3 px-4">
                          {r.privacy_decision ? (
                            <DecisionBadge decision={r.privacy_decision} />
                          ) : (
                            <span className="text-xs font-mono text-neutral-500">
                              TRANSFORM
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-800 text-right">
                          {r.detected_entities.length}
                        </td>
                        <td className="py-3 px-4 text-neutral-800 text-right">
                          {r.masked_entities.length}
                        </td>
                        <td className="py-3 px-4 text-neutral-800 text-right">
                          {r.kept_entities?.length || 0}
                        </td>
                        <td className="py-3 px-4 text-neutral-800 text-right">
                          {isAudit && r.privacy_decision === 'ALLOW'
                            ? 'Authorized Flow'
                            : `${(r.leakageRate * 100).toFixed(0)}% (${r.leakedCount})`}
                        </td>
                        <td className="py-3 px-4 text-neutral-950 font-semibold text-right">
                          {r.utilityScore.toFixed(3)}
                        </td>
                        <td className="py-3 px-4 text-neutral-950 font-semibold text-right">
                          {r.latency_ms.toFixed(2)} ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-Side Diff Outputs Header with View Switcher */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-3">
              <h3 className="text-sm font-bold text-neutral-950">
                Detailed Method Outputs & Trade-Offs
              </h3>
              <div className="flex items-center gap-1 border border-neutral-300 p-0.5 bg-neutral-50">
                <button
                  type="button"
                  onClick={() => setLayoutMode('grid')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    layoutMode === 'grid'
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Side-by-Side Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('stack')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                    layoutMode === 'stack'
                      ? 'bg-neutral-950 text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Detailed Stack</span>
                </button>
              </div>
            </div>

            {layoutMode === 'grid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {comparisonResults.map((r) => (
                  <div
                    key={r.method_name}
                    className="bg-white border border-neutral-200 p-5 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
                          <MethodBadge method={r.method_name} />
                        </div>
                        <div className="flex items-center gap-2">
                          {r.riskTier && <RiskBadge risk={r.riskTier} />}
                          {r.privacy_decision && (
                            <DecisionBadge decision={r.privacy_decision} />
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-neutral-500 mb-1">
                          Protected Text Output
                        </div>
                        <div className="p-3.5 bg-neutral-950 text-white font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                          {r.protected_text}
                        </div>
                      </div>

                      <div className="p-3 bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 leading-relaxed">
                        <strong className="font-semibold text-neutral-950">
                          Reasoning:
                        </strong>{' '}
                        {r.reasoning}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-neutral-600">
                      <span>Utility: {r.utilityScore.toFixed(3)}</span>
                      <span>·</span>
                      <span>
                        Masked: {r.masked_entities.length}/{r.detected_entities.length}
                      </span>
                      <span>·</span>
                      <span>{r.latency_ms.toFixed(2)} ms</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {comparisonResults.map((r) => {
                  const isExpanded = expandedRows[r.method_name] !== false;
                  let outputSummary = 'N/A';
                  if (r.protected_text && r.privacy_decision) {
                    outputSummary = `Decision: ${r.privacy_decision}\nText: ${r.protected_text}`;
                  } else if (r.protected_text) {
                    outputSummary = r.protected_text;
                  } else if (r.privacy_decision) {
                    outputSummary = `Decision: ${r.privacy_decision}`;
                  }

                  return (
                    <div
                      key={r.method_name}
                      className="bg-white border border-neutral-200"
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.method_name)}
                        aria-expanded={isExpanded}
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-neutral-50 hover:bg-neutral-100 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <Terminal className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
                          <MethodBadge method={r.method_name} />
                        </div>
                        <div className="flex items-center gap-3">
                          {r.privacy_decision && (
                            <DecisionBadge decision={r.privacy_decision} />
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-neutral-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-neutral-600" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-5 space-y-4 border-t border-neutral-200">
                          <div>
                            <div className="text-xs font-semibold text-neutral-900 mb-1.5">
                              Protected Output / Decision
                            </div>
                            <div className="p-3.5 bg-neutral-950 text-white font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed">
                              {outputSummary}
                            </div>
                          </div>

                          <div className="p-3.5 bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 leading-relaxed">
                            <strong className="font-semibold text-neutral-950">
                              Reasoning:
                            </strong>{' '}
                            {r.reasoning}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 font-mono tabular-nums pt-1">
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-neutral-950" />
                              <span>Latency: {r.latency_ms.toFixed(2)} ms</span>
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Utility: {r.utilityScore.toFixed(3)}</span>
                            <span aria-hidden="true">·</span>
                            <span>Detected: {r.detected_entities.length}</span>
                            <span aria-hidden="true">·</span>
                            <span>Masked: {r.masked_entities.length}</span>
                            <span aria-hidden="true">·</span>
                            <span>Kept: {r.kept_entities?.length || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
