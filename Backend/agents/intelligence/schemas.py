"""Schemas for review intelligence and scoring outputs."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

PriorityBucket = Literal["critical", "high", "medium", "low", "info"]
RecommendationTier = Literal["fix_immediately", "recommended", "nice_to_have"]


class PriorityDistribution(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0

    def to_dict(self) -> dict[str, int]:
        return self.model_dump()


class CategoryHealth(BaseModel):
    security: float
    testing: float
    style: float
    architecture: float
    overall: float

    def to_dict(self) -> dict[str, float]:
        return self.model_dump()


class ScoredRecommendation(BaseModel):
    title: str
    rationale: str
    tier: RecommendationTier = "recommended"
    category: str | None = None
    severity: str | None = None

    @field_validator("tier", mode="before")
    @classmethod
    def normalize_tier(cls, value: Any) -> str:
        text = str(value or "recommended").strip().lower().replace("-", "_").replace(" ", "_")
        aliases = {
            "fix_now": "fix_immediately",
            "immediate": "fix_immediately",
            "must_fix": "fix_immediately",
            "should_fix": "recommended",
            "optional": "nice_to_have",
            "nice": "nice_to_have",
        }
        text = aliases.get(text, text)
        if text not in {"fix_immediately", "recommended", "nice_to_have"}:
            return "recommended"
        return text


class IntelligenceSnapshot(BaseModel):
    """Deterministic intelligence derived from aggregated agent outputs."""

    category_issue_counts: dict[str, int] = Field(default_factory=dict)
    priority_distribution: PriorityDistribution = Field(default_factory=PriorityDistribution)
    health_scores: CategoryHealth
    top_issues: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[ScoredRecommendation] = Field(default_factory=list)
    empty_review: bool = False

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


class SummaryInsight(BaseModel):
    """LLM-produced executive summary (Summary Agent)."""

    executive_summary: str = ""
    themes: list[str] = Field(default_factory=list)
    prioritized_issues: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    grouped_issues: list[dict[str, Any]] = Field(default_factory=list)
    confidence: float = 0.5

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()
