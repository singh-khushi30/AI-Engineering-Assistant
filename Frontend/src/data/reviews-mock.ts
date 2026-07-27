import { dashboardMock } from "@/data/dashboard-mock";
import type { ReviewDetail, ReviewListItem } from "@/types/review";

export const reviewsMock: ReviewListItem[] = [
  {
    id: "backend-review",
    projectName: "Backend",
    provider: "Gemini",
    status: "completed",
    coverageLabel: "73.93%",
    testsLabel: "51 passed",
    highLabel: "2",
    mediumLabel: "4",
    lowLabel: "3",
    durationLabel: "20.1s",
    dateLabel: "25 Jul 2026, 09:14 AM",
  },
  {
    id: "sample-fastapi-review",
    projectName: "Sample FastAPI API",
    provider: "Groq",
    status: "completed",
    coverageLabel: "81.42%",
    testsLabel: "67 passed",
    highLabel: "0",
    mediumLabel: "2",
    lowLabel: "4",
    durationLabel: "14.8s",
    dateLabel: "24 Jul 2026, 04:20 PM",
  },
  {
    id: "internal-cli-review",
    projectName: "Internal CLI Tool",
    provider: "OpenRouter",
    status: "failed",
    coverageLabel: "Not available",
    testsLabel: "11 passed, 2 failed",
    highLabel: "Not available",
    mediumLabel: "Not available",
    lowLabel: "Not available",
    durationLabel: "8.4s",
    dateLabel: "23 Jul 2026, 11:02 AM",
  },
];

const backendDetail: ReviewDetail = {
  id: "backend-review",
  projectName: dashboardMock.overview.projectName,
  projectPath: dashboardMock.overview.projectPath,
  provider: dashboardMock.overview.provider,
  status: "completed",
  durationLabel: dashboardMock.overview.durationLabel,
  completedAt: dashboardMock.overview.completedAt,
  coveragePercent: dashboardMock.overview.coveragePercent,
  testsPassed: 51,
  testsFailed: 0,
  executiveSummary: dashboardMock.executiveSummary.body,
  highlights: dashboardMock.executiveSummary.highlights,
  agentResults: dashboardMock.summaryCards.map((card) => ({
    id: card.id,
    title: card.title,
    metric: card.primaryMetric,
    statusLabel: card.statusLabel,
  })),
  prioritizedIssues: dashboardMock.prioritizedIssues,
  timeline: dashboardMock.timeline,
  findingGroups: [
    {
      category: "security",
      label: "Security",
      findings: [
        {
          id: "sec-1",
          title: "Hardcoded Bind to All Interfaces",
          severity: "medium",
          detail:
            "The server defaults to 0.0.0.0, which exposes the application on all network interfaces.",
          file: "app/core/config.py",
          line: 18,
        },
        {
          id: "sec-2",
          title: "Hardcoded Temporary Directory",
          severity: "medium",
          detail:
            "Tests use fixed paths inside /tmp, which may cause race conditions and permission conflicts.",
          file: "tests/test_orchestrator.py",
          line: 42,
        },
        {
          id: "sec-3",
          title: "Broad Exception Catch with Continue",
          severity: "low",
          detail:
            "A broad Exception handler suppresses unexpected runtime failures.",
          file: "agents/intelligence/intelligence.py",
          line: 76,
        },
      ],
    },
    {
      category: "style",
      label: "Style",
      findings: [],
    },
    {
      category: "testing",
      label: "Testing",
      findings: [
        {
          id: "test-1",
          title: "Critical LLM Services Lack Coverage",
          severity: "high",
          detail: "Gemini provider adapter coverage is critically low.",
          file: "app/services/llm/gemini.py",
        },
        {
          id: "test-2",
          title: "Low Coverage on Core Agents and Crews",
          severity: "high",
          detail: "Summary agent and crew orchestration need more tests.",
          file: "agents/intelligence/summary_agent.py",
        },
        {
          id: "test-3",
          title: "Overall Coverage Below Threshold",
          severity: "medium",
          detail: "Overall coverage is 73.93%, below the 80% target.",
          file: "Not applicable",
        },
      ],
    },
    {
      category: "architecture",
      label: "Architecture",
      findings: [
        {
          id: "arch-1",
          title: "Excellent Externalization of Prompts",
          severity: "info",
          detail: "Prompt assets are cleanly separated from Python code.",
          file: "agents/prompts/loader.py",
        },
        {
          id: "arch-2",
          title: "Clear Separation of API and Agent Logic",
          severity: "info",
          detail: "API routes stay thin while agents own review logic.",
          file: "app/api/routes/health.py",
        },
      ],
    },
  ],
  rawJson: {
    project: "Backend",
    provider: "Gemini",
    status: "completed",
    duration_seconds: 20.1,
    coverage_percent: 73.93,
    tests: { passed: 51, failed: 0 },
    findings: {
      security: 3,
      style: 0,
      testing: 4,
      architecture: 2,
    },
    generated_at: "2026-07-25T09:14:32",
  },
};

