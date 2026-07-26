"""Shared helpers for tool summarizers."""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from typing import Any

from tools.summarizers.config import SummarizerConfig
from tools.summarizers.schemas import ToolSummary


def coerce_tool_payload(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if hasattr(value, "model_dump"):
        return value.model_dump()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if isinstance(value, dict):
        return value
    return {"raw": str(value)}


def estimate_chars(payload: Any) -> int:
    return len(json.dumps(payload, default=str, ensure_ascii=False))


def truncate_text(value: Any, max_chars: int) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 16].rstrip() + "\n...[truncated]..."


def severity_rank(value: str | None) -> int:
    order = {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "moderate": 2,
        "low": 3,
        "info": 4,
        "undefined": 5,
        "none": 6,
    }
    return order.get(str(value or "info").lower(), 4)


def omit_nulls(value: Any) -> Any:
    """Drop None values recursively to shrink JSON without losing signal."""
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, item in value.items():
            if item is None:
                continue
            cleaned[key] = omit_nulls(item)
        return cleaned
    if isinstance(value, list):
        return [omit_nulls(item) for item in value if item is not None]
    return value


class BaseToolSummarizer(ABC):
    """Transform raw ToolResult JSON into a compact, review-ready summary."""

    tool_name: str = "base"

    def __init__(self, config: SummarizerConfig | None = None) -> None:
        self.config = config or SummarizerConfig.from_settings()

    def summarize(self, tool_result: Any) -> ToolSummary:
        original = coerce_tool_payload(tool_result)
        original_chars = estimate_chars(original)
        summary_body, truncated, errors = self._build_summary(original)
        summary_body = omit_nulls(summary_body)
        errors_list = errors or list(original.get("errors") or [])
        prompt_payload = omit_nulls(
            {
                "tool": self.tool_name,
                "success": original.get("success"),
                "truncated": truncated,
                "summary": summary_body,
                "errors": errors_list,
            }
        )
        summary_chars = estimate_chars(prompt_payload)
        ratio = (summary_chars / original_chars) if original_chars else 0.0
        return ToolSummary(
            tool=self.tool_name,
            success=original.get("success"),
            original_chars=original_chars,
            summary_chars=summary_chars,
            compression_ratio=round(ratio, 4),
            truncated=truncated,
            summary=summary_body if isinstance(summary_body, dict) else {},
            errors=list(errors_list),
        )

    @abstractmethod
    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        """Return (summary_dict, truncated, errors)."""


FAILED_TEST_RE = re.compile(
    r"^(FAILED|ERROR)\s+(\S+?)(?:\s+-|$)",
    re.MULTILINE,
)
