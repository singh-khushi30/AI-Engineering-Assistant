"""Run the Tool Layer once and populate ``ReviewContext``."""

from __future__ import annotations

import logging
import time
from typing import Any, Callable

from agents.orchestration.context import ReviewContext
from agents.review.project_scanner import scan_project_structure
from tools.bandit_tool import BanditTool
from tools.coverage_tool import CoverageTool
from tools.git_tool import GitTool
from tools.pytest_tool import PytestTool
from tools.ruff_tool import RuffTool

logger = logging.getLogger(__name__)

ToolFactory = Callable[[], Any]


class ReviewToolRunner:
    """Execute developer tools once per review run (no agent logic)."""

    def __init__(
        self,
        *,
        git_tool: GitTool | None = None,
        bandit_tool: BanditTool | None = None,
        ruff_tool: RuffTool | None = None,
        pytest_tool: PytestTool | None = None,
        coverage_tool: CoverageTool | None = None,
    ) -> None:
        self.git_tool = git_tool or GitTool()
        self.bandit_tool = bandit_tool or BanditTool()
        self.ruff_tool = ruff_tool or RuffTool()
        self.pytest_tool = pytest_tool or PytestTool()
        self.coverage_tool = coverage_tool or CoverageTool()

    def run_all(self, context: ReviewContext) -> ReviewContext:
        project = context.project_path

        logger.info("Loading Project path=%s", project)
        started = time.perf_counter()
        try:
            context.project_structure = scan_project_structure(project)
        except Exception as exc:  # noqa: BLE001
            message = f"Project structure scan failed: {exc}"
            logger.error(message)
            context.tool_errors.append(message)
        context.timings["project_structure"] = round(time.perf_counter() - started, 3)

        self._run_tool(context, "git", "Running Git", lambda: self.git_tool.timed_run(project))
        self._run_tool(
            context,
            "bandit",
            "Running Bandit",
            lambda: self.bandit_tool.timed_run(project),
        )
        self._run_tool(context, "ruff", "Running Ruff", lambda: self.ruff_tool.timed_run(project))
        self._run_tool(
            context,
            "pytest",
            "Running Pytest",
            lambda: self.pytest_tool.timed_run(project),
        )
        self._run_tool(
            context,
            "coverage",
            "Running Coverage",
            lambda: self.coverage_tool.timed_run(project),
        )
        return context

    def _run_tool(
        self,
        context: ReviewContext,
        key: str,
        log_label: str,
        runner: Callable[[], Any],
    ) -> None:
        logger.info(log_label)
        started = time.perf_counter()
        try:
            result = runner()
            payload = result.to_dict() if hasattr(result, "to_dict") else dict(result)
            setattr(context, f"{key}_result", payload)
            if not payload.get("success", True):
                for err in payload.get("errors") or []:
                    context.tool_errors.append(f"{key}: {err}")
            if key == "git":
                git_data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
                logger.info(
                    "Git tool detected git_root=%s requested_path=%s is_repo=%s",
                    git_data.get("git_root"),
                    git_data.get("requested_path") or git_data.get("project_path"),
                    git_data.get("is_git_repository"),
                )
            logger.info(
                "%s finished success=%s execution_time=%.3fs",
                log_label,
                payload.get("success"),
                payload.get("execution_time", 0.0),
            )
        except Exception as exc:  # noqa: BLE001 - tool boundary
            message = f"{key} tool failed: {exc}"
            logger.exception(message)
            context.tool_errors.append(message)
            setattr(
                context,
                f"{key}_result",
                {
                    "success": False,
                    "tool": key,
                    "execution_time": round(time.perf_counter() - started, 3),
                    "data": {},
                    "errors": [message],
                },
            )
        context.timings[key] = round(time.perf_counter() - started, 3)
