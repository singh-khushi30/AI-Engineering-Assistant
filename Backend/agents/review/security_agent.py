"""Security Review Agent — explains Bandit findings (does not re-run Bandit)."""

from __future__ import annotations

from typing import Any

from agents.review.base_review_agent import BaseReviewAgent, ReviewAgentError
from tools.summarizers import ToolSummaryService


class SecurityReviewAgent(BaseReviewAgent):
    """Consume BanditTool JSON and produce a structured security review."""

    name = "security_review_agent"
    prompt_namespace = "security_agent"

    def __init__(self, llm_service=None, summarizer: ToolSummaryService | None = None) -> None:  # noqa: ANN001
        super().__init__(llm_service=llm_service)
        self.summarizer = summarizer or ToolSummaryService()

    def validate_context(self, context: dict[str, Any]) -> None:
        super().validate_context(context)
        if "bandit_result" not in context:
            raise ReviewAgentError(
                "SecurityReviewAgent requires context['bandit_result'] "
                "(BanditTool output). Do not omit tool results."
            )

    def build_tool_payload(self, context: dict[str, Any]) -> dict[str, Any]:
        bandit = self.coerce_tool_result(context["bandit_result"], tool_name="bandit")
        return self.summarizer.summarize_prompt_payload("bandit", bandit)
