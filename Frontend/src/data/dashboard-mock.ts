import type { DashboardMockData } from "@/types/dashboard";

export const dashboardMock: DashboardMockData = {
  overview: {
    projectName: "Backend",
    projectPath: "/Users/khushisingh/Dev/AI Engineering Assistant/Backend",
    badgeLabel: "Local Repository",
    provider: "Gemini",
    durationLabel: "20.1s",
    completedAt: "25 Jul 2026, 09:14 AM",
    coveragePercent: 73.93,
    status: "Completed",
  },
  summaryCards: [
    {
      id: "security",
      title: "Security Review",
      primaryMetric: "3 Findings",
      supportingText: "2 Medium · 1 Low",
      statusLabel: "Medium Risk",
      statusTone: "warning",
    },
    {
      id: "style",
      title: "Style Review",
      primaryMetric: "0 Issues",
      supportingText: "All good",
      statusLabel: "Excellent",
      statusTone: "success",
    },
    {
      id: "testing",
      title: "Testing Review",
      primaryMetric: "73.93%",
      supportingText: "51 Tests Passed",
      statusLabel: "Below Target",
      statusTone: "warning",
    },
    {
      id: "architecture",
      title: "Architecture Review",
      primaryMetric: "Excellent",
      supportingText: "2 Observations",
      statusLabel: "Low Risk",
      statusTone: "info",
    },
  ],
  executiveSummary: {
    title: "Executive Summary",
    body:
      "The AI Engineering Assistant backend demonstrates a highly modular and well-structured architecture with clean separation of concerns and excellent prompt externalization.\n\nThe codebase is clean of style and linting issues. The primary areas requiring attention are test coverage gaps in LLM services, core agents, and tool wrappers, along with minor security and defensive-programming improvements.",
    highlights: [
      "Overall coverage is below the 80% target.",
      "Critical LLM services and orchestration modules require additional tests.",
    ],
  },
  timeline: [
    { id: "git", time: "09:14:02", label: "Git Analysis", status: "completed" },
    {
      id: "bandit",
      time: "09:14:05",
      label: "Bandit Security Analysis",
      status: "completed",
    },
    {
      id: "ruff",
      time: "09:14:08",
      label: "Ruff Style Analysis",
      status: "completed",
    },
    {
      id: "pytest",
      time: "09:14:12",
      label: "Pytest Analysis",
      status: "completed",
    },
    {
      id: "coverage",
      time: "09:14:15",
      label: "Coverage Analysis",
      status: "completed",
    },
    {
      id: "security-agent",
      time: "09:14:18",
      label: "Security Review Agent",
      status: "completed",
    },
    {
      id: "style-agent",
      time: "09:14:20",
      label: "Style Review Agent",
      status: "completed",
    },
    {
      id: "testing-agent",
      time: "09:14:23",
      label: "Testing Review Agent",
      status: "completed",
    },
    {
      id: "architecture-agent",
      time: "09:14:26",
      label: "Architecture Review Agent",
      status: "completed",
    },
    {
      id: "summary",
      time: "09:14:30",
      label: "Executive Summary Generated",
      status: "completed",
    },
    {
      id: "done",
      time: "09:14:32",
      label: "Review Completed",
      status: "completed",
    },
  ],
  coverage: {
    overallPercent: 73.93,
    coveredLines: 763,
    totalLines: 2803,
    available: true,
    modules: [
      { id: "llm", name: "LLM Services", percent: 11.11 },
      { id: "agents", name: "Agents & Crews", percent: 35.09 },
      { id: "tools", name: "Tools", percent: 23.4 },
      { id: "core", name: "Core Application", percent: 87.45 },
    ],
  },
  prioritizedIssues: [
    {
      id: "issue-1",
      title: "Critical LLM Services Lack Coverage",
      severity: "high",
      file: "app/services/llm/gemini.py",
    },
    {
      id: "issue-2",
      title: "Low Coverage on Core Agents and Crews",
      severity: "high",
      file: "agents/intelligence/summary_agent.py",
    },
    {
      id: "issue-3",
      title: "Overall Coverage Below Threshold",
      severity: "medium",
      file: "Not applicable",
    },
  ],
  reports: [
    {
      id: "json",
      name: "JSON Report",
      actionLabel: "Download JSON",
      variant: "json",
    },
    {
      id: "md",
      name: "Markdown Report",
      actionLabel: "Download MD",
      variant: "markdown",
    },
    {
      id: "html",
      name: "HTML Report",
      actionLabel: "View HTML",
      variant: "html",
    },
    {
      id: "all",
      name: "All Reports",
      actionLabel: "Download All",
      variant: "all",
    },
  ],
};