const cliDetail: ReviewDetail = {
  id: "internal-cli-review",
  projectName: "Internal CLI Tool",
  projectPath: "/Users/khushisingh/Dev/internal-cli",
  provider: "OpenRouter",
  status: "failed",
  durationLabel: "8.4s",
  completedAt: "23 Jul 2026, 11:02 AM",
  coveragePercent: null,
  testsPassed: 11,
  testsFailed: 2,
  executiveSummary:
    "The review failed before full agent synthesis completed. Pytest reported 2 failing tests and coverage artifacts were unavailable.",
  highlights: [
    "Two pytest failures blocked the testing agent.",
    "Coverage and architecture synthesis were skipped.",
  ],
  agentResults: [
    {
      id: "pytest",
      title: "Testing Review",
      metric: "2 Failed",
      statusLabel: "Failed",
    },
  ],
  prioritizedIssues: [
    {
      id: "cli-1",
      title: "Pytest failures interrupted review pipeline",
      severity: "high",
      file: "tests/",
    },
  ],
  timeline: [
    {
      id: "git",
      time: "11:02:01",
      label: "Git Analysis",
      status: "completed",
    },
    {
      id: "pytest",
      time: "11:02:05",
      label: "Pytest Analysis",
      status: "completed",
    },
    {
      id: "failed",
      time: "11:02:09",
      label: "Review Failed",
      status: "completed",
    },
  ],
  findingGroups: [
    {
      category: "testing",
      label: "Testing",
      findings: [
        {
          id: "cli-fail-1",
          title: "Failing CLI parse tests",
          severity: "high",
          detail: "Two parser edge-case tests failed during the review run.",
          file: "tests/test_parser.py",
        },
      ],
    },
  ],
  rawJson: {
    project: "Internal CLI Tool",
    provider: "OpenRouter",
    status: "failed",
    duration_seconds: 8.4,
    tests: { passed: 11, failed: 2 },
    error: "pytest failures interrupted pipeline",
  },
};

const sampleDetail: ReviewDetail = {
  ...backendDetail,
  id: "sample-fastapi-review",
  projectName: "Sample FastAPI API",
  projectPath: "/Users/khushisingh/Dev/sample-fastapi",
  provider: "Groq",
  coveragePercent: 81.42,
  testsPassed: 67,
  testsFailed: 0,
  durationLabel: "14.8s",
  completedAt: "24 Jul 2026, 04:20 PM",
  executiveSummary:
    "The Sample FastAPI API review completed successfully with strong coverage and only low-to-medium style and testing notes.",
  rawJson: {
    project: "Sample FastAPI API",
    provider: "Groq",
    status: "completed",
    coverage_percent: 81.42,
    tests: { passed: 67, failed: 0 },
  },
};

export const reviewDetailsMock: Record<string, ReviewDetail> = {
  "backend-review": backendDetail,
  "internal-cli-review": cliDetail,
  "sample-fastapi-review": sampleDetail,
};

export function getReviewById(id: string): ReviewDetail | undefined {
  return reviewDetailsMock[id];
}
