"""Review Orchestrator — coordinates tools + review agents (no review logic)."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Callable

from agents.base_agent import AgentResult
from agents.orchestration.aggregator import AggregatedReview, aggregate_review_results
from agents.orchestration.context import ReviewContext
from agents.orchestration.tool_runner import ReviewToolRunner
from agents.review.architecture_agent import ArchitectureReviewAgent
from agents.review.security_agent import SecurityReviewAgent
from agents.review.style_agent import StyleReviewAgent
from agents.review.testing_agent import TestingReviewAgent
from app.core.llm_config import LLMConfig, get_llm_config
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)

AgentFactory = Callable[[], Any]


class ReviewOrchestrator:
    """Coordinate one full multi-agent review workflow.

    Responsibilities:
      - load project
      - run Tool Layer once into shared context
      - register CrewAI crew for the four review agents
      - launch each review agent independently
      - aggregate raw agent outputs

    Non-responsibilities:
      - scoring, summarization, report generation, FastAPI exposure
    """

    def __init__(
        self,
        *,
        tool_runner: ReviewToolRunner | None = None,
        llm_service: LLMService | None = None,
        llm_config: LLMConfig | None = None,
        security_agent_factory: AgentFactory | None = None,
        style_agent_factory: AgentFactory | None = None,
        testing_agent_factory: AgentFactory | None = None,
        architecture_agent_factory: AgentFactory | None = None,
    ) -> None:
        self.tool_runner = tool_runner or ReviewToolRunner()
        self.llm_service = llm_service
        self.llm_config = llm_config
        self._security_agent_factory = security_agent_factory or (
            lambda: SecurityReviewAgent(llm_service=self._llm())
        )
        self._style_agent_factory = style_agent_factory or (
            lambda: StyleReviewAgent(llm_service=self._llm())
        )
        self._testing_agent_factory = testing_agent_factory or (
            lambda: TestingReviewAgent(llm_service=self._llm())
        )
        self._architecture_agent_factory = architecture_agent_factory or (
            lambda: ArchitectureReviewAgent(llm_service=self._llm())
        )

    def _llm(self) -> LLMService:
        if self.llm_service is not None:
            return self.llm_service
        config = self.llm_config or get_llm_config()
        return LLMService(config=config)

    def create_context(self, project_path: str | Path) -> ReviewContext:
        path = Path(project_path).expanduser().resolve()
        if not path.exists():
            raise FileNotFoundError(f"Project path does not exist: {path}")
        if not path.is_dir():
            raise NotADirectoryError(f"Project path is not a directory: {path}")
        return ReviewContext(
            project_path=path,
            metadata={
                "project_name": path.name,
                "absolute_path": str(path),
            },
        )

    def run(self, project_path: str | Path) -> AggregatedReview:
        """Execute the full review workflow and return aggregated JSON-ready data."""
        overall_started = time.perf_counter()
        errors: list[str] = []

        try:
            context = self.create_context(project_path)
        except (FileNotFoundError, NotADirectoryError) as exc:
            elapsed = time.perf_counter() - overall_started
            logger.error("Missing project: %s", exc)
            return AggregatedReview(
                success=False,
                project_path=str(project_path),
                execution_time=round(elapsed, 3),
                errors=[str(exc)],
            )

        logger.info("Loading Project path=%s", context.project_path)
        self.tool_runner.run_all(context)
        errors.extend(context.tool_errors)

        crew_info: dict[str, Any] = {"registered": False}
        try:
            from agents.crews.review_crew import build_review_crew, crew_registry_info

            crew = build_review_crew(context, config=self.llm_config)
            crew_info = crew_registry_info(crew)
            logger.info(
                "CrewAI Review Crew registered agents=%s tasks=%s",
                crew_info.get("agent_count"),
                crew_info.get("task_count"),
            )
        except Exception as exc:  # noqa: BLE001
            message = f"CrewAI registration failed: {exc}"
            logger.exception(message)
            errors.append(message)
            crew_info = {"registered": False, "error": message}

        agent_results: dict[str, dict[str, Any] | None] = {}
        agent_results["security"] = self._launch_agent(
            name="security",
            log_label="Launching Security Agent",
            factory=self._security_agent_factory,
            context_builder=lambda: {"bandit_result": context.bandit_result},
            timings=context.timings,
        )
        agent_results["style"] = self._launch_agent(
            name="style",
            log_label="Launching Style Agent",
            factory=self._style_agent_factory,
            context_builder=lambda: {"ruff_result": context.ruff_result},
            timings=context.timings,
        )
        agent_results["testing"] = self._launch_agent(
            name="testing",
            log_label="Launching Testing Agent",
            factory=self._testing_agent_factory,
            context_builder=lambda: {
                "pytest_result": context.pytest_result,
                "coverage_result": context.coverage_result,
            },
            timings=context.timings,
        )
        agent_results["architecture"] = self._launch_agent(
            name="architecture",
            log_label="Launching Architecture Agent",
            factory=self._architecture_agent_factory,
            context_builder=lambda: {
                "project_structure": context.project_structure,
                "git_result": context.git_result,
                "project_path": str(context.project_path),
            },
            timings=context.timings,
        )

        logger.info("Aggregating Results")
        tools_payload = {
            "git": context.git_result,
            "bandit": context.bandit_result,
            "ruff": context.ruff_result,
            "pytest": context.pytest_result,
            "coverage": context.coverage_result,
            "project_structure": context.project_structure,
        }
        elapsed = time.perf_counter() - overall_started
        aggregated = aggregate_review_results(
            project_path=str(context.project_path),
            execution_time=elapsed,
            tools=tools_payload,
            agent_results=agent_results,
            crew_info=crew_info,
            errors=errors,
            timings=context.timings,
        )
        logger.info(
            "Finished Review success=%s execution_time=%.3fs errors=%s",
            aggregated.success,
            aggregated.execution_time,
            len(aggregated.errors),
        )
        return aggregated

    def _launch_agent(
        self,
        *,
        name: str,
        log_label: str,
        factory: AgentFactory,
        context_builder: Callable[[], dict[str, Any]],
        timings: dict[str, float],
    ) -> dict[str, Any]:
        logger.info(log_label)
        started = time.perf_counter()
        try:
            agent = factory()
            result = agent.run(context_builder())
            payload = result.to_dict() if isinstance(result, AgentResult) else dict(result)
            timings[f"agent_{name}"] = round(time.perf_counter() - started, 3)
            data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
            llm_meta = data.get("llm") if isinstance(data.get("llm"), dict) else {}
            parse_meta = data.get("parse") if isinstance(data.get("parse"), dict) else {}
            logger.info(
                "%s finished success=%s provider=%s model=%s parse_ok=%s "
                "execution_time=%.3fs",
                log_label,
                payload.get("success"),
                llm_meta.get("provider"),
                llm_meta.get("model"),
                parse_meta.get("parse_ok"),
                timings[f"agent_{name}"],
            )
            return payload
        except Exception as exc:  # noqa: BLE001 - isolate agent failures
            elapsed = round(time.perf_counter() - started, 3)
            timings[f"agent_{name}"] = elapsed
            message = f"{name} agent crashed: {exc}"
            logger.exception(message)
            return {
                "success": False,
                "agent": name,
                "execution_time": elapsed,
                "data": {},
                "errors": [message],
            }
