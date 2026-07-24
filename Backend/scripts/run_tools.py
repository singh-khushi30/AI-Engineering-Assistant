#!/usr/bin/env python3
"""Run individual developer tools from the terminal for manual verification.

Examples:
  python scripts/run_tools.py git .
  python scripts/run_tools.py pytest .
  python scripts/run_tools.py coverage .
  python scripts/run_tools.py ruff .
  python scripts/run_tools.py bandit .
  python scripts/run_tools.py all .
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Callable

# Ensure Backend/ is on sys.path when invoked as a script.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from tools.bandit_tool import BanditTool  # noqa: E402
from tools.base_tool import BaseTool, ToolResult  # noqa: E402
from tools.coverage_tool import CoverageTool  # noqa: E402
from tools.git_tool import GitTool  # noqa: E402
from tools.pytest_tool import PytestTool  # noqa: E402
from tools.ruff_tool import RuffTool  # noqa: E402

ToolFactory = Callable[[], BaseTool]

TOOL_REGISTRY: dict[str, ToolFactory] = {
    "git": GitTool,
    "pytest": PytestTool,
    "coverage": CoverageTool,
    "ruff": RuffTool,
    "bandit": BanditTool,
}


def configure_cli_logging(verbose: bool) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run_tool(name: str, project_path: Path) -> ToolResult:
    tool = TOOL_REGISTRY[name]()
    return tool.timed_run(project_path)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Execute AI Engineering Assistant developer tools independently.",
    )
    parser.add_argument(
        "tool",
        choices=[*TOOL_REGISTRY.keys(), "all"],
        help="Tool to execute",
    )
    parser.add_argument(
        "project_path",
        nargs="?",
        default=".",
        help="Path to the target project (default: current directory)",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    configure_cli_logging(args.verbose)

    project_path = Path(args.project_path).expanduser().resolve()
    selected = list(TOOL_REGISTRY.keys()) if args.tool == "all" else [args.tool]

    exit_code = 0
    for name in selected:
        result = run_tool(name, project_path)
        print(json.dumps(result.to_dict(), indent=2, default=str))
        if not result.success:
            exit_code = 1

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
