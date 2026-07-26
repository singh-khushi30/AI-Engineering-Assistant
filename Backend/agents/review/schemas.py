"""Shared structured schemas for specialized review agents."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

Severity = Literal["critical", "high", "medium", "low", "info", "none"]


class ReviewFinding(BaseModel):
    """A single actionable review finding."""

    title: str
    detail: str
    severity: Severity = "info"
    recommendation: str | None = None
    file: str | None = None
    line: int | None = None
    category: str | None = None


class ReviewReport(BaseModel):
    """Canonical structured output for every Phase 1.3B review agent."""

    agent: str
    summary: str
    findings: list[ReviewFinding] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    severity: Severity = "info"
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.5
        return max(0.0, min(1.0, number))

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()
