"""End-to-end review intelligence pipeline (orchestration → reports)."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any

from agents.intelligence.intelligence import ReviewIntelligence
from agents.orchestration.orchestrator import ReviewOrchestrator
from app.core.config import get_settings
from reports.builder import ReportBuilder
from reports.exporter import ReportExporter
from reports.schemas import ReportDocument

logger = logging.getLogger(__name__)


class ReviewPipeline:
    """Compose orchestrator + intelligence + report generation.

    Keeps report generation separated from orchestration internals.
    """

    def __init__(
        self,
        *,
        orchestrator: ReviewOrchestrator | None = None,
        intelligence: ReviewIntelligence | None = None,
        report_builder: ReportBuilder | None = None,
    ) -> None:
        self.orchestrator = orchestrator or ReviewOrchestrator()
        self.intelligence = intelligence or ReviewIntelligence()
        self.report_builder = report_builder or ReportBuilder()

    def run(
        self,
        project_path: str | Path,
        *,
        output_dir: str | Path | None = None,
        include_summary: bool = True,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        settings = get_settings()
        reports_dir = Path(output_dir or settings.reports_dir)
        if not reports_dir.is_absolute():
            reports_dir = Path.cwd() / reports_dir

        logger.info("Review pipeline started project=%s", project_path)
        aggregated = self.orchestrator.run(project_path)
        intelligence_payload = self.intelligence.analyze(
            aggregated,
            include_summary=include_summary,
        )
        document = self.report_builder.build(aggregated, intelligence_payload)
        export_result = ReportExporter(reports_dir).export_all(document)

        elapsed = round(time.perf_counter() - started, 3)
        logger.info("Review pipeline finished execution_time=%.3fs", elapsed)
        return {
            "success": aggregated.success and bool(export_result["artifacts"].get("json")),
            "execution_time": elapsed,
            "aggregated_review": aggregated.to_dict(),
            "intelligence": intelligence_payload,
            "report": document.to_dict(),
            "artifacts": export_result["artifacts"],
            "errors": list(aggregated.errors)
            + list(intelligence_payload.get("summary_meta", {}).get("errors") or [])
            + list(export_result.get("errors") or []),
            "output_dir": export_result["output_dir"],
        }


def build_reports_from_aggregated(
    aggregated: Any,
    *,
    output_dir: str | Path,
    include_summary: bool = True,
) -> dict[str, Any]:
    """Generate intelligence + reports from an existing AggregatedReview."""
    intelligence = ReviewIntelligence()
    payload = intelligence.analyze(aggregated, include_summary=include_summary)
    document = ReportBuilder().build(aggregated, payload)
    export_result = ReportExporter(output_dir).export_all(document)
    return {
        "report": document,
        "intelligence": payload,
        "export": export_result,
    }
