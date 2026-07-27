export type SeverityLevel = "critical" | "high" | "medium" | "low" | "info";

export type StatusTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "purple";

export type ReviewSummaryKind =
  | "security"
  | "style"
  | "testing"
  | "architecture";

export type ReviewOverview = {
  projectName: string;
  projectPath: string;
  badgeLabel: string;
  provider: string;
  durationLabel: string;
  completedAt: string;
  coveragePercent: number;
  status: string;
};

export type ReviewSummaryCardData = {
  id: ReviewSummaryKind;
  title: string;
  primaryMetric: string;
  supportingText: string;
  statusLabel: string;
  statusTone: StatusTone;
};

export type ExecutiveSummary = {
  title: string;
  body: string;
  highlights: string[];
};

export type TimelineStep = {
  id: string;
  time: string;
  label: string;
  status: "completed" | "running" | "pending";
};

export type CoverageModule = {
  id: string;
  name: string;
  percent: number;
};

export type CoverageBreakdown = {
  overallPercent: number;
  coveredLines: number;
  totalLines: number;
  modules: CoverageModule[];
};

export type PrioritizedIssue = {
  id: string;
  title: string;
  severity: SeverityLevel;
  file: string;
};

export type ReportTile = {
  id: string;
  name: string;
  actionLabel: string;
  variant: "json" | "markdown" | "html" | "all";
};

export type DashboardMockData = {
  overview: ReviewOverview;
  summaryCards: ReviewSummaryCardData[];
  executiveSummary: ExecutiveSummary;
  timeline: TimelineStep[];
  coverage: CoverageBreakdown;
  prioritizedIssues: PrioritizedIssue[];
  reports: ReportTile[];
};
