"""Bandit security scanning service."""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class BanditTool(BaseTool):
    """Run Bandit and return security findings with severity and confidence."""

    name = "bandit"
    default_timeout = 180.0

    def run(
        self,
        project_path: str | Path,
        *,
        targets: list[str] | None = None,
        severity_level: str = "low",
        confidence_level: str = "low",
        **kwargs: Any,
    ) -> ToolResult:
        _ = kwargs
        started = time.perf_counter()
        path = self.validate_project_path(project_path)

        scan_targets = targets or ["."]
        command = [
            sys.executable,
            "-m",
            "bandit",
            "-r",
            *scan_targets,
            "-f",
            "json",
            "-q",
            "-x",
            ",".join(
                [
                    ".venv",
                    "venv",
                    ".git",
                    "__pycache__",
                    ".pytest_cache",
                    "node_modules",
                ]
            ),
        ]
        command.extend(self._severity_flags(severity_level))
        command.extend(self._confidence_flags(confidence_level))

        logger.info("%s scanning %s targets=%s", self.name, path, scan_targets)
        result = self.run_command(command, cwd=path, timeout=self.default_timeout)
        elapsed = time.perf_counter() - started

        if result.executable_missing:
            return self.failure(
                execution_time=elapsed,
                errors=["bandit is not installed in the active Python environment"],
            )
        if result.timed_out:
            return self.failure(
                execution_time=elapsed,
                errors=[f"bandit timed out after {self.default_timeout} seconds"],
                data={"stdout": result.stdout, "stderr": result.stderr},
            )

        if not result.stdout.strip():
            return self.failure(
                execution_time=elapsed,
                errors=[
                    result.stderr.strip()
                    or f"bandit produced no JSON output (returncode={result.returncode})"
                ],
            )

        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            return self.failure(
                execution_time=elapsed,
                errors=[f"Failed to parse bandit JSON output: {exc}"],
                data={"stdout": result.stdout, "stderr": result.stderr},
            )

        findings = [
            {
                "filename": item.get("filename"),
                "test_id": item.get("test_id"),
                "test_name": item.get("test_name"),
                "issue_severity": item.get("issue_severity"),
                "issue_confidence": item.get("issue_confidence"),
                "issue_text": item.get("issue_text"),
                "line_number": item.get("line_number"),
                "line_range": item.get("line_range"),
                "more_info": item.get("more_info"),
                "code": item.get("code"),
            }
            for item in payload.get("results", [])
        ]

        data: dict[str, Any] = {
            "project_path": str(path),
            "finding_count": len(findings),
            "findings": findings,
            "metrics": payload.get("metrics", {}),
            "errors_from_bandit": payload.get("errors", []),
            "returncode": result.returncode,
            "command": result.command,
        }

        # Bandit exits non-zero when findings exist; treat that as a successful scan.
        success = result.returncode in (0, 1)
        errors: list[str] = []
        if not success:
            errors.append(
                result.stderr.strip()
                or f"bandit exited with unexpected return code {result.returncode}"
            )

        logger.info(
            "%s finished finding_count=%s success=%s",
            self.name,
            len(findings),
            success,
        )
        return ToolResult(
            success=success,
            tool=self.name,
            execution_time=round(elapsed, 3),
            data=data,
            errors=errors,
        )

    @staticmethod
    def _severity_flags(level: str) -> list[str]:
        normalized = level.lower()
        if normalized == "medium":
            return ["-ll"]
        if normalized == "high":
            return ["-lll"]
        return []

    @staticmethod
    def _confidence_flags(level: str) -> list[str]:
        normalized = level.lower()
        if normalized == "medium":
            return ["-ii"]
        if normalized == "high":
            return ["-iii"]
        return []
