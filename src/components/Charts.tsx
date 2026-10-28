import React from 'react';
import { CategoryScore, MethodMetrics } from '../types/privacy';
import { BarChart2, Crosshair, PieChart } from 'lucide-react';

export const CategoryPerformanceChart: React.FC<{ byCategory: Record<string, CategoryScore> }> = ({
  byCategory,
}) => {
  const categories = Object.keys(byCategory);
  if (categories.length === 0) return null;

  return (
    <div className="bg-white border border-neutral-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-neutral-100">
        <h4 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
          <span>Detector Performance Across PII Categories</span>
        </h4>
        <div className="flex items-center gap-4 text-xs text-neutral-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-neutral-950 inline-block border border-neutral-950"></span>
            <span>Precision</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 pattern-diagonal-lines inline-block border border-neutral-950"></span>
            <span>Recall</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-neutral-400 inline-block border border-neutral-950"></span>
            <span>F1-Score</span>
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const s = byCategory[cat];
          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex justify-between items-baseline text-xs">
                <span className="font-mono font-semibold text-neutral-950">{cat}</span>
                <span className="text-neutral-500 font-mono tabular-nums text-[11px]">
                  F1: <strong className="text-neutral-950 font-semibold">{s.f1.toFixed(3)}</strong>
                  {' · '}P: {s.precision.toFixed(2)}
                  {' · '}R: {s.recall.toFixed(2)}
                  {' · '}Support: {s.support}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 h-3.5 bg-neutral-50 border border-neutral-200 p-0.5">
                <div
                  className="bg-neutral-950 transition-all"
                  style={{ width: `${Math.round(s.precision * 100)}%` }}
                  title={`Precision: ${s.precision}`}
                />
                <div
                  className="pattern-diagonal-lines border-r border-neutral-950 transition-all"
                  style={{ width: `${Math.round(s.recall * 100)}%` }}
                  title={`Recall: ${s.recall}`}
                />
                <div
                  className="bg-neutral-400 border-r border-neutral-950 transition-all"
                  style={{ width: `${Math.round(s.f1 * 100)}%` }}
                  title={`F1: ${s.f1}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const LeakageBarChart: React.FC<{
  methods: MethodMetrics[];
  metricKey: 'leakage_rate' | 'cases_with_leakage_pct' | 'context_accuracy' | 'utility_score';
  title: string;
  isPercent?: boolean;
  scaleToPercent?: boolean;
}> = ({ methods, metricKey, title, isPercent = false, scaleToPercent = false }) => {
  const validMethods = methods.filter((m) => m[metricKey] !== null && m[metricKey] !== undefined);
  if (validMethods.length === 0) return null;

  const patternStyles: Record<string, string> = {
    piivot: 'bg-neutral-950',
    prvl: 'pattern-diagonal-lines border-r border-neutral-950',
    pii_bench: 'bg-neutral-500 border-r border-neutral-950',
    privacylens: 'bg-neutral-800 border-r border-neutral-950',
    confaide: 'bg-neutral-300 border-r border-neutral-950',
  };

  return (
    <div className="bg-white border border-neutral-200 p-5">
      <h4 className="text-sm font-semibold text-neutral-950 mb-4 pb-3 border-b border-neutral-100">
        {title}
      </h4>
      <div className="space-y-4">
        {validMethods.map((m) => {
          const val = Number(m[metricKey] ?? 0);
          const displayVal = isPercent
            ? `${val.toFixed(1)}%`
            : scaleToPercent
            ? `${(val * 100).toFixed(1)}%`
            : val.toFixed(3);
          const barWidth = isPercent
            ? Math.min(100, Math.max(2, val))
            : Math.min(100, Math.max(2, val * 100));

          return (
            <div key={m.method_name}>
              <div className="flex justify-between text-xs font-medium mb-1.5 text-neutral-800">
                <span className="font-mono font-semibold text-neutral-950">
                  {m.method_name.toUpperCase()}
                </span>
                <span className="font-mono tabular-nums text-neutral-950 font-semibold">
                  {displayVal}
                </span>
              </div>
              <div className="w-full bg-neutral-50 border border-neutral-200 h-3.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    patternStyles[m.method_name.toLowerCase()] || 'bg-neutral-950'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TradeoffScatterChart: React.FC<{ methods: MethodMetrics[] }> = ({ methods }) => {
  const validMethods = methods.filter(
    (m) =>
      m.leakage_rate !== null &&
      m.utility_score !== null &&
      m.leakage_rate !== undefined &&
      m.utility_score !== undefined
  );

  // Distinct monochrome marker styles for all 5 methods
  const markerMap: Record<string, string> = {
    piivot: 'bg-neutral-950 border-2 border-neutral-950 rounded-full',
    prvl: 'bg-white border-2 border-neutral-950 rounded-none',
    pii_bench: 'pattern-diagonal-lines border-2 border-neutral-950 rounded-full',
    privacylens: 'bg-neutral-950 border-2 border-neutral-950 rotate-45 rounded-none',
    confaide: 'bg-neutral-300 border-2 border-neutral-950 rounded-none',
  };

  return (
    <div className="bg-white border border-neutral-200 p-5">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b border-neutral-100">
        <h4 className="text-sm font-semibold text-neutral-950 flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
          <span>Privacy–Utility Trade-Off Quadrant (All 5 Methods)</span>
        </h4>
        <span className="text-xs font-mono text-neutral-600">
          Target Quadrant · Top-Left (Low Leakage, High Utility)
        </span>
      </div>

      <div className="relative border border-neutral-300 p-6 bg-neutral-50 h-72 flex flex-col justify-between overflow-hidden">
        {/* Subtle crosshairs */}
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-200 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-neutral-200 pointer-events-none" />

        <div className="absolute top-2.5 right-3 text-[10px] font-mono text-neutral-500">
          High Utility (1.000)
        </div>
        <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-neutral-500">
          Higher Leakage (100%)
        </div>
        <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-neutral-950 font-semibold">
          Zero Leakage (0.0%)
        </div>

        <div className="relative w-full h-full">
          {validMethods.map((m, idx) => {
            const leak = m.leakage_rate ?? 0;
            const util = m.utility_score ?? 0.9;
            // Spread closely clustered points slightly so all 5 markers and labels are legible
            const baseLeft = Math.max(14, Math.min(84, leak * 85 + 12));
            const baseTop = Math.max(14, Math.min(82, (1.0 - util) * 450 + 18));
            const jitterX = (idx - 2) * 3.5;
            const jitterY = (idx % 2 === 0 ? -1 : 1) * (idx * 3.5);
            const leftPct = Math.max(12, Math.min(86, baseLeft + jitterX));
            const topPct = Math.max(12, Math.min(84, baseTop + jitterY));

            const markerClass =
              markerMap[m.method_name.toLowerCase()] ||
              'bg-neutral-950 border-2 border-neutral-950 rounded-full';

            return (
              <div
                key={m.method_name}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 transition group hover:z-20"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                title={`${m.method_name.toUpperCase()} — Utility: ${util.toFixed(3)}, Leakage Rate: ${(leak * 100).toFixed(1)}%, Context Acc: ${((m.context_accuracy ?? 0) * 100).toFixed(1)}%`}
              >
                <div className={`w-3.5 h-3.5 ${markerClass}`} />
                <div className="mt-1 bg-white/95 border border-neutral-900 text-neutral-950 text-[10px] font-mono font-semibold px-1.5 py-0.5 whitespace-nowrap shadow-xs">
                  {m.method_name.toUpperCase()} · U:{util.toFixed(3)} · L:{(leak * 100).toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-[11px] font-mono text-neutral-500 mt-2.5 text-center">
        X-Axis: Residual Leakage Rate (0.0% Left → 100.0% Right) · Y-Axis: Downstream Utility Score (0.000 → 1.000)
      </div>
    </div>
  );
};

export const DecisionDonutChart: React.FC<{ distribution: Record<string, number> }> = ({
  distribution,
}) => {
  const allowCount = distribution['ALLOW'] || 0;
  const denyCount = distribution['DENY'] || 0;
  const total = allowCount + denyCount;
  if (total === 0) return null;

  const allowPct = Math.round((allowCount / total) * 100);
  const denyPct = Math.round((denyCount / total) * 100);

  return (
    <div className="bg-white border border-neutral-200 p-5">
      <h4 className="text-sm font-semibold text-neutral-950 mb-4 pb-3 border-b border-neutral-100 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-neutral-950 stroke-[1.75]" />
        <span>Normative Decision Distribution (ALLOW vs. DENY)</span>
      </h4>

      <div className="space-y-4 py-2">
        {/* Stacked monochrome bar */}
        <div className="w-full h-8 border border-neutral-950 flex overflow-hidden">
          <div
            className="bg-white h-full flex items-center justify-center text-xs font-mono font-bold text-neutral-950 border-r border-neutral-950"
            style={{ width: `${allowPct}%` }}
          >
            {allowPct > 12 && `ALLOW ${allowPct}%`}
          </div>
          <div
            className="bg-neutral-950 h-full flex items-center justify-center text-xs font-mono font-bold text-white"
            style={{ width: `${denyPct}%` }}
          >
            {denyPct > 12 && `DENY ${denyPct}%`}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="border border-neutral-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border border-neutral-950 bg-white inline-block" />
              <span className="text-xs font-mono font-semibold text-neutral-950">ALLOW</span>
            </div>
            <span className="text-xs font-mono tabular-nums text-neutral-600">
              {allowCount} cases ({allowPct}%)
            </span>
          </div>

          <div className="border border-neutral-200 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 border border-neutral-950 bg-neutral-950 inline-block" />
              <span className="text-xs font-mono font-semibold text-neutral-950">DENY</span>
            </div>
            <span className="text-xs font-mono tabular-nums text-neutral-600">
              {denyCount} cases ({denyPct}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
