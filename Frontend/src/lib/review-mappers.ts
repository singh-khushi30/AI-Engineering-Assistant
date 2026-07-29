import { getProviderLabel } from "@/constants/providers";
import { mapApiCoverage, mapApiTimeline } from "@/lib/coverage-timeline";
import type {
  ReviewJobStatus,
  ReviewProgressStep,
  ReviewResultResponse,
  ReviewSummaryResponse,
} from "@/types/api";
import type {
  DashboardMockData,
  ExecutiveSummary,
  PrioritizedIssue,
  ReportTile,
  ReviewOverview,
  ReviewSummaryCardData,
  SeverityLevel,
  StatusTone,
  TimelineStep,
} from "@/types/dashboard";
import type {
  ReviewDetail,
  ReviewFindingGroup,
  ReviewListItem,
  ReviewStatus,
} from "@/types/review";
import type { ReportFormat, ReportItem } from "@/types/report";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  azure_openai: "Azure OpenAI",
};

export function mapApiProviderToLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  const known = getProviderLabel(key);
  if (known !== key) {
    return known;
  }
  return PROVIDER_LABELS[key] ?? provider;
}

const SECRET_KEY_PATTERN =
  /(api[_-]?key|apikey|authorization|password|secret|token|credential|private[_-]?key)/i;

export function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown, fallback = "Not available"): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function mapApiSeverityToUiSeverity(value: unknown): SeverityLevel {
  const raw = String(value ?? "info").trim().toLowerCase();
  if (raw === "critical") {
    return "critical";
  }
  if (raw === "high") {
    return "high";
  }
  if (raw === "medium" || raw === "moderate") {
    return "medium";
  }
  if (raw === "low") {
    return "low";
  }
  return "info";
}

export function mapApiJobStatusToUiStatus(status: ReviewJobStatus): ReviewStatus {
  if (status === "completed") {
    return "completed";
  }
  if (status === "failed") {
    return "failed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  if (status === "running") {
    return "running";
  }
  return "queued";
}

