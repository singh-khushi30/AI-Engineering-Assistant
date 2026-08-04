import type { SeverityLevel } from "@/types/dashboard";

export type ReviewStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ReviewListItem = {
  id: string;
  projectName: string;
  provider: string;
  status: ReviewStatus;
  coverageLabel: string;
  testsLabel: string;
  highLabel: string;
  mediumLabel: string;
  lowLabel: string;
  durationLabel: string;
  dateLabel: string;
};

export type ReviewFindingGroup = {
  category: "security" | "style" | "testing" | "architecture";
  label: string;
  findings: Array<{
    id: string;
    title: string;
    severity: SeverityLevel;
    detail: string;
    file: string;
    line?: number | null;
  }>;
};

export type ReviewDetail = {
  id: string;
  projectName: string;
  projectPath: string;
  provider: string;
  status: ReviewStatus;
  durationLabel: string;
  completedAt: string;
  coveragePercent: number | null;
  testsPassed: number | null;
  testsFailed: number | null;
  executiveSummary: string;
  highlights: string[];
  agentResults: Array<{
    id: string;
    title: string;
    metric: string;
    statusLabel: string;
  }>;
  prioritizedIssues: Array<{
    id: string;
    title: string;
    severity: SeverityLevel;
    file: string;
    detail?: string;
    recommendation?: string;
    line?: number | null;
    category?: string;
  }>;
  timeline: Array<{
    id: string;
    time: string;
    label: string;
    status: "completed" | "running" | "pending" | "failed";
  }>;
  findingGroups: ReviewFindingGroup[];
  rawJson: Record<string, unknown>;
};
