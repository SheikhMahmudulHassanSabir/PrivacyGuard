export type PIIEntityType =
  | 'NAME_STUDENT'
  | 'EMAIL'
  | 'PHONE_NUM'
  | 'STREET_ADDRESS'
  | 'USERNAME'
  | 'URL_PERSONAL';

export type RiskTier = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PrivacyDecision = 'ALLOW' | 'DENY' | 'ERROR';

export interface PIIEntity {
  entity_id: string;
  text: string;
  pii_type: PIIEntityType | string;
  start: number;
  end: number;
  label: string;
  confidence?: number;
}

export interface PrivacyCase {
  case_id: string;
  query?: string;
  context: string;
  response?: string;
  entities: PIIEntity[];
  recipient?: string;
  purpose?: string;
  expected_decision?: string;
  domain?: string;
  risk_level?: RiskTier;
}

export interface MethodResult {
  case_id: string;
  method_name: string;
  original_text: string;
  protected_text?: string;
  detected_entities: PIIEntity[];
  masked_entities: PIIEntity[];
  kept_entities?: PIIEntity[];
  privacy_decision?: string;
  reasoning?: string;
  latency_ms: number;
  metadata?: Record<string, any>;
}

export interface CategoryScore {
  precision: number;
  recall: number;
  f1: number;
  tp: number;
  fp: number;
  fn: number;
  support: number;
}

export interface DetectorBenchmark {
  overall: {
    precision: number;
    recall: number;
    f1: number;
    tp: number;
    fp: number;
    fn: number;
    total_ground_truth_entities: number;
  };
  by_category: Record<string, CategoryScore>;
}

export interface MethodMetrics {
  method_name: string;
  category: string;
  total_cases: number;
  successful_cases: number;
  failure_rate: number;
  median_latency_ms: number;
  mean_latency_ms: number;
  leakage_rate?: number | null;
  cases_with_leakage_pct?: number | null;
  total_leaked_entities?: number;
  utility_score?: number | null;
  context_accuracy?: number | null;
  unsafe_allow_rate?: number | null;
  unnecessary_deny_rate?: number | null;
  decision_distribution?: Record<string, number>;
  applicability_note?: string;
  detector_f1?: number;
}

export interface PerRecordMethodDetail {
  protected_text?: string;
  privacy_decision?: string;
  latency_ms: number;
  leakage_rate?: number;
  leaked_entities?: Array<{ text: string; type: string; match_type?: string }>;
  utility_score?: number;
  num_detected: number;
  num_masked: number;
  reasoning?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface PerRecordResult {
  case_id: string;
  context: string;
  query?: string;
  recipient?: string;
  purpose?: string;
  expected_decision?: string;
  ground_truth_entities: Array<{
    text: string;
    type: string;
    start: number;
    end: number;
  }>;
  methods: Record<string, PerRecordMethodDetail>;
}

export interface ExperimentRunMetadata {
  run_id: string;
  status: string;
  start_time: string;
  completion_time: string;
  duration_seconds: number;
  requested_sample_size: number;
  evaluated_sample_size: number;
  random_seed: number;
  stratified: boolean;
  stratified_distribution: Record<string, number>;
  dataset_fingerprint: string;
  sample_fingerprint?: string;
  sample_validation?: {
    checked_cases: number;
    checked_entities: number;
    invalid_offsets_count: number;
    valid: boolean;
  };
  methods_evaluated: string[];
  failed_executions_count: number;
  detector_config: {
    enable_regex: boolean;
    enable_ner: boolean;
    enable_llm: boolean;
  };
}

export interface DatasetValidationReport {
  valid: boolean;
  csv_exists: boolean;
  json_exists: boolean;
  schema_exists: boolean;
  total_csv_records: number;
  total_json_records: number;
  total_entities: number;
  invalid_offsets_count: number;
  unknown_labels: string[];
  errors: string[];
  warnings: string[];
  fingerprint: string;
  risk_distribution: Record<string, number>;
}

export interface ExperimentRunData {
  run_metadata: ExperimentRunMetadata;
  dataset_validation: DatasetValidationReport;
  applicability_matrix: Record<string, Record<string, string>>;
  detector_benchmark: DetectorBenchmark;
  method_metrics: MethodMetrics[];
  per_record_results: PerRecordResult[];
  errors: any[];
  metric_definitions: Record<string, string>;
}
