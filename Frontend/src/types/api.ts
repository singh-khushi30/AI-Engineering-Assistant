/**
 * Shared API contract types for the FastAPI backend.
 * Keep UI mock types separate; map API → UI in later phases.
 */

export type HealthStatus = "healthy" | "unhealthy" | "degraded";

export type HealthResponse = {
  status: HealthStatus | string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
};

export type BackendConnectionStatus = "online" | "offline" | "checking";

export type ApiErrorBody = {
  detail?: string | Array<{ msg?: string; loc?: unknown[] }>;
  message?: string;
  error?: string;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestConfig = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Skip JSON parse for empty responses */
  parseJson?: boolean;
};

export type ReviewJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type CreateReviewRequest = {
  project_path: string;
  provider?: string;
  include_git?: boolean;
  include_bandit?: boolean;
  include_ruff?: boolean;
  include_pytest?: boolean;
  include_coverage?: boolean;
  coverage_target?: number;
  timeout_seconds?: number;
};

export type ReviewSummaryResponse = {
  id: string;
  project_name: string;
  project_path: string;
  provider: string;
  status: ReviewJobStatus;
  coverage_percent: number | null;
  tests_passed: number | null;
  tests_failed: number | null;
  high_count: number | null;
  medium_count: number | null;
  low_count: number | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
};

export type ReviewListResponse = {
  items: ReviewSummaryResponse[];
  total: number;
};

export type ReviewFindingResponse = {
  title: string;
  detail: string;
  severity: string;
  recommendation?: string | null;
  file?: string | null;
  line?: number | null;
  category?: string | null;
};

export type ReviewAgentReportResponse = {
  agent: string;
  summary: string;
  findings: ReviewFindingResponse[];
  recommendations: string[];
  severity: string;
  confidence: number;
};

export type ReviewDetailResponse = ReviewSummaryResponse & {
  executive_summary?: string | null;
  highlights?: string[];
  agents?: ReviewAgentReportResponse[];
  prioritized_issues?: ReviewFindingResponse[];
  timeline?: Array<{
    time: string;
    label: string;
    status: "completed" | "running" | "pending";
  }>;
  raw?: Record<string, unknown>;
};

export type ReviewStatusResponse = {
  id: string;
  status: ReviewJobStatus;
  progress_percent?: number | null;
  current_step?: string | null;
  message?: string | null;
  updated_at: string;
};

export type ReviewReportFormat = "json" | "markdown" | "html";

export type ReviewReportResponse = {
  id: string;
  format: ReviewReportFormat;
  content: string;
  generated_at: string;
  file_name?: string;
};