export function formatDuration(seconds: number | null | undefined): string {
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

export function formatDateLabel(iso: string | null | undefined): string {
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

export function extractCoveragePercent(
  result: Record<string, unknown> | null,
): number | null {
  return mapApiCoverage(result).overallPercent;
}

export function mapStepsToTimeline(
  steps: ReviewProgressStep[],
  startedAt: string | null,
  payload?: Pick<
    ReviewResultResponse,
    "started_at" | "completed_at" | "created_at" | "result" | "status"
  >,
): TimelineStep[] {
  const mapped = mapApiTimeline(
    steps,
    payload ?? {
      started_at: startedAt,
      completed_at: null,
      created_at: startedAt ?? "",
      result: null,
      status: "completed",
    },
  );
  return mapped.steps;
}

export function extractTestCounts(result: Record<string, unknown> | null): {
  passed: number | null;
  failed: number | null;
} {
  if (!result) {
    return { passed: null, failed: null };
  }
  const aggregated = asRecord(result.aggregated_review);
  const tools = asRecord(aggregated.tools);
  const pytest = asRecord(asRecord(tools.pytest).data);
  const skipped = Boolean(asRecord(asRecord(tools.pytest).data).skipped);
  if (skipped && asNumber(pytest.passed) === null && asNumber(pytest.failed) === null) {
    return { passed: null, failed: null };
  }
  return {
    passed: asNumber(pytest.passed) ?? asNumber(pytest.tests_passed),
    failed: asNumber(pytest.failed) ?? asNumber(pytest.tests_failed),
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
    : asArray(data.findings).length
      ? asArray(data.findings)
      : asArray(root.findings);

  return findings.map((item, index) => {
    const finding = asRecord(item);
    return {
      id: `${category}-${index}`,
      title:
        asString(finding.title, "") ||
        asString(finding.issue, "") ||
        asString(finding.name, "Untitled finding"),
      severity: mapApiSeverityToUiSeverity(finding.severity),
      detail:
        asString(finding.detail, "") ||
        asString(finding.description, "") ||
        asString(finding.message, ""),
      file:
        asString(finding.file, "") ||
        asString(finding.file_path, "") ||
        asString(finding.path, "Not applicable"),
      line: asNumber(finding.line) ?? asNumber(finding.line_number),
    };
  });
}

export function extractFindingGroups(
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
    { category: "security", label: "Security", payload: detailed.security ?? aggregated.security },
    { category: "style", label: "Style", payload: detailed.style ?? aggregated.style },
    { category: "testing", label: "Testing", payload: detailed.testing ?? aggregated.testing },
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

export function mapApiSummaryToReviewListItem(
  item: ReviewSummaryResponse,
): ReviewListItem {
  const uiStatus = mapApiJobStatusToUiStatus(item.status);
  const testsUnavailable =
    item.tests_passed === null &&
    item.tests_failed === null &&
    (item.status === "queued" || item.status === "running");

  const testsLabel = testsUnavailable
    ? "Not available"
    : item.tests_passed === null && item.tests_failed === null
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

export function sortSummariesNewestFirst(
  items: ReviewSummaryResponse[],
): ReviewSummaryResponse[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  });
}

export function redactSensitiveJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveJson(item));
  }
  if (value !== null && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(input)) {
      if (SECRET_KEY_PATTERN.test(key)) {
        output[key] = "[REDACTED]";
      } else {
        output[key] = redactSensitiveJson(nested);
      }
    }
    return output;
  }
  return value;
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
  const themes = asArray(summary.themes)
    .map((theme) => asString(theme, ""))
    .filter(Boolean);
  const uiStatus = mapApiJobStatusToUiStatus(payload.status);

  const agentResults = findingGroups.map((group) => {
    const score = asRecord(report.category_scores)[group.category];
    const scoreNumber = asNumber(score);
    const unavailable = result === null;
    return {
      id: group.category,
      title: group.label,
      metric: unavailable
        ? "Not available"
        : scoreNumber !== null
          ? `${scoreNumber.toFixed(1)}/10`
          : `${group.findings.length} finding${group.findings.length === 1 ? "" : "s"}`,
      statusLabel: unavailable
        ? "Not available"
        : group.findings.length === 0
          ? "Clear"
          : `${group.findings.length} issue${group.findings.length === 1 ? "" : "s"}`,
    };
  });

  const prioritizedIssues = topIssues.slice(0, 10).map((item, index) => {
    const issue = asRecord(item);
    return {
      id: `issue-${index}`,
      title:
        asString(issue.title, "") ||
        asString(issue.issue, "Untitled issue"),
      severity: mapApiSeverityToUiSeverity(issue.severity),
      file:
        asString(issue.file, "") ||
        asString(issue.file_path, "Not applicable"),
    };
  });

  const raw =
    result ??
    ({
      id: payload.id,
      status: payload.status,
      error: payload.error,
      message: payload.message,
    } as Record<string, unknown>);

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
    highlights: themes,
    agentResults,
    prioritizedIssues,
    timeline: mapStepsToTimeline(payload.steps, payload.started_at, payload),
    findingGroups,
    rawJson: redactSensitiveJson(raw) as Record<string, unknown>,
  };
}

function toneForScore(score: number | null, findingCount: number): StatusTone {
  if (score === null && findingCount === 0) {
    return "neutral";
  }
  if (findingCount === 0 || (score !== null && score >= 8)) {
    return "success";
  }
  if (findingCount > 0 && (score === null || score < 5)) {
    return "danger";
  }
  return "warning";
}

