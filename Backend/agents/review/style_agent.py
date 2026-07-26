"""Code Style Review Agent — explains Ruff findings (does not re-run Ruff)."""

from __future__ import annotations

from typing import Any

from agents.review.base_review_agent import BaseReviewAgent, ReviewAgentError
from tools.summarizers import ToolSummaryService


class StyleReviewAgent(BaseReviewAgent):
    """Consume RuffTool JSON and produce a structured style/readability review."""

    name = "style_review_agent"
    prompt_namespace = "style_agent"

    def __init__(self, llm_service=None, summarizer: ToolSummaryService | None = None) -> None:  # noqa: ANN001
        super().__init__(llm_service=llm_service)
        self.summarizer = summarizer or ToolSummaryService()

    def validate_context(self, context: dict[str, Any]) -> None:
        super().validate_context(context)
        if "ruff_result" not in context:
            raise ReviewAgentError(
                "StyleReviewAgent requires context['ruff_result'] "
                "(RuffTool output). Do not omit tool results."
            )

    def build_tool_payload(self, context: dict[str, Any]) -> dict[str, Any]:
        ruff = self.coerce_tool_result(context["ruff_result"], tool_name="ruff")
        return self.summarizer.summarize_prompt_payload("ruff", ruff)
