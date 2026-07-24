"""Pytest execution service."""

from __future__ import annotations

import logging
import re
import sys
import time
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolResult

logger = logging.getLogger(__name__)

_SUMMARY_RE = re.compile(
    r"(?P<failed>\d+)\s+failed|"
    r"(?P<passed>\d+)\s+passed|"
    r"(?P<skipped>\d+)\s+skipped|"
    r"(?P<errors>\d+)\s+error|"
    r"(?P<xfailed>\d+)\s+xfailed|"
    r"(?P<xpassed>\d+)\s+xpassed",
    re.IGNORECASE,
)


class PytestTool(BaseTool):
    """Run pytest and return a structured pass/fail summary."""

    name = "pytest"
    default_timeout = 300.0

    def run(
        self,
        project_path: str | Path,
        *,
        test_path: str | None = None,
        extra_args: list[str] | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        _ = kwargs
        started = time.perf_counter()
        path = self.validate_project_path(project_path)

        command = [
            sys.executable,
            "-m",
            "pytest",
            "-q",
            "--tb=short",
        ]
        if test_path:
            command.append(test_path)
        if extra_args:
            command.extend(extra_args)

        logger.info("%s starting in %s", self.name, path)
        result = self.run_command(command, cwd=path, timeout=self.default_timeout)
        elapsed = time.perf_counter() - started

        if result.executable_missing:
            return self.failure(
                execution_time=elapsed,
                errors=["pytest is not installed in the active Python environment"],
            )
        if result.timed_out:
            return self.failure(
                execution_time=elapsed,
                errors=[f"pytest timed out after {self.default_timeout} seconds"],
                data={"stdout": result.stdout, "stderr": result.stderr},
            )

        summary = self._parse_summary(result.stdout + "\n" + result.stderr)
        passed = result.returncode == 0
        errors: list[str] = []
        if not passed:
            if result.stderr.strip():
                errors.append(result.stderr.strip())
            elif result.stdout.strip():
                errors.append("pytest failed; see data.stdout for details")

        data: dict[str, Any] = {
            "project_path": str(path),
            "passed": passed,
            "returncode": result.returncode,
            "summary": summary,
            "command": result.command,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }

        logger.info(
            "%s finished passed=%s returncode=%s summary=%s",
            self.name,
            passed,
            result.returncode,
            summary,
        )
        return ToolResult(
            success=passed,
            tool=self.name,
            execution_time=round(elapsed, 3),
            data=data,
            errors=errors,
        )

    def _parse_summary(self, output: str) -> dict[str, int]:
        counts = {
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": 0,
            "xfailed": 0,
            "xpassed": 0,
        }
        for match in _SUMMARY_RE.finditer(output):
            for key, value in match.groupdict().items():
                if value is not None and key in counts:
                    counts[key] = int(value)
        return counts
