#!/usr/bin/env python3
"""Run Architecture Review Agent independently.

Flow: project structure scan (+ optional GitTool) → ArchitectureReviewAgent

Usage:
  python scripts/run_architecture_agent.py
  python scripts/run_architecture_agent.py /path/to/project
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from utils.review_cli import print_json, resolve_project_path  # noqa: E402
from agents.review.architecture_agent import ArchitectureReviewAgent  # noqa: E402
from agents.review.project_scanner import scan_project_structure  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from tools.git_tool import GitTool  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Architecture Review Agent")
    parser.add_argument("project_path", nargs="?", default=".")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")
    project = resolve_project_path(args.project_path)

    structure = scan_project_structure(project)
    git_result = GitTool().timed_run(project)

    print("=== Project structure snapshot (consumed by agent) ===")
    print_json(
        {
            "top_level": structure.get("top_level"),
            "directory_count": structure.get("directory_count"),
            "file_count": structure.get("file_count"),
            "git_is_repo": git_result.data.get("is_git_repository"),
        }
    )

    agent_result = ArchitectureReviewAgent().run(
        {
            "project_structure": structure,
            "git_result": git_result.to_dict(),
        }
    )
    print("\n=== ArchitectureReviewAgent result ===")
    print_json(agent_result.to_dict())
    return 0 if agent_result.success else 1


if __name__ == "__main__":
    raise SystemExit(main())
