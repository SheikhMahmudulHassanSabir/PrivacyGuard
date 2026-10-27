import React, { useState } from 'react';
import { Header, MethodBadge, DecisionBadge } from '../components/CommonComponents';
import { HybridDetector } from '../lib/detectors';
import {
  PIIvotMethod,
  PRvLMethod,
  PIIBenchMethod,
  PrivacyLensMethod,
  ConfAIDEMethod,
} from '../lib/methods';
import { MethodResult, PrivacyCase } from '../types/privacy';
import {
  Play,
  Sliders,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Terminal,
  FileText,
} from 'lucide-react';

export const InteractiveTestView: React.FC = () => {
  // Detector configuration
  const [useRegex, setUseRegex] = useState<boolean>(true);
  const [useNer, setUseNer] = useState<boolean>(true);

  // Form inputs
  const defaultText =
    'Rahul Sharma is a student. Reach him at rahul.sharma@gmail.com or call (95) 94215-7906. His studio is located at 97 Lincoln Street.';
  const [context, setContext] = useState<string>(defaultText);
  const [query, setQuery] = useState<string>("What is Rahul's email address?");
  const [recipient, setRecipient] = useState<string>('doctor');
  const [purpose, setPurpose] = useState<string>('treatment');
  const [methodChoice, setMethodChoice] = useState<string>('All Methods');

  // Results
  const [results, setResults] = useState<MethodResult[] | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Record<string, boolean>>({
    piivot: true,
    prvl: true,
    pii_bench: true,
    privacylens: true,
    confaide: true,
  });

  const toggleExpand = (name: string) => {
    setExpandedMethods((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleRun = (e: React.FormEvent) => {
    e.preventDefault();
    const detector = new HybridDetector({
      enableRegex: useRegex,
      enableNer: useNer,
      enableLlm: false,
    });

    const caseData: PrivacyCase = {
      case_id: 'test_' + Date.now().toString(36),
      context,
      query,
      recipient,
      purpose,
      entities: [],
    };

    const runList: MethodResult[] = [];
    const all = ['piivot', 'prvl', 'pii_bench', 'privacylens', 'confaide'];
    const chosen = methodChoice === 'All Methods' ? all : [methodChoice.toLowerCase()];

    for (const m of chosen) {
      if (m === 'piivot') runList.push(new PIIvotMethod(detector).run(caseData));
      else if (m === 'prvl') runList.push(new PRvLMethod(detector).run(caseData));
      else if (m === 'pii_bench') runList.push(new PIIBenchMethod(detector).run(caseData));
      else if (m === 'privacylens') runList.push(new PrivacyLensMethod(detector).run(caseData));
      else if (m === 'confaide') runList.push(new ConfAIDEMethod(detector).run(caseData));
    }

    setResults(runList);
  };

  return (
    <div className="space-y-8">
      <Header
        icon={<FlaskConical className="w-4 h-4 stroke-[1.75]" />}
        title="Interactive Privacy Protection Test"
        subtitle="Test individual text inputs live across all five privacy methods using the multi-stage Hybrid Detector."
        badgeText="Real-Time Testing"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Detector Configuration Sidebar */}
        <div className="lg:col-span-3 border border-neutral-200 bg-white p-5 space-y-5">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
            <Sliders className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
            <h2 className="font-bold text-neutral-950 text-sm">Detector Configuration</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="accent-neutral-950 w-4 h-4 mt-0.5 shrink-0"
              />
              <div>
                <span className="font-semibold text-neutral-950 block">Enable Regex Detector</span>
                <p className="text-neutral-500 text-[11px] mt-0.5 leading-relaxed">
                  Deterministic pattern matcher for Email, Phone, URL, and Username.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={useNer}
                onChange={(e) => setUseNer(e.target.checked)}
                className="accent-neutral-950 w-4 h-4 mt-0.5 shrink-0"
              />
              <div>
                <span className="font-semibold text-neutral-950 block">Enable NER Detector</span>
                <p className="text-neutral-500 text-[11px] mt-0.5 leading-relaxed">
                  Contextual sequence tagger for proper Names and Street Addresses.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-not-allowed opacity-60 text-xs">
              <input
                type="checkbox"
                checked={false}
                disabled
                className="accent-neutral-950 w-4 h-4 mt-0.5 shrink-0 cursor-not-allowed"
              />
              <div>
                <span className="font-semibold text-neutral-950 block">
                  Enable LLM Detector <span className="font-mono text-[10px] text-neutral-500 font-normal">(Unavailable in client)</span>
                </span>
                <p className="text-neutral-500 text-[11px] mt-0.5 leading-relaxed">
                  Requires backend LLM inference endpoint (inactive in client-only demo).
                </p>
              </div>
            </label>
          </div>

          <div className="p-3.5 bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 space-y-1">
            <span className="font-semibold text-neutral-950 block">Active Pipeline Mode</span>
            <p className="text-[11px] font-mono text-neutral-600 leading-relaxed">
              {useRegex && useNer
                ? 'Hybrid Ensemble (Regex + NER)'
                : useRegex
                ? 'Deterministic Regex Only'
                : useNer
                ? 'Contextual NER Only'
                : 'No Active Detectors'}
            </p>
          </div>
        </div>

        {/* Right: Input Case Specification & Execution Form */}
        <div className="lg:col-span-9 space-y-8">
          <form
            onSubmit={handleRun}
            className="bg-white border border-neutral-200 p-6 space-y-5"
          >
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
              <FileText className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
              <h2 className="text-sm font-bold text-neutral-950">
                Input Case Specification
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Context / Source Text
                  </label>
                  <textarea
                    rows={4}
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="w-full text-xs font-mono p-3 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950 leading-relaxed"
                    placeholder="Enter text containing sensitive entities..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Downstream Query (Used by PII-Bench for task relevance)
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
                    placeholder="e.g. What is Rahul's email address?"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Recipient
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
                    placeholder="e.g. doctor, employer, stranger"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Transmission Purpose
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
                    placeholder="e.g. treatment, advertising"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900 mb-1.5">
                    Method Selection
                  </label>
                  <select
                    value={methodChoice}
                    onChange={(e) => setMethodChoice(e.target.value)}
                    className="w-full text-xs p-2.5 bg-neutral-50 border border-neutral-300 focus:outline-none focus:border-neutral-950 focus:bg-white text-neutral-950"
                  >
                    <option value="All Methods">All Methods</option>
                    <option value="piivot">PIIvot · Pseudonymization</option>
                    <option value="prvl">PRvL · Logic Tokenization</option>
                    <option value="pii_bench">PII-Bench · Task-Selective</option>
                    <option value="privacylens">PrivacyLens · CI Audit</option>
                    <option value="confaide">ConfAIde · Risk Scoring</option>
                  </select>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Privacy Protection</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Results Section */}
          {results && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                <h3 className="text-sm font-bold text-neutral-950">Evaluation Output</h3>
                <span className="text-xs font-mono text-neutral-500">
                  {results.length} {results.length === 1 ? 'Method' : 'Methods'} Executed
                </span>
              </div>

              {results.map((res) => {
                const isExpanded = expandedMethods[res.method_name] !== false;
                return (
                  <div
                    key={res.method_name}
                    className="bg-white border border-neutral-200"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(res.method_name)}
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-neutral-50 hover:bg-neutral-100 border-b border-neutral-200 text-left transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Terminal className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
                        <MethodBadge method={res.method_name} />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-neutral-600 font-mono tabular-nums">
                          {res.latency_ms.toFixed(2)} ms
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-neutral-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-600" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-5 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div className="md:col-span-3 space-y-4">
                            {res.protected_text && (
                              <div>
                                <div className="text-xs font-semibold text-neutral-900 mb-1.5">
                                  Protected Output Text
                                </div>
                                <div className="p-3.5 bg-neutral-950 text-white font-mono text-xs overflow-x-auto leading-relaxed">
                                  {res.protected_text}
                                </div>
                              </div>
                            )}

                            {res.privacy_decision && (
                              <div className="flex items-center gap-3 text-xs">
                                <span className="font-semibold text-neutral-900">
                                  Normative Decision:
                                </span>
                                <DecisionBadge decision={res.privacy_decision} />
                              </div>
                            )}

                            {res.reasoning && (
                              <div className="p-3.5 bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 leading-relaxed">
                                <strong className="font-semibold text-neutral-950">
                                  Reasoning Proof:
                                </strong>{' '}
                                {res.reasoning}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-1 gap-2 border-t md:border-t-0 md:border-l border-neutral-200 pt-4 md:pt-0 md:pl-5">
                            <div className="p-2.5 bg-neutral-50 border border-neutral-200">
                              <div className="text-[11px] text-neutral-500">Execution Latency</div>
                              <div className="text-sm font-bold text-neutral-950 font-mono tabular-nums mt-0.5">
                                {res.latency_ms.toFixed(2)} ms
                              </div>
                            </div>

                            <div className="p-2.5 bg-neutral-50 border border-neutral-200">
                              <div className="text-[11px] text-neutral-500">Entities Detected</div>
                              <div className="text-sm font-bold text-neutral-950 font-mono tabular-nums mt-0.5">
                                {res.detected_entities.length}
                              </div>
                            </div>

                            <div className="p-2.5 bg-neutral-50 border border-neutral-200">
                              <div className="text-[11px] text-neutral-500">Entities Masked</div>
                              <div className="text-sm font-bold text-neutral-950 font-mono tabular-nums mt-0.5">
                                {res.masked_entities.length}
                              </div>
                            </div>

                            {res.kept_entities !== undefined && (
                              <div className="p-2.5 bg-neutral-50 border border-neutral-200">
                                <div className="text-[11px] text-neutral-500">Entities Kept</div>
                                <div className="text-sm font-bold text-neutral-950 font-mono tabular-nums mt-0.5">
                                  {res.kept_entities.length}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {res.detected_entities.length > 0 && (
                          <div className="space-y-2 pt-3 border-t border-neutral-200">
                            <h4 className="text-xs font-semibold text-neutral-950">
                              Detected Entity Spans
                            </h4>
                            <div className="border border-neutral-200 overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                                  <tr>
                                    <th className="py-2 px-3">Entity Text</th>
                                    <th className="py-2 px-3">PII Category</th>
                                    <th className="py-2 px-3 text-right">Character Span</th>
                                    <th className="py-2 px-3 text-right">Confidence</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 font-mono tabular-nums">
                                  {res.detected_entities.map((ent, idx) => (
                                    <tr key={idx} className="hover:bg-neutral-50">
                                      <td className="py-2 px-3 text-neutral-950 font-semibold">
                                        {ent.text}
                                      </td>
                                      <td className="py-2 px-3 text-neutral-700">
                                        {ent.pii_type}
                                      </td>
                                      <td className="py-2 px-3 text-neutral-500 text-right">
                                        [{ent.start}:{ent.end}]
                                      </td>
                                      <td className="py-2 px-3 text-neutral-950 text-right">
                                        {ent.confidence !== undefined
                                          ? ent.confidence.toFixed(2)
                                          : '1.00'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
