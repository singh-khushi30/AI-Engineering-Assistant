"""Shared structured schemas for specialized review agents."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

Severity = Literal["critical", "high", "medium", "low", "info", "none"]

_SEVERITY_ALIASES = {
    "critical": "critical",
    "high": "high",
    "medium": "medium",
    "moderate": "medium",
    "low": "low",
    "info": "info",
    "information": "info",
    "none": "none",
    "n/a": "none",
    "na": "none",
}


def _normalize_severity(value: Any) -> str:
    if value is None:
        return "info"
    key = str(value).strip().lower()
    return _SEVERITY_ALIASES.get(key, "info")


class ReviewFinding(BaseModel):
    """A single actionable review finding."""

    title: str
    detail: str
    severity: Severity = "info"
    recommendation: str | None = None
    file: str | None = None
    line: int | None = None
    category: str | None = None

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_finding_severity(cls, value: Any) -> str:
        return _normalize_severity(value)

    @field_validator("line", mode="before")
    @classmethod
    def coerce_line(cls, value: Any) -> int | None:
        if value is None or value == "":
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @field_validator("title", "detail", mode="before")
    @classmethod
    def coerce_required_text(cls, value: Any) -> str:
        if value is None:
            return ""
        return str(value)


class ReviewReport(BaseModel):
    """Canonical structured output for every Phase 1.3B review agent."""

    agent: str
    summary: str
    findings: list[ReviewFinding] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    severity: Severity = "info"
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)

    @field_validator("severity", mode="before")
    @classmethod
    def normalize_report_severity(cls, value: Any) -> str:
        return _normalize_severity(value)

    @field_validator("confidence", mode="before")
    @classmethod
    def clamp_confidence(cls, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.5
        return max(0.0, min(1.0, number))

    @field_validator("summary", mode="before")
    @classmethod
    def coerce_summary(cls, value: Any) -> str:
        if value is None:
            return ""
        return str(value)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()
