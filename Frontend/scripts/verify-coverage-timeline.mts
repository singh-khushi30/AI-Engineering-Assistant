/**
 * Lightweight mapper checks (no test runner dependency).
 * Run: npx --yes tsx scripts/verify-coverage-timeline.mts
 */
import assert from "node:assert/strict";

import {
  groupCoverageByArea,
  mapApiCoverage,
  mapApiTimeline,
  normalizeCoveragePercentage,
} from "../src/lib/coverage-timeline";

assert.equal(normalizeCoveragePercentage(73.93), 73.93);
assert.equal(normalizeCoveragePercentage(0.7393), 73.93);
assert.equal(normalizeCoveragePercentage(Number.NaN), null);
assert.equal(normalizeCoveragePercentage(-1), null);

const coverage = mapApiCoverage({
  aggregated_review: {
    tools: {
      coverage: {
        data: {
          percent_covered: 73.93,
          covered_lines: 2737,
          num_statements: 3500,
          files: {
            "app/services/llm/gemini.py": {
              summary: { percent_covered: 11.11, covered_lines: 10, num_statements: 90 },
            },
            "agents/base_agent.py": {
              summary: { percent_covered: 100, covered_lines: 7, num_statements: 7 },
            },
            "tools/bandit_tool.py": {
              summary: { percent_covered: 50, covered_lines: 5, num_statements: 10 },
            },
            "app/main.py": {
              summary: { percent_covered: 80, covered_lines: 8, num_statements: 10 },
            },
          },
        },
      },
    },
  },
});

assert.equal(coverage.overallPercent, 73.93);
assert.equal(coverage.coveredLines, 2737);
assert.equal(coverage.totalLines, 3500);
assert.ok(coverage.modules.some((m) => m.name === "LLM Services"));
assert.ok(coverage.modules.some((m) => m.name === "Agents & Crews"));
assert.ok(coverage.modules.some((m) => m.name === "Tools"));
assert.ok(coverage.modules.some((m) => m.name === "Core Application"));

const missing = mapApiCoverage({ aggregated_review: { tools: {} } });
assert.equal(missing.available, false);
assert.equal(missing.modules.length, 0);

const grouped = groupCoverageByArea([
  {
    name: "app/services/llm/a.py",
    percentage: 10,
    coveredLines: 1,
    totalLines: 10,
  },
]);
assert.equal(grouped.length, 1);
assert.equal(grouped[0]?.name, "LLM Services");

const timeline = mapApiTimeline([], {
  started_at: null,
  completed_at: null,
  created_at: "2026-01-01T00:00:00Z",
  result: {
    aggregated_review: {
      timings: { git: 0.2, coverage: 1.5 },
    },
  },
  status: "completed",
});
assert.equal(timeline.unavailable, false);
assert.ok(timeline.steps.some((s) => s.id === "git"));
assert.ok(timeline.steps.some((s) => s.id === "coverage"));

const empty = mapApiTimeline([], {
  started_at: null,
  completed_at: null,
  created_at: "",
  result: null,
  status: "completed",
});
assert.equal(empty.unavailable, true);
assert.equal(empty.steps.length, 0);

const invalidTs = mapApiTimeline(
  [{ id: "git", label: "Git analysis", status: "completed" }],
  {
    started_at: "not-a-date",
    completed_at: null,
    created_at: "also-bad",
    result: null,
    status: "completed",
  },
);
assert.equal(invalidTs.steps[0]?.time, "—");

console.log("coverage-timeline mapper checks passed");
