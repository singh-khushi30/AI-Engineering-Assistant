"""Assemble a ReportDocument from orchestration + intelligence outputs."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agents.orchestration.aggregator import AggregatedReview
from app.core.config import get_settings
from app.core.llm_config import get_llm_config
from reports.schemas import ReportDocument, ReportMetadata
from reports.versions import AGENT_VERSIONS, resolve_tool_versions

logger = logging.getLogger(__name__)


class ReportBuilder:
    """Build the canonical report object (no formatting)."""

    def build(
        self,
        aggregated: AggregatedReview | dict[str, Any],
        intelligence_payload: dict[str, Any],
    ) -> ReportDocument:
        logger.info("Report creation started")
        agg = aggregated.to_dict() if hasattr(aggregated, "to_dict") else dict(aggregated)
        settings = get_settings()
        llm = get_llm_config()

        intelligence = intelligence_payload.get("intelligence") or {}
        summary = intelligence_payload.get("summary") or {}
        recommendations = intelligence_payload.get("recommendations") or []
        summary_meta = intelligence_payload.get("summary_meta") or {}

        health = intelligence.get("health_scores") or {}
        project_path = str(agg.get("project_path") or ".")
        project_name = Path(project_path).name

        model_used = None
        provider = None
        llm_meta = summary_meta.get("llm") if isinstance(summary_meta, dict) else None
        if isinstance(llm_meta, dict):
            model_used = llm_meta.get("model")
            provider = llm_meta.get("provider")
        model_used = model_used or llm.resolved_model
        provider = provider or llm.provider.value

        detailed = {
            "security": agg.get("security"),
            "style": agg.get("style"),
            "testing": agg.get("testing"),
            "architecture": agg.get("architecture"),
        }

        errors = list(agg.get("errors") or [])
        for err in summary_meta.get("errors") or []:
            errors.append(str(err))

        document = ReportDocument(
            metadata=ReportMetadata(
                product_name=settings.app_name,
                project_name=project_name,
                project_path=project_path,
                timestamp=datetime.now(timezone.utc).isoformat(),
                execution_duration=float(agg.get("execution_time") or 0.0)
                + float(summary_meta.get("execution_time") or 0.0),
                model_used=model_used,
                provider=provider,
                app_version=settings.app_version,
                agent_versions=dict(AGENT_VERSIONS),
                tool_versions=resolve_tool_versions(),
            ),
            executive_summary=str(summary.get("executive_summary") or ""),
            overall_health=float(health.get("overall") or 0.0),
            category_scores={
                "security": float(health.get("security") or 0.0),
                "testing": float(health.get("testing") or 0.0),
                "style": float(health.get("style") or 0.0),
                "architecture": float(health.get("architecture") or 0.0),
            },
            priority_distribution=dict(intelligence.get("priority_distribution") or {}),
            category_issue_counts=dict(intelligence.get("category_issue_counts") or {}),
            top_issues=list(intelligence.get("top_issues") or summary.get("prioritized_issues") or []),
            recommendations=list(recommendations),
            detailed_findings=detailed,
            themes=list(summary.get("themes") or []),
            appendix={
                "execution_time": agg.get("execution_time"),
                "timings": agg.get("timings"),
                "tool_results": agg.get("tools"),
                "agent_results": detailed,
                "crew": agg.get("crew"),
                "summary_meta": summary_meta,
            },
            errors=errors,
        )
        logger.info("Report creation finished project=%s", project_name)
        return document
