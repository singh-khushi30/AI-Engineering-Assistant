"""Git inspection service for project repositories."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolError, ToolResult

logger = logging.getLogger(__name__)


class GitTool(BaseTool):
    """Inspect Git repository state without mutating the working tree."""

    name = "git"

    def is_git_repository(self, project_path: str | Path) -> bool:
        path = self.validate_project_path(project_path)
        return (path / ".git").exists()

    def get_current_branch(self, project_path: str | Path) -> str:
        path = self._require_git_repo(project_path)
        result = self.run_command(
            [self.ensure_executable("git"), "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=path,
            timeout=30,
        )
        if result.returncode != 0:
            raise ToolError(
                "Failed to resolve current Git branch",
                details={"stderr": result.stderr.strip()},
            )
        branch = result.stdout.strip()
        if not branch:
            raise ToolError("Git returned an empty branch name")
        return branch

    def get_modified_files(self, project_path: str | Path) -> list[str]:
        """Return unstaged modified/deleted files (working tree changes)."""
        path = self._require_git_repo(project_path)
        result = self.run_command(
            [self.ensure_executable("git"), "diff", "--name-only", "--diff-filter=ACDMRTUXB"],
            cwd=path,
            timeout=30,
        )
        if result.returncode != 0:
            raise ToolError(
                "Failed to list modified files",
                details={"stderr": result.stderr.strip()},
            )
        return self._split_lines(result.stdout)

    def get_staged_files(self, project_path: str | Path) -> list[str]:
        """Return files staged for commit."""
        path = self._require_git_repo(project_path)
        result = self.run_command(
            [self.ensure_executable("git"), "diff", "--cached", "--name-only"],
            cwd=path,
            timeout=30,
        )
        if result.returncode != 0:
            raise ToolError(
                "Failed to list staged files",
                details={"stderr": result.stderr.strip()},
            )
        return self._split_lines(result.stdout)

    def get_untracked_files(self, project_path: str | Path) -> list[str]:
        path = self._require_git_repo(project_path)
        result = self.run_command(
            [
                self.ensure_executable("git"),
                "ls-files",
                "--others",
                "--exclude-standard",
            ],
            cwd=path,
            timeout=30,
        )
        if result.returncode != 0:
            raise ToolError(
                "Failed to list untracked files",
                details={"stderr": result.stderr.strip()},
            )
        return self._split_lines(result.stdout)

    def run(self, project_path: str | Path, **kwargs: Any) -> ToolResult:
        """Collect a full Git status snapshot for the given project path."""
        _ = kwargs
        started = time.perf_counter()
        path = self.validate_project_path(project_path)

        is_repo = self.is_git_repository(path)
        data: dict[str, Any] = {
            "project_path": str(path),
            "is_git_repository": is_repo,
            "branch": None,
            "modified_files": [],
            "staged_files": [],
            "untracked_files": [],
        }

        if not is_repo:
            elapsed = time.perf_counter() - started
            logger.info("%s path is not a git repository: %s", self.name, path)
            return self.success_result(
                execution_time=elapsed,
                data=data,
                errors=["Path is not a Git repository"],
            )

        data["branch"] = self.get_current_branch(path)
        data["modified_files"] = self.get_modified_files(path)
        data["staged_files"] = self.get_staged_files(path)
        data["untracked_files"] = self.get_untracked_files(path)

        elapsed = time.perf_counter() - started
        logger.info(
            "%s snapshot complete branch=%s modified=%s staged=%s untracked=%s",
            self.name,
            data["branch"],
            len(data["modified_files"]),
            len(data["staged_files"]),
            len(data["untracked_files"]),
        )
        return self.success_result(execution_time=elapsed, data=data)

    def _require_git_repo(self, project_path: str | Path) -> Path:
        path = self.validate_project_path(project_path)
        if not self.is_git_repository(path):
            raise ToolError(f"Not a Git repository: {path}")
        self.ensure_executable("git")
        return path

    @staticmethod
    def _split_lines(output: str) -> list[str]:
        return [line.strip() for line in output.splitlines() if line.strip()]
