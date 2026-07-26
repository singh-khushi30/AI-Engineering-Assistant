"""Configurable project health scoring engine (no magic numbers in callers)."""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, Field

from agents.intelligence.schemas import CategoryHealth, PriorityDistribution
from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class ScoringConfig(BaseModel):
    """All scoring knobs — loaded from Settings / environment."""

    score_max: float = Field(default=10.0, gt=0)
    score_base: float = Field(default=10.0, ge=0)
    weight_security: float = Field(default=0.30, ge=0)
    weight_testing: float = Field(default=0.25, ge=0)
    weight_style: float = Field(default=0.20, ge=0)
    weight_architecture: float = Field(default=0.25, ge=0)
    penalty_critical: float = Field(default=2.0, ge=0)
    penalty_high: float = Field(default=1.0, ge=0)
    penalty_medium: float = Field(default=0.4, ge=0)
    penalty_low: float = Field(default=0.15, ge=0)
    penalty_info: float = Field(default=0.05, ge=0)

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> ScoringConfig:
        cfg = settings or get_settings()
        return cls(
            score_max=cfg.score_max,
            score_base=cfg.score_base,
            weight_security=cfg.score_weight_security,
            weight_testing=cfg.score_weight_testing,
            weight_style=cfg.score_weight_style,
            weight_architecture=cfg.score_weight_architecture,
            penalty_critical=cfg.score_penalty_critical,
            penalty_high=cfg.score_penalty_high,
            penalty_medium=cfg.score_penalty_medium,
            penalty_low=cfg.score_penalty_low,
            penalty_info=cfg.score_penalty_info,
        )

    def normalized_weights(self) -> dict[str, float]:
        raw = {
            "security": self.weight_security,
            "testing": self.weight_testing,
            "style": self.weight_style,
            "architecture": self.weight_architecture,
        }
        total = sum(raw.values()) or 1.0
        return {key: value / total for key, value in raw.items()}


class ScoringEngine:
    """Compute category and overall health scores from finding severities."""

    def __init__(self, config: ScoringConfig | None = None) -> None:
        self.config = config or ScoringConfig.from_settings()

    def score_categories(
        self,
        findings_by_category: dict[str, list[dict[str, Any]]],
    ) -> CategoryHealth:
        logger.info("Scoring project health categories=%s", sorted(findings_by_category.keys()))
        security = self._score_bucket(findings_by_category.get("security", []))
        testing = self._score_bucket(findings_by_category.get("testing", []))
        style = self._score_bucket(findings_by_category.get("style", []))
        architecture = self._score_bucket(findings_by_category.get("architecture", []))

        weights = self.config.normalized_weights()
        overall = (
            security * weights["security"]
            + testing * weights["testing"]
            + style * weights["style"]
            + architecture * weights["architecture"]
        )
        overall = self._clamp(overall)
        scores = CategoryHealth(
            security=security,
            testing=testing,
            style=style,
            architecture=architecture,
            overall=overall,
        )
        logger.info("Scoring complete overall=%.2f", scores.overall)
        return scores

    def priority_distribution(
        self,
        findings: list[dict[str, Any]],
    ) -> PriorityDistribution:
        counts = PriorityDistribution()
        for finding in findings:
            severity = str(finding.get("severity") or "info").lower()
            if severity == "critical":
                counts.critical += 1
            elif severity == "high":
                counts.high += 1
            elif severity == "medium":
                counts.medium += 1
            elif severity == "low":
                counts.low += 1
            else:
                counts.info += 1
        return counts

    def _score_bucket(self, findings: list[dict[str, Any]]) -> float:
        score = self.config.score_base
        for finding in findings:
            severity = str(finding.get("severity") or "info").lower()
            score -= self._penalty_for(severity)
        return self._clamp(score)

    def _penalty_for(self, severity: str) -> float:
        mapping = {
            "critical": self.config.penalty_critical,
            "high": self.config.penalty_high,
            "medium": self.config.penalty_medium,
            "low": self.config.penalty_low,
            "info": self.config.penalty_info,
            "none": 0.0,
        }
        return mapping.get(severity, self.config.penalty_info)

    def _clamp(self, value: float) -> float:
        return round(max(0.0, min(self.config.score_max, value)), 1)
