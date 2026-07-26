"""Review intelligence layer — health, priorities, recommendations, summary."""

from __future__ import annotations

import logging
import time
from typing import Any

from agents.intelligence.findings import (
    CATEGORY_KEYS,
    dedupe_findings,
    extract_findings_by_category,
    flatten_findings,
    sort_findings,
)
from agents.intelligence.schemas import (
    IntelligenceSnapshot,
    ScoredRecommendation,
    SummaryInsight,
)
from agents.intelligence.scoring import ScoringConfig, ScoringEngine
from agents.intelligence.summary_agent import SummaryAgent
from agents.orchestration.aggregator import AggregatedReview
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class ReviewIntelligence:
    """Derive deterministic intelligence and optional LLM summary from aggregation."""

    def __init__(
        self,
        *,
        scoring_engine: ScoringEngine | None = None,
        summary_agent: SummaryAgent | None = None,
        llm_service: LLMService | None = None,
    ) -> None:
        self.scoring_engine = scoring_engine or ScoringEngine(ScoringConfig.from_settings())
        self.summary_agent = summary_agent or SummaryAgent(llm_service=llm_service)

    def build_snapshot(self, aggregated: AggregatedReview | dict[str, Any]) -> IntelligenceSnapshot:
        logger.info("Building review intelligence snapshot")
        payload = aggregated.to_dict() if hasattr(aggregated, "to_dict") else dict(aggregated)
        by_category = extract_findings_by_category(payload)
        all_findings = dedupe_findings(flatten_findings(by_category))
        ranked = sort_findings(all_findings)
        scores = self.scoring_engine.score_categories(by_category)
        distribution = self.scoring_engine.priority_distribution(all_findings)
        recommendations = self._deterministic_recommendations(ranked)

        snapshot = IntelligenceSnapshot(
            category_issue_counts={key: len(by_category.get(key, [])) for key in CATEGORY_KEYS},
            priority_distribution=distribution,
            health_scores=scores,
            top_issues=ranked[:15],
            recommendations=recommendations,
            empty_review=len(all_findings) == 0,
        )
        logger.info(
            "Intelligence snapshot ready overall=%.1f issues=%s empty=%s",
            snapshot.health_scores.overall,
            len(all_findings),
            snapshot.empty_review,
        )
        return snapshot

    def summarize(self, aggregated: AggregatedReview | dict[str, Any]) -> tuple[SummaryInsight, dict[str, Any]]:
        logger.info("Summary generation started")
        started = time.perf_counter()
        payload = aggregated.to_dict() if hasattr(aggregated, "to_dict") else dict(aggregated)
        result = self.summary_agent.run({"aggregated_review": payload})
        insight = self.summary_agent.parse_summary(result)
        meta = {
            "success": result.success,
            "execution_time": round(time.perf_counter() - started, 3),
            "errors": result.errors,
            "llm": (result.data or {}).get("llm"),
        }
        logger.info(
            "Summary generation finished success=%s execution_time=%.3fs",
            result.success,
            meta["execution_time"],
        )
        return insight, meta

    def analyze(
        self,
        aggregated: AggregatedReview | dict[str, Any],
        *,
        include_summary: bool = True,
    ) -> dict[str, Any]:
        snapshot = self.build_snapshot(aggregated)
        summary_meta: dict[str, Any] = {"success": False, "errors": [], "execution_time": 0.0}
        insight = SummaryInsight(
            executive_summary="Summary skipped.",
            confidence=0.0,
        )
        if include_summary:
            try:
                insight, summary_meta = self.summarize(aggregated)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Summary generation crashed")
                summary_meta = {
                    "success": False,
                    "execution_time": 0.0,
                    "errors": [f"Summary generation failed: {exc}"],
                }
                insight = SummaryInsight(
                    executive_summary=f"Summary unavailable: {exc}",
                    confidence=0.0,
                )

        merged_recommendations = self._merge_recommendations(
            snapshot.recommendations,
            insight.recommendations,
        )
        return {
            "intelligence": snapshot.to_dict(),
            "summary": insight.to_dict(),
            "summary_meta": summary_meta,
            "recommendations": [item.model_dump() for item in merged_recommendations],
        }

    def _deterministic_recommendations(
        self,
        findings: list[dict[str, Any]],
    ) -> list[ScoredRecommendation]:
        recommendations: list[ScoredRecommendation] = []
        for finding in findings[:20]:
            severity = str(finding.get("severity") or "info").lower()
            if severity in {"critical", "high"}:
                tier = "fix_immediately"
            elif severity == "medium":
                tier = "recommended"
            else:
                tier = "nice_to_have"

            title = str(
                finding.get("recommendation")
                or finding.get("title")
                or "Address finding"
            )
            rationale = (
                f"This {severity} {finding.get('category') or finding.get('_source_agent') or 'review'} "
                f"issue matters because: {finding.get('detail') or finding.get('title') or 'it increases engineering risk'}."
            )
            recommendations.append(
                ScoredRecommendation(
                    title=title,
                    rationale=rationale,
                    tier=tier,  # type: ignore[arg-type]
                    category=str(finding.get("category") or finding.get("_source_agent") or ""),
                    severity=severity,
                )
            )
        return recommendations

    def _merge_recommendations(
        self,
        deterministic: list[ScoredRecommendation],
        summary_items: list[dict[str, Any]],
    ) -> list[ScoredRecommendation]:
        merged: list[ScoredRecommendation] = []
        seen: set[str] = set()

        for item in summary_items:
            try:
                rec = ScoredRecommendation(
                    title=str(item.get("title") or "Recommendation"),
                    rationale=str(item.get("rationale") or item.get("title") or ""),
                    tier=str(item.get("tier") or "recommended"),  # type: ignore[arg-type]
                    category=item.get("category"),
                    severity=item.get("severity"),
                )
            except Exception:  # noqa: BLE001
                continue
            key = rec.title.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(rec)

        for rec in deterministic:
            key = rec.title.strip().lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(rec)
        return merged
