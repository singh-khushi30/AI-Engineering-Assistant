/**
 * Finding normalization helpers for flexible agent JSON payloads.
 */

import type { FindingCategory, FindingItem, FindingsPageData } from "@/types/finding";
import type { SeverityLevel, StatusTone } from "@/types/dashboard";
import type { ReviewResultResponse } from "@/types/api";
import {
  mapApiProviderToLabel,
  mapApiSeverityToUiSeverity,
} from "@/lib/review-mappers";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
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

export function normalizeSeverity(value: unknown): SeverityLevel {
  return mapApiSeverityToUiSeverity(value);
}

export function normalizeFindingFile(finding: Record<string, unknown>): string {
  const file =
    asString(finding.file) ||
    asString(finding.file_path) ||
    asString(finding.path) ||
    asString(finding.filename);
  return file || "Not applicable";
}

export function normalizeRecommendation(finding: Record<string, unknown>): string {
  return (
    asString(finding.recommendation) ||
    asString(finding.remediation) ||
    asString(finding.fix) ||
    "No recommendation provided."
  );
}

export function normalizeFindingDetail(finding: Record<string, unknown>): string {
  return (
    asString(finding.detail) ||
    asString(finding.description) ||
    asString(finding.message) ||
    asString(finding.summary) ||
    "No additional detail available."
  );
}

export function normalizeFindingTitle(finding: Record<string, unknown>): string {
  return (
    asString(finding.title) ||
    asString(finding.issue) ||
    asString(finding.name) ||
    asString(finding.rule) ||
    "Untitled finding"
  );
}

export function normalizeFindingLine(finding: Record<string, unknown>): number | null {
  return asNumber(finding.line) ?? asNumber(finding.line_number) ?? asNumber(finding.lineno);
}

function extractAgentFindings(agentPayload: unknown): unknown[] {
  const root = asRecord(agentPayload);
  const data = asRecord(root.data);
  const report = asRecord(data.report);
  if (asArray(report.findings).length > 0) {
    return asArray(report.findings);
  }
  if (asArray(data.findings).length > 0) {
    return asArray(data.findings);
  }
  if (asArray(root.findings).length > 0) {
    return asArray(root.findings);
  }
  return [];
}

function getAgentPayload(
  result: Record<string, unknown> | null,
  category: FindingCategory,
): unknown {
  if (!result) {
    return null;
  }
  const report = asRecord(result.report);
  const detailed = asRecord(report.detailed_findings);
  const aggregated = asRecord(result.aggregated_review);
  return detailed[category] ?? aggregated[category] ?? null;
}

function mapFindingRecords(
  records: unknown[],
  category: FindingCategory,
  defaultCategoryLabel: string,
): FindingItem[] {
  return records.map((item, index) => {
    const finding = asRecord(item);
    const coverage =
      asNumber(finding.coverage) ??
      asNumber(finding.coverage_percent) ??
      asNumber(finding.percent_covered);

    return {
      id: `${category}-${index}`,
      title: normalizeFindingTitle(finding),
      severity: normalizeSeverity(finding.severity),
      detail: normalizeFindingDetail(finding),
      recommendation: normalizeRecommendation(finding),
      file: normalizeFindingFile(finding),
      line: normalizeFindingLine(finding),
      category: asString(finding.category, defaultCategoryLabel),
      coverageLabel: coverage !== null ? `${coverage.toFixed(2)}%` : undefined,
    };
  });
}

function extractCoveragePercent(result: Record<string, unknown> | null): number | null {
  if (!result) {
    return null;
  }
  const tools = asRecord(asRecord(result.aggregated_review).tools);
  const coverage = asRecord(asRecord(tools.coverage).data);
  return (
    asNumber(coverage.total_coverage) ??
    asNumber(coverage.percent_covered) ??
    asNumber(coverage.coverage_percent)
  );
}

function extractTestCounts(result: Record<string, unknown> | null): {
  passed: number | null;
  failed: number | null;
} {
  if (!result) {
    return { passed: null, failed: null };
  }
  const tools = asRecord(asRecord(result.aggregated_review).tools);
  const pytest = asRecord(asRecord(tools.pytest).data);
  return {
    passed: asNumber(pytest.passed) ?? asNumber(pytest.tests_passed),
    failed: asNumber(pytest.failed) ?? asNumber(pytest.tests_failed),
  };
}

