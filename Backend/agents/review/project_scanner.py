"""Lightweight project structure scanner for the Architecture Review Agent."""

from __future__ import annotations

from pathlib import Path
from typing import Any

IGNORE_DIRS = {
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    ".crewai",
    "node_modules",
    ".idea",
    ".vscode",
    "dist",
    "build",
    ".eggs",
}


def scan_project_structure(project_path: str | Path, *, max_depth: int = 4) -> dict[str, Any]:
    """Return a factual directory/file inventory (no opinions)."""
    root = Path(project_path).expanduser().resolve()
    if not root.exists():
        raise FileNotFoundError(f"Project path does not exist: {root}")
    if not root.is_dir():
        raise NotADirectoryError(f"Project path is not a directory: {root}")

    directories: list[str] = []
    files: list[str] = []

    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root)
        if any(part in IGNORE_DIRS for part in relative.parts):
            continue
        if len(relative.parts) > max_depth:
            continue
        rel_str = relative.as_posix()
        if path.is_dir():
            directories.append(rel_str)
        elif path.is_file():
            files.append(rel_str)

    top_level = sorted(
        p.name for p in root.iterdir() if p.name not in IGNORE_DIRS and not p.name.startswith(".")
    )

    return {
        "project_path": str(root),
        "top_level": top_level,
        "directories": directories[:500],
        "files": files[:1000],
        "directory_count": len(directories),
        "file_count": len(files),
        "truncated": len(files) > 1000 or len(directories) > 500,
    }
