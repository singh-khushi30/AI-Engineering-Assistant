#!/usr/bin/env python3
"""Run Testing Review Agent independently.

Flow: PytestTool + CoverageTool → TestingReviewAgent → structured JSON

Usage:
  python scripts/run_testing_agent.py
  python scripts/run_testing_agent.py /path/to/project
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from utils.review_cli import print_json, resolve_project_path  # noqa: E402
from agents.review.testing_agent import TestingReviewAgent  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from tools.coverage_tool import CoverageTool  # noqa: E402
from tools.pytest_tool import PytestTool  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Testing Review Agent")
    parser.add_argument("project_path", nargs="?", default=".")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")
    project = resolve_project_path(args.project_path)

    pytest_result = PytestTool().timed_run(project)
    coverage_result = CoverageTool().timed_run(project)

    print("=== PytestTool / CoverageTool output (consumed by agent) ===")
    print_json(
        {
            "pytest_passed": pytest_result.data.get("passed"),
            "coverage_percent": coverage_result.data.get("percent_covered"),
            "pytest_errors": pytest_result.errors,
            "coverage_errors": coverage_result.errors,
        }
    )

    agent_result = TestingReviewAgent().run(
        {
            "pytest_result": pytest_result.to_dict(),
            "coverage_result": coverage_result.to_dict(),
        }
    )
    print("\n=== TestingReviewAgent result ===")
    print_json(agent_result.to_dict())
    return 0 if agent_result.success else 1


if __name__ == "__main__":
    raise SystemExit(main())