function scoreTone(score: number | null): StatusTone {
  if (score === null) {
    return "neutral";
  }
  if (score >= 8) {
    return "success";
  }
  if (score >= 5) {
    return "warning";
  }
  return "danger";
}

function statusFromFindings(
  findings: FindingItem[],
  score: number | null,
): { label: string; tone: StatusTone } {
  if (findings.length === 0) {
    return {
      label: score !== null && score >= 8 ? "Excellent" : "Clear",
      tone: "success",
    };
  }
  const hasHigh = findings.some((f) => f.severity === "high" || f.severity === "critical");
  if (hasHigh) {
    return { label: "Needs attention", tone: "danger" };
  }
  return { label: "Review recommended", tone: scoreTone(score) };
}

export function mapCategoryFindings(
  payload: ReviewResultResponse,
  category: FindingCategory,
): FindingsPageData {
  const result = payload.result ? asRecord(payload.result) : null;
  const report = asRecord(result?.report);
  const scores = asRecord(report.category_scores);
  const score = asNumber(scores[category]);
  const agentPayload = getAgentPayload(result, category);
  const records = extractAgentFindings(agentPayload);
  const categoryLabels: Record<FindingCategory, string> = {
    security: "Security",
    style: "Style",
    testing: "Testing",
    architecture: "Architecture",
  };
  const findings = mapFindingRecords(records, category, categoryLabels[category]);
  const status = statusFromFindings(findings, score);
  const coverage = extractCoveragePercent(result);
  const tests = extractTestCounts(result);
  const request = asRecord(payload.request);
  const coverageTarget = asNumber(request.coverage_target) ?? 80;

  const meta = {
    category,
    title: `${categoryLabels[category]} Findings`,
    description: `Findings from ${payload.project_name} · ${mapApiProviderToLabel(payload.provider)}`,
    statusLabel: status.label,
    statusTone: status.tone,
    findings,
  };

  if (category === "style" && findings.length === 0) {
    return {
      ...meta,
      emptyTitle: "No style issues detected",
      emptyDescription: "Ruff completed successfully with no active findings.",
    };
  }

  if (category === "testing") {
    const overall = coverage;
    return {
      ...meta,
      coverageOverview:
        overall === null
          ? undefined
          : {
              overall,
              target: coverageTarget,
              gap: Math.max(0, coverageTarget - overall),
              testsPassed: tests.passed ?? 0,
              failed: tests.failed ?? 0,
            },
      emptyTitle: "No testing findings",
      emptyDescription: "No coverage or pytest findings were reported for this review.",
    };
  }

  if (category === "architecture") {
    const summary = asRecord(asRecord(result?.intelligence).summary);
    const themes = asArray(summary.themes)
      .map((theme) => asString(theme))
      .filter(Boolean);

    const recommendations = asArray(report.recommendations)
      .map((item) => {
        const rec = asRecord(item);
        return asString(rec.title) || asString(rec.detail) || asString(item);
      })
      .filter(Boolean)
      .slice(0, 4);

    return {
      ...meta,
      architectureScore:
        score !== null ? `${score.toFixed(1)} / 10` : status.label,
      strengths:
        themes.length > 0
          ? themes
          : recommendations.length > 0
            ? recommendations
            : undefined,
      emptyTitle: "No architecture findings",
      emptyDescription: "No architecture observations were returned for this review.",
    };
  }

  return {
    ...meta,
    emptyTitle: `No ${category} findings`,
    emptyDescription: `No ${category} findings were returned for this review.`,
  };
}

export function mapSecurityFindings(payload: ReviewResultResponse): FindingsPageData {
  return mapCategoryFindings(payload, "security");
}

export function mapStyleFindings(payload: ReviewResultResponse): FindingsPageData {
  return mapCategoryFindings(payload, "style");
}

export function mapTestingFindings(payload: ReviewResultResponse): FindingsPageData {
  return mapCategoryFindings(payload, "testing");
}

export function mapArchitectureFindings(
  payload: ReviewResultResponse,
): FindingsPageData {
  return mapCategoryFindings(payload, "architecture");
}
