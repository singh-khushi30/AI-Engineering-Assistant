import type {
  ReviewJobStatus,
  ReviewProgressStep,
  ReviewResultResponse,
  ReviewSummaryResponse,
} from "@/types/api";
import type { SeverityLevel } from "@/types/dashboard";
import type {
  ReviewDetail,
  ReviewFindingGroup,
  ReviewListItem,
  ReviewStatus,
} from "@/types/review";

const PROVIDER_LABELS: Record<string, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  ollama: "Ollama",
  openai: "OpenAI",
  anthropic: "Anthropic",
  azure_openai: "Azure OpenAI",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = "Not available"): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function mapApiProviderToLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  return PROVIDER_LABELS[key] ?? provider;
}

export function mapApiSeverityToUiSeverity(value: unknown): SeverityLevel {
  const raw = String(value ?? "info").trim().toLowerCase();
  if (raw === "critical" || raw === "high") {
    return raw === "critical" ? "high" : "high";
  }
  if (raw === "medium" || raw === "moderate") {
    return "medium";
  }
  if (raw === "low") {
    return "low";
  }
  return "info";
}

export function mapApiJobStatusToUiStatus(
  status: ReviewJobStatus,
): ReviewStatus | null {
  if (status === "completed") {
    return "completed";
  }
  if (status === "failed" || status === "cancelled") {
    return "failed";
  }
  return null;
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return "Not available";
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function formatDateLabel(iso: string | null | undefined): string {
  if (!iso) {
    return "Not available";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function extractCoveragePercent(result: Record<string, unknown> | null): number | null {
  if (!result) {
    return null;
  }
  const aggregated = asRecord(result.aggregated_review);
  const tools = asRecord(aggregated.tools);
  const coverage = asRecord(asRecord(tools.coverage).data);
  return (
    asNumber(coverage.total_coverage) ??
    asNumber(coverage.percent_covered) ??
    asNumber(coverage.coverage_percent)
  );
}

function extractTestCounts(result: Record<string, unknown> | null): {
  passed: number;
  failed: number;
} {
  if (!result) {
    return { passed: 0, failed: 0 };
  }
  const aggregated = asRecord(result.aggregated_review);
  const tools = asRecord(aggregated.tools);
  const pytest = asRecord(asRecord(tools.pytest).data);
  return {
    passed: asNumber(pytest.passed) ?? asNumber(pytest.tests_passed) ?? 0,
    failed: asNumber(pytest.failed) ?? asNumber(pytest.tests_failed) ?? 0,
  };
}

function extractFindingsFromAgentPayload(
  agentPayload: unknown,
  category: ReviewFindingGroup["category"],
): ReviewFindingGroup["findings"] {
  const root = asRecord(agentPayload);
  const data = asRecord(root.data);
  const report = asRecord(data.report);
  const findings = asArray(report.findings).length
    ? asArray(report.findings)
    : asArray(data.findings);

  return findings.map((item, index) => {
    const finding = asRecord(item);
    return {
      id: `${category}-${index}`,
      title: asString(finding.title, "Untitled finding"),
      severity: mapApiSeverityToUiSeverity(finding.severity),
      detail: asString(finding.detail, ""),
      file: asString(finding.file, "Not applicable"),
      line: asNumber(finding.line),
    };
  });
}

function extractFindingGroups(
  result: Record<string, unknown> | null,
): ReviewFindingGroup[] {
  if (!result) {
    return [];
  }
  const report = asRecord(result.report);
  const detailed = asRecord(report.detailed_findings);
  const aggregated = asRecord(result.aggregated_review);

  const sources: Array<{
    category: ReviewFindingGroup["category"];
    label: string;
    payload: unknown;
  }> = [
    {
      category: "security",
      label: "Security",
      payload: detailed.security ?? aggregated.security,
    },
    {
      category: "style",
      label: "Style",
      payload: detailed.style ?? aggregated.style,
    },
    {
      category: "testing",
      label: "Testing",
      payload: detailed.testing ?? aggregated.testing,
    },
    {
      category: "architecture",
      label: "Architecture",
      payload: detailed.architecture ?? aggregated.architecture,
    },
  ];

  return sources.map((source) => ({
    category: source.category,
    label: source.label,
    findings: extractFindingsFromAgentPayload(source.payload, source.category),
  }));
}

function mapStepsToTimeline(
  steps: ReviewProgressStep[],
  startedAt: string | null,
): ReviewDetail["timeline"] {
  const base = startedAt ? new Date(startedAt).getTime() : Date.now();
  return steps
    .filter((step) => step.status !== "skipped")
    .map((step, index) => {
      const time = new Date(base + index * 1000).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      let status: "completed" | "running" | "pending" = "pending";
      if (step.status === "completed") {
        status = "completed";
      } else if (step.status === "running") {
        status = "running";
      } else if (step.status === "failed") {
        status = "completed";
      }
      return {
        id: step.id,
        time,
        label: step.label,
        status,
      };
    });
}

export function mapApiSummaryToReviewListItem(
  item: ReviewSummaryResponse,
): ReviewListItem | null {
  const uiStatus = mapApiJobStatusToUiStatus(item.status);
  if (!uiStatus) {
    return null;
  }

  const testsLabel =
    item.tests_passed === null && item.tests_failed === null
      ? "Not available"
      : item.tests_failed && item.tests_failed > 0
        ? `${item.tests_passed ?? 0} passed, ${item.tests_failed} failed`
        : `${item.tests_passed ?? 0} passed`;

  return {
    id: item.id,
    projectName: item.project_name,
    provider: mapApiProviderToLabel(item.provider),
    status: uiStatus,
    coverageLabel:
      item.coverage_percent === null || item.coverage_percent === undefined
        ? "Not available"
        : `${item.coverage_percent.toFixed(2)}%`,
    testsLabel,
    highLabel:
      item.high_count === null || item.high_count === undefined
        ? "Not available"
        : String(item.high_count),
    mediumLabel:
      item.medium_count === null || item.medium_count === undefined
        ? "Not available"
        : String(item.medium_count),
    lowLabel:
      item.low_count === null || item.low_count === undefined
        ? "Not available"
        : String(item.low_count),
    durationLabel: formatDuration(item.duration_seconds),
    dateLabel: formatDateLabel(item.completed_at ?? item.created_at),
  };
}

export function mapApiReviewToReviewDetail(
  payload: ReviewResultResponse,
): ReviewDetail {
  const result = payload.result ? asRecord(payload.result) : null;
  const report = asRecord(result?.report);
  const intelligence = asRecord(result?.intelligence);
  const summary = asRecord(intelligence.summary);
  const tests = extractTestCounts(result);
  const findingGroups = extractFindingGroups(result);
  const topIssues = asArray(report.top_issues);
  const themes = asArray(summary.themes).map((theme) => asString(theme, "")).filter(Boolean);
  const uiStatus = mapApiJobStatusToUiStatus(payload.status) ?? "failed";

  const agentResults = findingGroups.map((group) => {
    const score = asRecord(report.category_scores)[group.category];
    const scoreNumber = asNumber(score);
    return {
      id: group.category,
      title: group.label,
      metric:
        scoreNumber !== null
          ? `${scoreNumber.toFixed(1)}/10`
          : `${group.findings.length} finding${group.findings.length === 1 ? "" : "s"}`,
      statusLabel:
        group.findings.length === 0
          ? "Clear"
          : `${group.findings.length} issue${group.findings.length === 1 ? "" : "s"}`,
    };
  });

  const prioritizedIssues = topIssues.slice(0, 10).map((item, index) => {
    const issue = asRecord(item);
    return {
      id: `issue-${index}`,
      title: asString(issue.title, "Untitled issue"),
      severity: mapApiSeverityToUiSeverity(issue.severity),
      file: asString(issue.file, "Not applicable"),
    };
  });

  return {
    id: payload.id,
    projectName: payload.project_name,
    projectPath: payload.project_path,
    provider: mapApiProviderToLabel(payload.provider),
    status: uiStatus,
    durationLabel: formatDuration(payload.duration_seconds),
    completedAt: formatDateLabel(payload.completed_at ?? payload.created_at),
    coveragePercent: extractCoveragePercent(result),
    testsPassed: tests.passed,
    testsFailed: tests.failed,
    executiveSummary: asString(
      report.executive_summary ?? summary.executive_summary,
      payload.error ?? "No executive summary available.",
    ),
    highlights: themes.length > 0 ? themes : [],
    agentResults,
    prioritizedIssues,
    timeline: mapStepsToTimeline(payload.steps, payload.started_at),
    findingGroups,
    rawJson: result ?? { id: payload.id, status: payload.status, error: payload.error },
  };
}

export function sanitizeApiErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) {
    return "Something went wrong while contacting the backend.";
  }
  const lowered = trimmed.toLowerCase();
  if (
    lowered.includes("api_key") ||
    lowered.includes("apikey") ||
    lowered.includes("authorization") ||
    lowered.includes("bearer ")
  ) {
    return "Provider authentication failed. Check backend credentials and try again.";
  }
  return trimmed.length > 400 ? `${trimmed.slice(0, 397)}...` : trimmed;
}
