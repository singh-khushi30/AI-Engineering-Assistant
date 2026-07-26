"""Facade that maps tool names to summarizers."""

from __future__ import annotations

import logging
from typing import Any

from tools.summarizers.bandit_summarizer import BanditSummarizer
from tools.summarizers.base import BaseToolSummarizer
from tools.summarizers.config import SummarizerConfig
from tools.summarizers.coverage_summarizer import CoverageSummarizer
from tools.summarizers.git_summarizer import GitSummarizer
from tools.summarizers.pytest_summarizer import PytestSummarizer
from tools.summarizers.ruff_summarizer import RuffSummarizer
from tools.summarizers.schemas import ToolSummary
from tools.summarizers.structure_summarizer import StructureSummarizer

logger = logging.getLogger(__name__)


class ToolSummaryService:
    """Reusable preprocessing layer: Tool Output → Compact Structured JSON."""

    def __init__(self, config: SummarizerConfig | None = None) -> None:
        self.config = config or SummarizerConfig.from_settings()
        self._summarizers: dict[str, BaseToolSummarizer] = {
            "bandit": BanditSummarizer(self.config),
            "ruff": RuffSummarizer(self.config),
            "pytest": PytestSummarizer(self.config),
            "coverage": CoverageSummarizer(self.config),
            "git": GitSummarizer(self.config),
            "project_structure": StructureSummarizer(self.config),
        }

    def summarize(self, tool_name: str, tool_result: Any) -> ToolSummary:
        summarizer = self._summarizers.get(tool_name)
        if summarizer is None:
            raise KeyError(f"No summarizer registered for tool '{tool_name}'")
        summary = summarizer.summarize(tool_result)
        logger.info(
            "Summarized %s original_chars=%s summary_chars=%s ratio=%.3f truncated=%s",
            tool_name,
            summary.original_chars,
            summary.summary_chars,
            summary.compression_ratio,
            summary.truncated,
        )
        return summary

    def summarize_prompt_payload(self, tool_name: str, tool_result: Any) -> dict[str, Any]:
        """Return LLM-ready dict (no bookkeeping fields)."""
        return self.summarize(tool_name, tool_result).prompt_dict()

    def summarize_structure(self, structure: Any) -> dict[str, Any]:
        summarizer = self._summarizers["project_structure"]
        assert isinstance(summarizer, StructureSummarizer)
        return summarizer.summarize_structure(structure)
