"""Helpers for serving persisted review report artifacts."""

from __future__ import annotations

from pathlib import Path
from typing import Any

FORMAT_ALIASES: dict[str, tuple[str, ...]] = {
    "json": ("json",),
    "markdown": ("markdown", "md"),
    "md": ("markdown", "md"),
    "html": ("html",),
}

CONTENT_TYPES: dict[str, str] = {
    "json": "application/json; charset=utf-8",
    "markdown": "text/markdown; charset=utf-8",
    "md": "text/markdown; charset=utf-8",
    "html": "text/html; charset=utf-8",
}


def normalize_report_format(format_name: str) -> str | None:
    key = format_name.strip().lower()
    if key in FORMAT_ALIASES:
        return "markdown" if key == "md" else key
    return None


def resolve_artifact_path(result: dict[str, Any] | None, format_name: str) -> Path | None:
    if not result:
        return None
    artifacts = result.get("artifacts")
    if not isinstance(artifacts, dict):
        return None

    aliases = FORMAT_ALIASES.get(format_name.strip().lower())
    if not aliases:
        return None

    for key in aliases:
        value = artifacts.get(key)
        if isinstance(value, str) and value.strip():
            path = Path(value).expanduser().resolve()
            if path.is_file():
                return path
    return None


def media_type_for_format(format_name: str) -> str:
    return CONTENT_TYPES.get(format_name.strip().lower(), "application/octet-stream")
