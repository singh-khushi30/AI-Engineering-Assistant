import type { ReportItem } from "@/types/report";

export const reportsMock: ReportItem[] = [
  {
    id: "backend-json",
    fileName: "Backend-review.json",
    format: "json",
    project: "Backend",
    generatedAt: "25 Jul 2026, 09:14 AM",
    sizeLabel: "48 KB",
    provider: "Gemini",
    preview: JSON.stringify(
      {
        project: "Backend",
        provider: "Gemini",
        status: "completed",
        coverage_percent: 73.93,
        tests: { passed: 51, failed: 0 },
        findings: { security: 3, style: 0, testing: 4, architecture: 2 },
      },
      null,
      2,
    ),
  },
  {
    id: "backend-md",
    fileName: "Backend-review.md",
    format: "markdown",
    project: "Backend",
    generatedAt: "25 Jul 2026, 09:14 AM",
    sizeLabel: "12 KB",
    provider: "Gemini",
    preview: `# Backend Review

**Provider:** Gemini  
**Status:** Completed  
**Coverage:** 73.93%

## Executive Summary

The backend demonstrates a modular architecture with clean separation of concerns.

## Top Issues

- Critical LLM Services Lack Coverage
- Low Coverage on Core Agents and Crews
- Overall Coverage Below Threshold
`,
  },
  {
    id: "backend-html",
    fileName: "Backend-review.html",
    format: "html",
    project: "Backend",
    generatedAt: "25 Jul 2026, 09:14 AM",
    sizeLabel: "26 KB",
    provider: "Gemini",
    preview: `<!DOCTYPE html>
<html>
  <body>
    <h1>Backend Review</h1>
    <p>Provider: Gemini · Coverage: 73.93% · Tests: 51 passed</p>
    <h2>Executive Summary</h2>
    <p>Modular architecture with prompt externalization and clean tooling layers.</p>
  </body>
</html>`,
  },
];
