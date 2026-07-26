#!/usr/bin/env python3
"""Generate only the HTML report from a full review pipeline."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from reports.pipeline import ReviewPipeline  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate HTML review report")
    parser.add_argument("project_path", nargs="?", default=".")
    parser.add_argument("--skip-summary", action="store_true")
    args = parser.parse_args()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")
    result = ReviewPipeline().run(
        args.project_path,
        include_summary=not args.skip_summary,
    )
    path = result["artifacts"].get("html")
    print(json.dumps({"html_report": path, "errors": result["errors"]}, indent=2))
    if path:
        text = Path(path).read_text(encoding="utf-8")
        assert "<html" in text.lower()
        print(text[:1500])
    return 0 if path else 1


if __name__ == "__main__":
    raise SystemExit(main())
