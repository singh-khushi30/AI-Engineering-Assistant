import type { SeverityLevel, StatusTone } from "@/types/dashboard";

export type FindingCategory =
  | "security"
  | "style"
  | "testing"
  | "architecture";

export type FindingItem = {
  id: string;
  title: string;
  severity: SeverityLevel;
  detail: string;
  recommendation: string;
  file: string;
  line?: number | null;
  category: string;
  coverageLabel?: string;
};

export type FindingsPageData = {
  category: FindingCategory;
  title: string;
  description: string;
  statusLabel: string;
  statusTone: StatusTone;
  findings: FindingItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  scanSummary?: {
    filesScanned: number;
    rulesChecked: number;
    executionTime: string;
  };
  coverageOverview?: {
    overall: number;
    target: number;
    gap: number;
    testsPassed: number;
    failed: number;
  };
  architectureScore?: string;
  strengths?: string[];
};
