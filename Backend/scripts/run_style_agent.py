#!/usr/bin/env python3
"""Run Style Review Agent independently.

Flow: RuffTool → StyleReviewAgent → structured JSON

Usage:
  python scripts/run_style_agent.py
  python scripts/run_style_agent.py /path/to/project
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from utils.review_cli import print_json, resolve_project_path  # noqa: E402
from agents.review.style_agent import StyleReviewAgent  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from tools.ruff_tool import RuffTool  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Style Review Agent")
    parser.add_argument("project_path", nargs="?", default=".")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")
    project = resolve_project_path(args.project_path)

    ruff_result = RuffTool().timed_run(project)
    print("=== RuffTool output (consumed by agent) ===")
    print_json(
        {
            "success": ruff_result.success,
            "issue_count": ruff_result.data.get("issue_count"),
            "errors": ruff_result.errors,
        }
    )

    agent_result = StyleReviewAgent().run({"ruff_result": ruff_result.to_dict()})
    print("\n=== StyleReviewAgent result ===")
    print_json(agent_result.to_dict())
    return 0 if agent_result.success else 1


if __name__ == "__main__":
    raise SystemExit(main())
