import type { CoverageBreakdown, CoverageModule, TimelineStep } from "@/types/dashboard";
import type { ReviewProgressStep, ReviewResultResponse } from "@/types/api";

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export type CoverageFileEntry = {
  name: string;
  percentage: number | null;
  coveredLines: number | null;
  totalLines: number | null;
};

const AREA_RULES: Array<{
  id: string;
  name: string;
  match: (path: string) => boolean;
}> = [
  {
    id: "llm",
    name: "LLM Services",
    match: (path) =>
      path.startsWith("app/services/llm/") || path.includes("/services/llm/"),
  },
  {
    id: "agents",
    name: "Agents & Crews",
    match: (path) =>
      path.startsWith("agents/") ||
      path.startsWith("crews/") ||
      path.includes("/agents/") ||
      path.includes("/crews/"),
  },
  {
    id: "tools",
    name: "Tools",
    match: (path) => path.startsWith("tools/") || path.includes("/tools/"),
  },
  {
    id: "core",
    name: "Core Application",
    match: (path) => {
      const normalized = path.replace(/\\/g, "/");
      if (!normalized.startsWith("app/")) {
        return false;
      }
      return !normalized.startsWith("app/services/llm/");
    },
  },
];

const STEP_LABELS: Record<string, string> = {
  initialized: "Review initialized",
  validating_repository: "Repository validated",
  repository_validated: "Repository validated",
  initializing_review: "Review initialized",
  running_git: "Git analysis",
  git: "Git analysis",
  running_bandit: "Bandit security analysis",
  bandit: "Bandit security analysis",
  running_ruff: "Ruff style analysis",
  ruff: "Ruff style analysis",
  running_pytest: "Pytest analysis",
  pytest: "Pytest analysis",
  running_coverage: "Coverage analysis",
  coverage: "Coverage analysis",
  running_security_agent: "Security review agent",
  security_agent: "Security review agent",
  agent_security: "Security review agent",
  running_style_agent: "Style review agent",
  style_agent: "Style review agent",
  agent_style: "Style review agent",
  running_testing_agent: "Testing review agent",
  testing_agent: "Testing review agent",
  agent_testing: "Testing review agent",
  running_architecture_agent: "Architecture review agent",
  architecture_agent: "Architecture review agent",
  agent_architecture: "Architecture review agent",
  generating_summary: "Executive summary",
  executive_summary: "Executive summary",
  generating_reports: "Report generation",
  report_generation: "Report generation",
  completed: "Review completed",
  project_structure: "Repository validated",
};

const TIMING_ORDER: Array<{ key: string; id: string }> = [
  { key: "project_structure", id: "repository_validated" },
  { key: "git", id: "git" },
  { key: "bandit", id: "bandit" },
  { key: "ruff", id: "ruff" },
  { key: "pytest", id: "pytest" },
  { key: "coverage", id: "coverage" },
  { key: "agent_security", id: "security_agent" },
  { key: "agent_style", id: "style_agent" },
  { key: "agent_testing", id: "testing_agent" },
  { key: "agent_architecture", id: "architecture_agent" },
  { key: "executive_summary", id: "executive_summary" },
  { key: "report_generation", id: "report_generation" },
];

export function normalizeCoveragePercentage(value: unknown): number | null {
  const number = asNumber(value);
  if (number === null) {
    return null;
  }
  if (Number.isNaN(number)) {
    return null;
  }
  let percent = number;
  if (percent > 0 && percent < 1) {
    percent *= 100;
  }
  if (percent < 0 || percent > 100) {
    return null;
  }
  return Math.round(percent * 100) / 100;
}

