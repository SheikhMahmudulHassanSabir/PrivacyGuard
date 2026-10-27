import React, { useState } from 'react';
import { Header, DecisionBadge, MethodBadge } from '../components/CommonComponents';
import { HybridDetector } from '../lib/detectors';
import {
  PIIvotMethod,
  PRvLMethod,
  PIIBenchMethod,
  PrivacyLensMethod,
  ConfAIDEMethod,
} from '../lib/methods';
import { MethodResult, PrivacyCase } from '../types/privacy';
import { Scale, ChevronDown, ChevronUp, Clock, Terminal } from 'lucide-react';

export const CompareMethodsView: React.FC = () => {
  const defaultContext =
    'Patient Aaliyah Popova has a history of respiratory illness. Contact at aaliyah.popova@aol.edu or (95) 94215-7906. Studio is at 97 Lincoln Street.';

  const [context, setContext] = useState<string>(defaultContext);
  const [query, setQuery] = useState<string>("What is Aaliyah's email?");
  const [recipient, setRecipient] = useState<string>('doctor');
  const [purpose, setPurpose] = useState<string>('treatment');
  const [detectorMode, setDetectorMode] = useState<string>('Hybrid (Regex + NER)');

  const [comparisonResults, setComparisonResults] = useState<MethodResult[] | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    piivot: true,
    prvl: true,
    pii_bench: true,
    privacylens: true,
    confaide: true,
  });

  const toggleExpand = (m: string) => {
    setExpandedRows((prev) => ({ ...prev, [m]: !prev[m] }));
  };

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();

    const enableRegex = detectorMode.includes('Regex') || detectorMode.includes('Hybrid');
    const enableNer = detectorMode.includes('NER') || detectorMode.includes('Hybrid');

    const detector = new HybridDetector({
      enableRegex,
      enableNer,
      enableLlm: false,
    });

    const caseData: PrivacyCase = {
      case_id: 'cmp_' + Date.now().toString(36),
      context,
      query,
      recipient,
      purpose,
      entities: [],
    };

    const res1 = new PIIvotMethod(detector).run(caseData);
    const res2 = new PRvLMethod(detector).run(caseData);
    const res3 = new PIIBenchMethod(detector).run(caseData);
    const res4 = new PrivacyLensMethod(detector).run(caseData);
    const res5 = new ConfAIDEMethod(detector).run(caseData);

    setComparisonResults([res1, res2, res3, res4, res5]);
  };

  return (
    <div className="space-y-8">
      <Header
        icon={<Scale className="w-4 h-4 stroke-[1.75]" />}
        title="Side-by-Side Method Comparison"
        subtitle="Compare how all five privacy methods respond to the exact same input case and contextual constraints."
        badgeText="Multi-Method Diff"
      />

      {/* Form */}
      <form
        onSubmit={handleCompare}
        className="bg-white border border-neutral-200 p-6 space-y-5"
      >
        <div>
          <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
            Source Text
          </label>
          <textarea
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950 leading-relaxed"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Downstream Query
              </label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Recipient
              </label>
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
              >
                <option value="doctor">doctor</option>
                <option value="teacher">teacher</option>
                <option value="employer">employer</option>
                <option value="marketing">marketing</option>
                <option value="stranger">stranger</option>
                <option value="unknown">unknown</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Transmission Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
              >
                <option value="treatment">treatment</option>
                <option value="academic_evaluation">academic_evaluation</option>
                <option value="emergency">emergency</option>
                <option value="advertising">advertising</option>
                <option value="curiosity">curiosity</option>
                <option value="unknown">unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                Detector Mode
              </label>
              <div className="flex flex-wrap gap-5 pt-1.5 text-xs">
                {['Hybrid (Regex + NER)', 'Regex Only', 'NER Only'].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="detectorMode"
                      value={mode}
                      checked={detectorMode === mode}
                      onChange={(e) => setDetectorMode(e.target.value)}
                      className="accent-neutral-950 w-3.5 h-3.5"
                    />
                    <span className="text-neutral-900 font-medium">{mode}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Compare All Five Methods</span>
          </button>
        </div>
      </form>

      {/* Comparison Table & Expanders */}
      {comparisonResults && (
        <div className="space-y-8">
          <div className="bg-white border border-neutral-200">
            <div className="px-5 py-3.5 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-bold text-neutral-950">
                Comparison Summary Matrix
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                  <tr>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Privacy Decision</th>
                    <th className="py-3 px-4 text-right">Detected PII</th>
                    <th className="py-3 px-4 text-right">Masked PII</th>
                    <th className="py-3 px-4 text-right">Kept PII</th>
                    <th className="py-3 px-4 text-right">Latency (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-mono tabular-nums">
                  {comparisonResults.map((r) => (
                    <tr key={r.method_name} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-3 px-4 font-sans">
                        <MethodBadge method={r.method_name} />
                      </td>
                      <td className="py-3 px-4">
                        <DecisionBadge decision={r.privacy_decision} />
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
                      <td className="py-3 px-4 text-neutral-950 font-semibold text-right">
                        {r.latency_ms.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-950">
              Detailed Method Outputs & Trade-Offs
            </h3>
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
                    className="w-full flex items-center justify-between px-5 py-3.5 bg-neutral-50 hover:bg-neutral-100 text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Terminal className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
                      <MethodBadge method={r.method_name} />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-neutral-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-600" />
                    )}
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
                        <strong className="font-semibold text-neutral-950">Reasoning:</strong>{' '}
                        {r.reasoning}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 font-mono tabular-nums pt-1">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-950" />
                          <span>Latency: {r.latency_ms.toFixed(2)} ms</span>
                        </span>
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
        </div>
      )}
    </div>
  );
};
