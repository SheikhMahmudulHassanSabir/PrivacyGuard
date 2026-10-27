import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Check,
  X,
  AlertCircle,
  Minus,
} from 'lucide-react';
import { DatasetValidationReport, PIIEntity } from '../types/privacy';
import { prepareSafeReplacementSpans } from '../lib/methods';

interface HeaderProps {
  title: string;
  subtitle: string;
  badgeText?: string;
  icon?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, badgeText, icon }) => {
  return (
    <div className="mb-8 pb-5 border-b border-neutral-200">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 border border-neutral-900 bg-neutral-950 text-white flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950 tracking-tight">
            {title}
          </h1>
        </div>
        {badgeText && (
          <div className="text-xs font-mono text-neutral-500 flex items-center gap-2 shrink-0">
            <span>Benchmark Edition</span>
            <span aria-hidden="true">·</span>
            <span className="text-neutral-900 font-medium">{badgeText}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-neutral-600 mt-2 max-w-3xl leading-relaxed">{subtitle}</p>
    </div>
  );
};

export const DatasetBanner: React.FC<{ report: DatasetValidationReport }> = ({ report }) => {
  if (report?.valid) {
    return (
      <div className="bg-neutral-50 border border-neutral-200 px-4 py-3 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-neutral-950 shrink-0 stroke-[1.75]" />
          <span className="text-xs sm:text-sm text-neutral-900 font-medium">
            Dataset Verified:{' '}
            <strong className="font-mono font-semibold tabular-nums">
              {report.total_csv_records?.toLocaleString() || '4,434'}
            </strong>{' '}
            cases &{' '}
            <strong className="font-mono font-semibold tabular-nums">
              {report.total_entities?.toLocaleString() || '22,226'}
            </strong>{' '}
            annotated ground-truth entities
          </span>
        </div>
        <div className="text-xs text-neutral-500 font-mono flex items-center gap-2">
          <span>Dataset Fingerprint</span>
          <span aria-hidden="true">·</span>
          <span className="text-neutral-900">
            {report.fingerprint || 'csv_e28fb80c1095_json_f4229455a3e3'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 border border-neutral-900 p-4 mb-8">
      <div className="flex items-center gap-2 text-neutral-950 font-semibold text-sm">
        <AlertTriangle className="w-4 h-4 text-neutral-950 shrink-0" />
        <span>Dataset Integrity Notice</span>
      </div>
      <p className="text-xs text-neutral-600 mt-1">
        {report?.errors?.[0] || 'Dataset verification in progress or baseline artifact loaded.'}
      </p>
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  helpText?: string;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  helpText,
  icon,
}) => {
  return (
    <div
      className="bg-white border border-neutral-200 p-5 transition-colors hover:border-neutral-900"
      title={helpText}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon && <span className="text-neutral-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-neutral-950 font-mono tabular-nums tracking-tight leading-none">
        {value}
      </div>
      {sub && (
        <div className="text-xs text-neutral-500 mt-2.5 pt-2.5 border-t border-neutral-100 font-mono tabular-nums">
          {sub}
        </div>
      )}
    </div>
  );
};

export const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const m = (method || '').toLowerCase();
  const map: Record<string, { name: string; role: string }> = {
    piivot: { name: 'PIIvot', role: 'Pseudonymization' },
    prvl: { name: 'PRvL', role: 'Logic Tokenization' },
    pii_bench: { name: 'PII-Bench', role: 'Task-Selective' },
    privacylens: { name: 'PrivacyLens', role: 'CI Audit' },
    confaide: { name: 'ConfAIde', role: 'Risk Scoring' },
  };

  const entry = map[m];
  if (!entry) {
    return (
      <span className="text-xs font-mono font-semibold text-neutral-900">
        {method.toUpperCase()}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <strong className="font-semibold text-neutral-950">{entry.name}</strong>
      <span className="text-neutral-400" aria-hidden="true">
        ·
      </span>
      <span className="text-neutral-600 font-normal">{entry.role}</span>
    </span>
  );
};

export const DecisionBadge: React.FC<{ decision?: string }> = ({ decision }) => {
  const d = (decision || 'N/A').toUpperCase();
  if (d === 'ALLOW') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-semibold bg-white text-neutral-950 border border-neutral-900 whitespace-nowrap shrink-0">
        <Check className="w-3 h-3 stroke-[2.5]" />
        <span>ALLOW</span>
      </span>
    );
  }
  if (d === 'DENY') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-semibold bg-neutral-950 text-white border border-neutral-950 whitespace-nowrap shrink-0">
        <X className="w-3 h-3 stroke-[2.5]" />
        <span>DENY</span>
      </span>
    );
  }
  if (d === 'ERROR') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-semibold bg-neutral-100 text-neutral-950 border border-dashed border-neutral-900 whitespace-nowrap shrink-0">
        <AlertCircle className="w-3 h-3 stroke-[2]" />
        <span>ERROR</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-neutral-500 whitespace-nowrap shrink-0">
      <Minus className="w-3 h-3" />
      <span>{d}</span>
    </span>
  );
};

