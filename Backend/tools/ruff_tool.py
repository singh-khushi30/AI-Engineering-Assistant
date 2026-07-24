"""Ruff linting service."""

from __future__ import annotations

import json
import logging
import sys
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class RuffTool(BaseTool):
    """Run Ruff and return lint issues grouped by file."""

    name = "ruff"
    default_timeout = 120.0

    def run(
        self,
        project_path: str | Path,
        *,
        paths: list[str] | None = None,
        select: list[str] | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        _ = kwargs
        started = time.perf_counter()
        path = self.validate_project_path(project_path)

        command = [
            sys.executable,
            "-m",
            "ruff",
            "check",
            "--output-format",
            "json",
            "--exclude",
            ".venv,venv,.git,__pycache__,.pytest_cache,node_modules",
        ]
        if select:
            command.extend(["--select", ",".join(select)])

        targets = paths or ["."]
        command.extend(targets)

        logger.info("%s checking %s targets=%s", self.name, path, targets)
        result = self.run_command(command, cwd=path, timeout=self.default_timeout)
        elapsed = time.perf_counter() - started

        if result.executable_missing:
            return self.failure(
                execution_time=elapsed,
                errors=["ruff is not installed in the active Python environment"],
            )
        if result.timed_out:
            return self.failure(
                execution_time=elapsed,
                errors=[f"ruff timed out after {self.default_timeout} seconds"],
                data={"stdout": result.stdout, "stderr": result.stderr},
            )

        # Ruff returns 0 (clean), 1 (issues found), or other non-zero on hard failure.
        issues: list[dict[str, Any]]
        if result.stdout.strip():
            try:
                parsed = json.loads(result.stdout)
                if not isinstance(parsed, list):
                    raise ValueError("Expected a JSON array of issues")
                issues = parsed
            except (json.JSONDecodeError, ValueError) as exc:
                return self.failure(
                    execution_time=elapsed,
                    errors=[f"Failed to parse ruff JSON output: {exc}"],
                    data={"stdout": result.stdout, "stderr": result.stderr},
                )
        else:
            issues = []

        if result.returncode not in (0, 1):
            return self.failure(
                execution_time=elapsed,
                errors=[
                    result.stderr.strip()
                    or f"ruff exited with unexpected return code {result.returncode}"
                ],
                data={"stdout": result.stdout},
            )

        grouped = self._group_by_file(issues)
        data: dict[str, Any] = {
            "project_path": str(path),
            "issue_count": len(issues),
            "file_count": len(grouped),
            "issues_by_file": grouped,
            "issues": issues,
            "returncode": result.returncode,
            "command": result.command,
        }

        logger.info(
            "%s finished issue_count=%s file_count=%s",
            self.name,
            len(issues),
            len(grouped),
        )
        return self.success_result(execution_time=elapsed, data=data)

    def _group_by_file(self, issues: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for issue in issues:
            filename = str(issue.get("filename") or issue.get("file") or "unknown")
            grouped[filename].append(
                {
                    "code": issue.get("code"),
                    "message": issue.get("message"),
                    "location": issue.get("location"),
                    "end_location": issue.get("end_location"),
                    "url": issue.get("url"),
                    "fix": issue.get("fix"),
                }
            )
        return dict(grouped)
