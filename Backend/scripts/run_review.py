#!/usr/bin/env python3
"""Run full review + intelligence + JSON/Markdown/HTML reports.

Usage:
  python scripts/run_review.py
  python scripts/run_review.py /path/to/project
  python scripts/run_review.py /path/to/project --skip-summary
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.llm_config import get_llm_config  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from reports.pipeline import ReviewPipeline  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run full AI Engineering Assistant review with reports"
    )
    parser.add_argument("project_path", nargs="?", default=".")
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Directory for generated reports (default: REPORTS_DIR)",
    )
    parser.add_argument(
        "--skip-summary",
        action="store_true",
        help="Skip Summary Agent (still scores + formats)",
    )
    args = parser.parse_args()

    get_settings.cache_clear()
    get_llm_config.cache_clear()
    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")

    result = ReviewPipeline().run(
        args.project_path,
        output_dir=args.output_dir,
        include_summary=not args.skip_summary,
    )
    print(json.dumps(result["report"], indent=2, default=str))
    print("\n=== Artifacts ===")
    print(json.dumps(result["artifacts"], indent=2))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
