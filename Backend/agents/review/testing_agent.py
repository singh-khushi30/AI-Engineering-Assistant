"""Testing Review Agent — analyzes pytest + coverage tool outputs."""

from __future__ import annotations

from typing import Any

from agents.review.base_review_agent import BaseReviewAgent, ReviewAgentError
from tools.summarizers import ToolSummaryService


class TestingReviewAgent(BaseReviewAgent):
    """Consume PytestTool + CoverageTool JSON and produce a testing review."""

    __test__ = False  # prevent pytest from collecting this agent class
    name = "testing_review_agent"
    prompt_namespace = "testing_agent"

    def __init__(self, llm_service=None, summarizer: ToolSummaryService | None = None) -> None:  # noqa: ANN001
        super().__init__(llm_service=llm_service)
        self.summarizer = summarizer or ToolSummaryService()

    def validate_context(self, context: dict[str, Any]) -> None:
        super().validate_context(context)
        if "pytest_result" not in context and "coverage_result" not in context:
            raise ReviewAgentError(
                "TestingReviewAgent requires context['pytest_result'] and/or "
                "context['coverage_result']."
            )

    def build_tool_payload(self, context: dict[str, Any]) -> dict[str, Any]:
        payload: dict[str, Any] = {"tools": {}}

        if "pytest_result" in context:
            pytest_result = self.coerce_tool_result(
                context["pytest_result"],
                tool_name="pytest",
            )
            payload["tools"]["pytest"] = self.summarizer.summarize_prompt_payload(
                "pytest",
                pytest_result,
            )

        if "coverage_result" in context:
            coverage_result = self.coerce_tool_result(
                context["coverage_result"],
                tool_name="coverage",
            )
            payload["tools"]["coverage"] = self.summarizer.summarize_prompt_payload(
                "coverage",
                coverage_result,
            )

        return payload
