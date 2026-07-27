import type { FindingsPageData } from "@/types/finding";

export const findingsPagesMock: Record<string, FindingsPageData> = {
  security: {
    category: "security",
    title: "Security Findings",
    description: "Bandit-backed security review findings for the latest Backend run.",
    statusLabel: "Medium Risk",
    statusTone: "warning",
    findings: [
      {
        id: "sec-1",
        title: "Hardcoded Bind to All Interfaces",
        severity: "medium",
        file: "app/core/config.py",
        line: 18,
        category: "Insecure Binding",
        detail:
          "The server defaults to 0.0.0.0, which exposes the application on all network interfaces.",
        recommendation:
          "Use 127.0.0.1 as the local default and override it through environment variables in deployment environments.",
      },
      {
        id: "sec-2",
        title: "Hardcoded Temporary Directory",
        severity: "medium",
        file: "tests/test_orchestrator.py",
        line: 42,
        category: "Insecure Temporary File",
        detail:
          "Tests use fixed paths inside /tmp, which may cause race conditions and permission conflicts.",
        recommendation: "Use Python tempfile fixtures or pytest tmp_path.",
      },
      {
        id: "sec-3",
        title: "Broad Exception Catch with Continue",
        severity: "low",
        file: "agents/intelligence/intelligence.py",
        line: 76,
        category: "Error Handling",
        detail:
          "A broad Exception handler suppresses unexpected runtime failures.",
        recommendation:
          "Catch known exceptions and log failure context before continuing.",
      },
    ],
  },
  style: {
    category: "style",
    title: "Style Findings",
    description: "Ruff style and lint findings for the latest Backend run.",
    statusLabel: "Excellent",
    statusTone: "success",
    findings: [],
    emptyTitle: "No style issues detected",
    emptyDescription: "Ruff completed successfully with no active findings.",
    scanSummary: {
      filesScanned: 48,
      rulesChecked: 120,
      executionTime: "1.2s",
    },
  },
  testing: {
    category: "testing",
    title: "Testing Findings",
    description: "Pytest and coverage insights for the latest Backend run.",
    statusLabel: "Below Target",
    statusTone: "warning",
    coverageOverview: {
      overall: 73.93,
      target: 80,
      gap: 6.07,
      testsPassed: 51,
      failed: 0,
    },
    findings: [
      {
        id: "test-1",
        title: "Critical LLM Services Lack Coverage",
        severity: "high",
        file: "app/services/llm/gemini.py",
        category: "Coverage Gap",
        coverageLabel: "11.11%",
        detail:
          "Critical LLM adapter coverage is too low for production confidence.",
        recommendation:
          "Add unit tests for Gemini provider success, timeout, and auth failure paths.",
      },
      {
        id: "test-2",
        title: "Low Coverage on Core Agents and Crews",
        severity: "high",
        file: "agents/intelligence/summary_agent.py",
        category: "Coverage Gap",
        coverageLabel: "33.33%",
        detail: "Summary agent and crew orchestration need more tests.",
        recommendation:
          "Cover summary parsing, fallback behavior, and aggregation edge cases.",
      },
      {
        id: "test-3",
        title: "Overall Coverage Below Threshold",
        severity: "medium",
        file: "Not applicable",
        category: "Coverage Threshold",
        coverageLabel: "73.93%",
        detail: "Overall coverage is below the configured 80% target.",
        recommendation:
          "Prioritize LLM services, agents, and tool wrappers for new tests.",
      },
      {
        id: "test-4",
        title: "Low Coverage on Tooling Modules",
        severity: "medium",
        file: "tools/coverage_tool.py",
        category: "Coverage Gap",
        coverageLabel: "21.88%",
        detail: "Coverage tool wrappers remain lightly tested.",
        recommendation:
          "Add fixture-based tests for parse success and malformed report handling.",
      },
    ],
  },
  architecture: {
    category: "architecture",
    title: "Architecture Findings",
    description: "Structure and modularity observations for the latest Backend run.",
    statusLabel: "Excellent",
    statusTone: "success",
    architectureScore: "Excellent",
    strengths: [
      "Modular project structure",
      "Prompt assets separated from code",
      "Agent orchestration separated from API concerns",
      "Typed schemas and report pipeline",
    ],
    findings: [
      {
        id: "arch-1",
        title: "Excellent Externalization of Prompts",
        severity: "info",
        file: "agents/prompts/loader.py",
        category: "Maintainability",
        detail:
          "Prompt assets are externalized into dedicated text files and loaded dynamically.",
        recommendation:
          "Continue keeping prompt revisions outside Python modules.",
      },
      {
        id: "arch-2",
        title: "Clear Separation of API and Agent Logic",
        severity: "info",
        file: "app/api/routes/health.py",
        category: "Separation of Concerns",
        detail:
          "API routes remain thin while agent and orchestration logic live in dedicated packages.",
        recommendation:
          "Preserve this boundary as new endpoints are introduced.",
      },
      {
        id: "arch-3",
        title: "Inconsistent Agent Placement Across Directories",
        severity: "low",
        file: "agents/intelligence/summary_agent.py",
        category: "Modularity",
        detail:
          "Some intelligence agents sit beside orchestration utilities, which can blur ownership over time.",
        recommendation:
          "Document ownership rules or group summary agents under a clearer package boundary.",
      },
    ],
  },
};
