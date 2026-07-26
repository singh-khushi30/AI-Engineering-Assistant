"""Architecture Review Agent — reviews factual project structure context."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from agents.review.base_review_agent import BaseReviewAgent, ReviewAgentError
from agents.review.project_scanner import scan_project_structure
from tools.summarizers import ToolSummaryService


class ArchitectureReviewAgent(BaseReviewAgent):
    """Analyze project structure/modularity from scanned filesystem context."""

    name = "architecture_review_agent"
    prompt_namespace = "architecture_agent"

    def __init__(self, llm_service=None, summarizer: ToolSummaryService | None = None) -> None:  # noqa: ANN001
        super().__init__(llm_service=llm_service)
        self.summarizer = summarizer or ToolSummaryService()

    def validate_context(self, context: dict[str, Any]) -> None:
        super().validate_context(context)
        if "project_structure" not in context and "project_path" not in context:
            raise ReviewAgentError(
                "ArchitectureReviewAgent requires context['project_structure'] "
                "or context['project_path']."
            )
        if "project_path" in context and "project_structure" not in context:
            path = Path(str(context["project_path"])).expanduser()
            if not path.exists():
                raise ReviewAgentError(
                    f"Invalid project path: {path.resolve()}",
                    details={"project_path": str(path)},
                )
            if not path.is_dir():
                raise ReviewAgentError(
                    f"Project path is not a directory: {path.resolve()}",
                    details={"project_path": str(path)},
                )

    def build_tool_payload(self, context: dict[str, Any]) -> dict[str, Any]:
        if "project_structure" in context:
            structure = context["project_structure"]
            if not isinstance(structure, dict):
                raise ReviewAgentError("project_structure must be a dictionary.")
        else:
            try:
                structure = scan_project_structure(str(context["project_path"]))
            except (FileNotFoundError, NotADirectoryError) as exc:
                raise ReviewAgentError(str(exc)) from exc

        payload: dict[str, Any] = {
            "project_structure": self.summarizer.summarize_structure(structure),
            "guidance": {
                "do_not_invent_issues": True,
                "only_use_provided_structure": True,
            },
        }
        if "git_result" in context:
            git_result = self.coerce_tool_result(context["git_result"], tool_name="git")
            payload["git"] = self.summarizer.summarize_prompt_payload("git", git_result)
        return payload
