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

/** Matches Backend LLMProvider values */
export type ReviewProvider =
  | "gemini"
  | "groq"
  | "openrouter"
  | "ollama"
  | "openai"
  | "anthropic"
  | "azure_openai";

export type ReviewJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ReviewStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type StartReviewRequest = {
  project_path: string;
  provider: ReviewProvider;
  include_git: boolean;
  include_bandit: boolean;
  include_ruff: boolean;
  include_pytest: boolean;
  include_coverage: boolean;
  coverage_target?: number | null;
  timeout_seconds?: number | null;
  enable_fallback?: boolean | null;
};

export type StartReviewResponse = {
  id: string;
  status: ReviewJobStatus;
  project_path: string;
  project_name: string;
  provider: string;
  created_at: string;
  message: string;
};

export type ReviewProgressStep = {
  id: string;
  label: string;
  status: ReviewStepStatus;
  detail?: string | null;
};

export type ReviewStatusResponse = {
  id: string;
  status: ReviewJobStatus;
  project_path: string;
  project_name: string;
  provider: string;
  current_step: string | null;
  current_step_label: string | null;
  message: string | null;
  error: string | null;
  failed_stage: string | null;
  steps: ReviewProgressStep[];
  created_at: string;
  started_at: string | null;
  updated_at: string;
  completed_at: string | null;
  elapsed_seconds: number | null;
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
  error: string | null;
};

export type ReviewListResponse = {
  items: ReviewSummaryResponse[];
  total: number;
};

export type ReviewResultResponse = {
  id: string;
  status: ReviewJobStatus;
  project_name: string;
  project_path: string;
  provider: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error: string | null;
  failed_stage: string | null;
  message: string | null;
  steps: ReviewProgressStep[];
  request: Record<string, unknown>;
  result: Record<string, unknown> | null;
};

/** @deprecated Use StartReviewRequest */
export type CreateReviewRequest = StartReviewRequest;

/** Legacy aliases kept for transitional imports */
export type ReviewDetailResponse = ReviewResultResponse;
export type ReviewFindingResponse = {
  title: string;
  detail: string;
  severity: string;
  recommendation?: string | null;
  file?: string | null;
  line?: number | null;
  category?: string | null;
};
export type ReviewReportFormat = "json" | "markdown" | "html";
export type ReviewReportResponse = {
  id: string;
  format: ReviewReportFormat;
  content: string;
  generated_at: string;
  file_name?: string;
};
