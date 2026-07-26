"""Compact summary schemas for LLM prompt context."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ToolSummary(BaseModel):
    """Envelope returned by every tool summarizer."""

    tool: str
    success: bool | None = None
    original_chars: int = 0
    summary_chars: int = 0
    compression_ratio: float = 0.0
    truncated: bool = False
    summary: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()

    def prompt_dict(self) -> dict[str, Any]:
        """Payload sent to the LLM (excludes size bookkeeping)."""
        payload: dict[str, Any] = {
            "tool": self.tool,
            "truncated": self.truncated,
            "summary": self.summary,
        }
        if self.success is not None:
            payload["success"] = self.success
        if self.errors:
            payload["errors"] = self.errors
        return payload

