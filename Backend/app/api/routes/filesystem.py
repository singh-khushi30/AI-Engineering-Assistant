"""Local filesystem browse helpers for selecting a repository path."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/filesystem", tags=["filesystem"])


class DirectoryEntry(BaseModel):
    name: str
    path: str
    is_dir: bool = True


class BrowseResponse(BaseModel):
    path: str
    parent: str | None = None
    home: str
    entries: list[DirectoryEntry] = Field(default_factory=list)
    error: str | None = None


def _safe_resolve(path: str | None) -> Path:
    if path is None or not str(path).strip():
        return Path.home().resolve()
    candidate = Path(str(path).strip()).expanduser()
    try:
        return candidate.resolve(strict=False)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid path: {exc}",
        ) from exc


@router.get("/browse", response_model=BrowseResponse)
async def browse_directories(
    path: str | None = Query(
        default=None,
        description="Absolute directory path on the API host. Defaults to the user home.",
    ),
) -> BrowseResponse:
    """List subdirectories under a path so the UI can pick a repository folder.

    Intended for local development where the frontend and FastAPI share a machine.
    """
    home = str(Path.home().resolve())
    current = _safe_resolve(path)

    if not current.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Path does not exist: {current}",
        )
    if not current.is_dir():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Path is not a directory: {current}",
        )

    parent: str | None = None
    if current.parent != current:
        parent = str(current.parent)

    entries: list[DirectoryEntry] = []
    try:
        children = sorted(
            current.iterdir(),
            key=lambda item: (not item.is_dir(), item.name.lower()),
        )
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {current}",
        ) from exc

    for child in children:
        try:
            if not child.is_dir():
                continue
            # Skip common noise / inaccessible entries.
            if child.name in {".Trash", "Library"} and str(current) == home:
                continue
            entries.append(
                DirectoryEntry(
                    name=child.name,
                    path=str(child.resolve(strict=False)),
                    is_dir=True,
                )
            )
        except (OSError, PermissionError):
            continue

    return BrowseResponse(
        path=str(current),
        parent=parent,
        home=home,
        entries=entries,
    )


@router.get("/home", response_model=dict[str, Any])
async def filesystem_home() -> dict[str, Any]:
    """Return common starting locations for the folder picker."""
    home = Path.home().resolve()
    roots: list[dict[str, str]] = [{"name": "Home", "path": str(home)}]
    for name in ("Desktop", "Documents", "Downloads", "Dev", "Projects", "Developer"):
        candidate = home / name
        if candidate.is_dir():
            roots.append({"name": name, "path": str(candidate.resolve())})
    if os.name == "posix" and Path("/").is_dir():
        roots.append({"name": "Root /", "path": "/"})
    return {"home": str(home), "roots": roots}