export function formatTimelineStepLabel(step: string): string {
  const key = step.trim().toLowerCase();
  return STEP_LABELS[key] ?? step.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeTimelineStatus(
  status: unknown,
): TimelineStep["status"] {
  const raw = String(status ?? "pending").toLowerCase();
  if (raw === "completed" || raw === "success" || raw === "done") {
    return "completed";
  }
  if (raw === "running" || raw === "in_progress" || raw === "active") {
    return "running";
  }
  if (raw === "failed" || raw === "error") {
    return "failed";
  }
  return "pending";
}

function formatClock(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDurationLabel(seconds: number | null): string | null {
  if (seconds === null || Number.isNaN(seconds)) {
    return null;
  }
  if (seconds < 10) {
    return `${seconds.toFixed(3)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

export function extractCoverageFileEntries(coverageData: unknown): CoverageFileEntry[] {
  const data = asRecord(coverageData);
  const files = data.files;
  const modules = data.modules;
  const entries: CoverageFileEntry[] = [];

  if (files && typeof files === "object" && !Array.isArray(files)) {
    for (const [path, payload] of Object.entries(asRecord(files))) {
      const root = asRecord(payload);
      const summaryRecord =
        root.summary && typeof root.summary === "object" && !Array.isArray(root.summary)
          ? asRecord(root.summary)
          : root;
      entries.push({
        name: path.replace(/\\/g, "/"),
        percentage: normalizeCoveragePercentage(
          summaryRecord.percent_covered ??
            summaryRecord.coverage ??
            summaryRecord.percent,
        ),
        coveredLines: asNumber(summaryRecord.covered_lines),
        totalLines:
          asNumber(summaryRecord.num_statements) ?? asNumber(summaryRecord.total_lines),
      });
    }
    return entries;
  }

  const list = asArray(files).length ? asArray(files) : asArray(modules);
  for (const item of list) {
    const entry = asRecord(item);
    const name = asString(entry.file ?? entry.name ?? entry.path, "").replace(/\\/g, "/");
    if (!name) {
      continue;
    }
    entries.push({
      name,
      percentage: normalizeCoveragePercentage(
        entry.percentage ?? entry.percent_covered ?? entry.coverage ?? entry.percent,
      ),
      coveredLines: asNumber(entry.covered_lines),
      totalLines: asNumber(entry.total_lines) ?? asNumber(entry.num_statements),
    });
  }
  return entries;
}

export function groupCoverageByArea(files: CoverageFileEntry[]): CoverageModule[] {
  const modules: CoverageModule[] = [];

  for (const area of AREA_RULES) {
    const matched = files.filter((file) => area.match(file.name));
    if (matched.length === 0) {
      continue;
    }
    let covered = 0;
    let total = 0;
    let percentSum = 0;
    let percentCount = 0;

    for (const file of matched) {
      if (file.coveredLines !== null && file.totalLines !== null && file.totalLines > 0) {
        covered += file.coveredLines;
        total += file.totalLines;
      } else if (file.percentage !== null) {
        percentSum += file.percentage;
        percentCount += 1;
      }
    }

    let percent: number | null = null;
    if (total > 0) {
      percent = normalizeCoveragePercentage((covered / total) * 100);
    } else if (percentCount > 0) {
      percent = normalizeCoveragePercentage(percentSum / percentCount);
    }

    if (percent === null) {
      continue;
    }

    modules.push({
      id: area.id,
      name: area.name,
      percent,
    });
  }

  return modules;
}

export function mapApiCoverage(result: Record<string, unknown> | null): CoverageBreakdown {
  if (!result) {
    return {
      overallPercent: null,
      coveredLines: null,
      totalLines: null,
      modules: [],
      available: false,
    };
  }

  const stable = asRecord(result.coverage);
  if (Object.keys(stable).length > 0) {
    const modulesRaw = asArray(stable.modules);
    const fileEntriesFromStable: CoverageFileEntry[] = modulesRaw
      .map((item) => {
        const entry = asRecord(item);
        const name = asString(entry.name ?? entry.path ?? entry.file, "").replace(
          /\\/g,
          "/",
        );
        if (!name) {
          return null;
        }
        return {
          name,
          percentage: normalizeCoveragePercentage(
            entry.percentage ?? entry.percent_covered ?? entry.percent,
          ),
          coveredLines: asNumber(entry.covered_lines),
          totalLines: asNumber(entry.total_lines) ?? asNumber(entry.num_statements),
        };
      })
      .filter((item): item is CoverageFileEntry => item !== null);

    const looksLikeFiles = fileEntriesFromStable.some(
      (file) => file.name.includes("/") || file.name.endsWith(".py"),
    );
    const modules = looksLikeFiles
      ? groupCoverageByArea(fileEntriesFromStable)
      : fileEntriesFromStable
          .filter((file) => file.percentage !== null)
          .slice(0, 8)
          .map((file) => ({
            id: file.name,
            name: file.name,
            percent: file.percentage as number,
          }));

    const overallPercent = normalizeCoveragePercentage(
      stable.percentage ?? stable.percent_covered ?? stable.total_coverage,
    );
    const coveredLines = asNumber(stable.covered_lines);
    const totalLines = asNumber(stable.total_lines) ?? asNumber(stable.num_statements);

    return {
      overallPercent,
      coveredLines,
      totalLines,
      modules,
      available: overallPercent !== null || modules.length > 0,
    };
  }

  const aggregated = asRecord(result.aggregated_review);
  const tools = asRecord(aggregated.tools);
  const coverageData = asRecord(asRecord(tools.coverage).data);
  const overallPercent = normalizeCoveragePercentage(
    coverageData.percent_covered ??
      coverageData.total_coverage ??
      coverageData.coverage_percent,
  );
  const coveredLines = asNumber(coverageData.covered_lines);
  const totalLines =
    asNumber(coverageData.num_statements) ?? asNumber(coverageData.total_lines);
  const files = extractCoverageFileEntries(coverageData);
  const modules = groupCoverageByArea(files);

  return {
    overallPercent,
    coveredLines,
    totalLines,
    modules,
    available: overallPercent !== null || modules.length > 0,
  };
}

export function mapApiTimeline(
  steps: ReviewProgressStep[] | undefined,
  payload: Pick<
    ReviewResultResponse,
    "started_at" | "completed_at" | "created_at" | "result" | "status"
  >,
): { steps: TimelineStep[]; unavailable: boolean; reason: string | null } {
  const apiSteps = (steps ?? []).filter((step) => step.status !== "skipped");
  if (apiSteps.length > 0) {
    return {
      steps: apiSteps.map((step) => {
        const detailTime =
          step.detail && /^\d+(\.\d+)?s$/.test(step.detail) ? step.detail : null;
        const boundaryClock =
          step.id === "initialized" || step.id === "completed"
            ? formatClock(
                step.id === "completed"
                  ? payload.completed_at ?? payload.started_at
                  : payload.started_at ?? payload.created_at,
              )
            : null;

        return {
          id: step.id,
          time: detailTime ?? boundaryClock ?? "—",
          label: formatTimelineStepLabel(step.label || step.id),
          status: normalizeTimelineStatus(step.status),
        };
      }),
      unavailable: false,
      reason: null,
    };
  }

  const result = payload.result ? asRecord(payload.result) : null;
  const aggregated = asRecord(result?.aggregated_review);
  const report = asRecord(result?.report);
  const appendix = asRecord(report.appendix);
  const timings = asRecord(
    Object.keys(asRecord(aggregated.timings)).length
      ? aggregated.timings
      : appendix.timings,
  );

  const fromTimings: TimelineStep[] = [];
  if (Object.keys(timings).length > 0) {
    fromTimings.push({
      id: "initialized",
      time: formatClock(payload.started_at ?? payload.created_at) ?? "—",
      label: "Review initialized",
      status: "completed",
    });
    for (const item of TIMING_ORDER) {
      if (!(item.key in timings)) {
        continue;
      }
      const duration = asNumber(timings[item.key]);
      fromTimings.push({
        id: item.id,
        time: formatDurationLabel(duration) ?? "—",
        label: formatTimelineStepLabel(item.id),
        status: "completed",
      });
    }
    fromTimings.push({
      id: "completed",
      time: formatClock(payload.completed_at ?? payload.started_at) ?? "—",
      label: "Review completed",
      status: "completed",
    });
    return { steps: fromTimings, unavailable: false, reason: null };
  }

  const started = formatClock(payload.started_at ?? payload.created_at);
  const completed = formatClock(payload.completed_at);
  if (started || completed) {
    const boundary: TimelineStep[] = [];
    if (started) {
      boundary.push({
        id: "initialized",
        time: started,
        label: "Review started",
        status: "completed",
      });
    }
    if (completed) {
      boundary.push({
        id: "completed",
        time: completed,
        label: "Review completed",
        status: "completed",
      });
    }
    return { steps: boundary, unavailable: false, reason: null };
  }

  return {
    steps: [],
    unavailable: true,
    reason:
      "This review was imported from an older report that did not include execution events.",
  };
}
