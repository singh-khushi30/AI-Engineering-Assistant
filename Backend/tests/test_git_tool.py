"""Tests for GitTool repository root detection."""

from __future__ import annotations

from pathlib import Path

from tools.git_tool import GitTool


def test_git_tool_resolves_nested_backend_to_repo_root() -> None:
    backend = Path(__file__).resolve().parents[1]
    repo_root = backend.parent
    tool = GitTool()

    assert tool.is_git_repository(backend) is True
    resolved = tool.resolve_git_root(backend)
    assert resolved is not None
    assert resolved == repo_root.resolve()

    result = tool.run(backend)
    assert result.success is True
    assert result.data["is_git_repository"] is True
    assert Path(result.data["git_root"]).resolve() == repo_root.resolve()
    assert result.data["branch"]
    assert "not inside a Git repository" not in " ".join(result.errors).lower()


def test_git_tool_reports_false_outside_any_repo(tmp_path: Path) -> None:
    tool = GitTool()
    result = tool.run(tmp_path)
    assert result.success is True
    assert result.data["is_git_repository"] is False
    assert result.data["git_root"] is None
    assert result.errors