export const RiskBadge: React.FC<{ risk?: string }> = ({ risk }) => {
  const r = (risk || 'NONE').toUpperCase();
  switch (r) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold bg-neutral-950 text-white border border-neutral-950 whitespace-nowrap shrink-0">
          CRITICAL RISK
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold bg-white text-neutral-950 border-2 border-neutral-950 whitespace-nowrap shrink-0">
          HIGH RISK
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium bg-neutral-100 text-neutral-900 border border-neutral-400 whitespace-nowrap shrink-0">
          MEDIUM RISK
        </span>
      );
    case 'LOW':
      return (
        <span className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-normal bg-white text-neutral-700 border border-neutral-300 whitespace-nowrap shrink-0">
          LOW RISK
        </span>
      );
    default:
      return (
        <span className="text-xs font-mono text-neutral-500 whitespace-nowrap shrink-0">
          NO PII
        </span>
      );
  }
};

/**
 * Renders source text with inline monochrome annotations for detected PII spans,
 * visually separating original text from detected entity boundaries.
 */
export const AnnotatedTextHighlighter: React.FC<{
  text: string;
  entities: PIIEntity[];
}> = ({ text, entities }) => {
  if (!text) return null;
  const safeForward = prepareSafeReplacementSpans(text, entities).sort(
    (a, b) => a.start - b.start
  );

  if (safeForward.length === 0) {
    return (
      <div className="p-3.5 bg-neutral-50 border border-neutral-200 font-mono text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    );
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;

  safeForward.forEach((ent, idx) => {
    if (ent.start > cursor) {
      segments.push(
        <span key={`plain_${idx}`}>{text.slice(cursor, ent.start)}</span>
      );
    }
    segments.push(
      <mark
        key={`ent_${ent.start}_${ent.end}`}
        className="bg-neutral-950 text-white px-1.5 py-0.5 mx-0.5 font-mono text-xs inline-flex items-baseline gap-1.5 border border-neutral-950"
        title={`${ent.pii_type} [${ent.start}:${ent.end}] (Confidence: ${(ent.confidence ?? 1.0).toFixed(2)})`}
      >
        <span className="font-semibold">{text.slice(ent.start, ent.end)}</span>
        <span className="text-[10px] text-neutral-300 uppercase tracking-tight">
          {ent.pii_type}
        </span>
      </mark>
    );
    cursor = ent.end;
  });

  if (cursor < text.length) {
    segments.push(<span key="plain_end">{text.slice(cursor)}</span>);
  }

  return (
    <div className="p-3.5 bg-neutral-50 border border-neutral-200 font-mono text-xs text-neutral-900 leading-loose whitespace-pre-wrap">
      {segments}
    </div>
  );
};
