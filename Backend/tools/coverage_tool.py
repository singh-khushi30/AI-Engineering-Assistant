"""Code coverage measurement service."""

from __future__ import annotations

import json
import logging
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

from tools.base_tool import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class CoverageTool(BaseTool):
    """Run coverage.py against the project test suite and return totals."""

    name = "coverage"
    default_timeout = 300.0

    def run(
        self,
        project_path: str | Path,
        *,
        test_path: str | None = None,
        source: str | None = None,
        **kwargs: Any,
    ) -> ToolResult:
        _ = kwargs
        started = time.perf_counter()
        path = self.validate_project_path(project_path)

        run_command = [
            sys.executable,
            "-m",
            "coverage",
            "run",
            "--branch",
            "-m",
            "pytest",
            "-q",
            "--tb=line",
        ]
        if source:
            # Insert after `coverage run` flags for source restriction.
            run_command = [
                sys.executable,
                "-m",
                "coverage",
                "run",
                "--branch",
                f"--source={source}",
                "-m",
                "pytest",
                "-q",
                "--tb=line",
            ]
        if test_path:
            run_command.append(test_path)

        logger.info("%s collecting coverage in %s", self.name, path)
        run_result = self.run_command(run_command, cwd=path, timeout=self.default_timeout)
        if run_result.executable_missing:
            elapsed = time.perf_counter() - started
            return self.failure(
                execution_time=elapsed,
                errors=["coverage is not installed in the active Python environment"],
            )
        if run_result.timed_out:
            elapsed = time.perf_counter() - started
            return self.failure(
                execution_time=elapsed,
                errors=[f"coverage run timed out after {self.default_timeout} seconds"],
                data={"stdout": run_result.stdout, "stderr": run_result.stderr},
            )

        with tempfile.TemporaryDirectory(prefix="coverage_") as tmp_dir:
            report_path = Path(tmp_dir) / "coverage.json"
            report_command = [
                sys.executable,
                "-m",
                "coverage",
                "json",
                "-o",
                str(report_path),
            ]
            report_result = self.run_command(
                report_command,
                cwd=path,
                timeout=60,
            )

            if report_result.returncode != 0 or not report_path.exists():
                elapsed = time.perf_counter() - started
                return self.failure(
                    execution_time=elapsed,
                    errors=[
                        "Failed to generate coverage JSON report",
                        report_result.stderr.strip() or report_result.stdout.strip(),
                    ],
                    data={
                        "run_returncode": run_result.returncode,
                        "run_stdout": run_result.stdout,
                        "run_stderr": run_result.stderr,
                    },
                )

            try:
                payload = json.loads(report_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError as exc:
                elapsed = time.perf_counter() - started
                return self.failure(
                    execution_time=elapsed,
                    errors=[f"Invalid coverage JSON: {exc}"],
                )

        totals = payload.get("totals", {})
        percent_covered = float(totals.get("percent_covered", 0.0))
        elapsed = time.perf_counter() - started

        data: dict[str, Any] = {
            "project_path": str(path),
            "percent_covered": round(percent_covered, 2),
            "covered_lines": totals.get("covered_lines"),
            "num_statements": totals.get("num_statements"),
            "missing_lines": totals.get("missing_lines"),
            "excluded_lines": totals.get("excluded_lines"),
            "num_branches": totals.get("num_branches"),
            "covered_branches": totals.get("covered_branches"),
            "percent_covered_display": totals.get("percent_covered_display"),
            "files": {
                file_name: {
                    "summary": file_data.get("summary", {}),
                }
                for file_name, file_data in payload.get("files", {}).items()
            },
            "pytest_returncode": run_result.returncode,
            "pytest_stdout": run_result.stdout,
            "pytest_stderr": run_result.stderr,
        }

        # Coverage collection can succeed even when some tests fail.
        success = report_result.returncode == 0
        errors: list[str] = []
        if run_result.returncode != 0:
            errors.append(
                f"Tests exited with return code {run_result.returncode}; "
                "coverage was still collected from the run"
            )

        logger.info(
            "%s finished percent_covered=%.2f success=%s",
            self.name,
            percent_covered,
            success,
        )
        return ToolResult(
            success=success,
            tool=self.name,
            execution_time=round(elapsed, 3),
            data=data,
            errors=errors,
        )
