"""Shared helpers for Phase 1.3B standalone review-agent scripts."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def print_json(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, indent=2, default=str))


def resolve_project_path(raw: str | None) -> Path:
    path = Path(raw or ".").expanduser().resolve()
    if not path.exists() or not path.is_dir():
        raise SystemExit(f"Invalid project path: {path}")
    return path
