#!/usr/bin/env python3
"""Run Security Review Agent independently.

Flow: BanditTool → SecurityReviewAgent → structured JSON

Usage:
  python scripts/run_security_agent.py
  python scripts/run_security_agent.py /path/to/project
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from utils.review_cli import print_json, resolve_project_path  # noqa: E402
from agents.review.security_agent import SecurityReviewAgent  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from tools.bandit_tool import BanditTool  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Security Review Agent")
    parser.add_argument("project_path", nargs="?", default=".")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")
    project = resolve_project_path(args.project_path)

    bandit_result = BanditTool().timed_run(project)
    print("=== BanditTool output (consumed by agent) ===")
    print_json(
        {
            "success": bandit_result.success,
            "finding_count": bandit_result.data.get("finding_count"),
            "errors": bandit_result.errors,
        }
    )

    agent_result = SecurityReviewAgent().run({"bandit_result": bandit_result.to_dict()})
    print("\n=== SecurityReviewAgent result ===")
    print_json(agent_result.to_dict())
    return 0 if agent_result.success else 1


if __name__ == "__main__":
    raise SystemExit(main())