export function mapApiReviewToDashboardData(
  payload: ReviewResultResponse,
): DashboardMockData {
  const detail = mapApiReviewToReviewDetail(payload);
  const result = payload.result ? asRecord(payload.result) : null;
  const report = asRecord(result?.report);
  const scores = asRecord(report.category_scores);
  const coverage = mapApiCoverage(result);
  const timelineMapped = mapApiTimeline(payload.steps, payload);

  const overview: ReviewOverview = {
    projectName: detail.projectName,
    projectPath: detail.projectPath,
    badgeLabel: "Live review",
    provider: detail.provider,
    durationLabel: detail.durationLabel,
    completedAt: detail.completedAt,
    coveragePercent: coverage.overallPercent ?? detail.coveragePercent,
    status: detail.status,
  };

  const summaryCards: ReviewSummaryCardData[] = detail.findingGroups.map((group) => {
    const score = asNumber(scores[group.category]);
    return {
      id: group.category,
      title: group.label,
      primaryMetric:
        score !== null
          ? `${score.toFixed(1)}/10`
          : `${group.findings.length} finding${group.findings.length === 1 ? "" : "s"}`,
      supportingText:
        group.findings.length === 0
          ? "No active findings"
          : `${group.findings.length} reported`,
      statusLabel:
        group.findings.length === 0
          ? "Clear"
          : `${group.findings.length} issue${group.findings.length === 1 ? "" : "s"}`,
      statusTone: toneForScore(score, group.findings.length),
    };
  });

  const executiveSummary: ExecutiveSummary = {
    title: "Executive Summary",
    body: detail.executiveSummary,
    highlights: detail.highlights,
  };

  const prioritizedIssues: PrioritizedIssue[] = detail.prioritizedIssues;

  const artifacts = asRecord(result?.artifacts);
  const reports: ReportTile[] = (["json", "markdown", "html"] as const)
    .filter((format) => Boolean(artifacts[format] || artifacts[format === "markdown" ? "md" : format]))
    .map((format) => ({
      id: `${payload.id}-${format}`,
      name: `${detail.projectName}-review.${format === "markdown" ? "md" : format}`,
      actionLabel: "Available on backend",
      variant: format,
    }));

  return {
    overview,
    summaryCards,
    executiveSummary,
    timeline: timelineMapped.steps.length ? timelineMapped.steps : detail.timeline,
    coverage,
    prioritizedIssues,
    reports,
    timelineUnavailable: timelineMapped.unavailable,
    timelineUnavailableReason: timelineMapped.reason,
  };
}

export function mapApiReviewToReportItems(
  payload: ReviewResultResponse,
): ReportItem[] {
  if (payload.status !== "completed" || !payload.result) {
    return [];
  }
  const result = asRecord(payload.result);
  const artifacts = asRecord(result.artifacts);
  const formats: Array<{ key: string; format: ReportFormat; ext: string }> = [
    { key: "json", format: "json", ext: "json" },
    { key: "markdown", format: "markdown", ext: "md" },
    { key: "md", format: "markdown", ext: "md" },
    { key: "html", format: "html", ext: "html" },
  ];

  const seen = new Set<ReportFormat>();
  const items: ReportItem[] = [];

  for (const entry of formats) {
    if (seen.has(entry.format)) {
      continue;
    }
    const pathValue = artifacts[entry.key];
    if (typeof pathValue !== "string" || !pathValue.trim()) {
      continue;
    }
    seen.add(entry.format);
    const preview =
      entry.format === "json"
        ? JSON.stringify(
            redactSensitiveJson(asRecord(result.report)),
            null,
            2,
          )
        : `Report file available on the backend host:\n${pathValue}`;

    items.push({
      id: `${payload.id}-${entry.format}`,
      fileName: `${payload.project_name}-review.${entry.ext}`,
      format: entry.format,
      project: payload.project_name,
      generatedAt: formatDateLabel(payload.completed_at ?? payload.created_at),
      sizeLabel: "Available on backend",
      provider: mapApiProviderToLabel(payload.provider),
      preview,
      backendPath: pathValue,
      reviewId: payload.id,
      canDownload: false,
      canPreview: entry.format === "json" || Boolean(pathValue),
    });
  }

  return items;
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

export function pickLatestCompleted(
  items: ReviewSummaryResponse[],
): ReviewSummaryResponse | null {
  return (
    sortSummariesNewestFirst(items).find((item) => item.status === "completed") ??
    null
  );
}

export function pickLatestActive(
  items: ReviewSummaryResponse[],
): ReviewSummaryResponse | null {
  return (
    sortSummariesNewestFirst(items).find(
      (item) => item.status === "queued" || item.status === "running",
    ) ?? null
  );
}
