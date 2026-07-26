"""Unit tests for Phase 1.3D intelligence + report generation (no live Gemini)."""

from __future__ import annotations

from pathlib import Path

from agents.intelligence.findings import dedupe_findings, extract_findings_by_category
from agents.intelligence.intelligence import ReviewIntelligence
from agents.intelligence.scoring import ScoringConfig, ScoringEngine
from agents.intelligence.summary_agent import SummaryAgent
from agents.orchestration.aggregator import AggregatedReview
from app.services.llm_service import LLMResult
from reports.builder import ReportBuilder
from reports.exporter import ReportExporter
from reports.formatters.html_formatter import HtmlReportFormatter
from reports.formatters.json_formatter import JsonReportFormatter
from reports.formatters.markdown_formatter import MarkdownReportFormatter


def _sample_aggregated() -> AggregatedReview:
    return AggregatedReview(
        success=True,
        project_path="/demo/project",
        execution_time=3.5,
        tools={"bandit": {"success": True}},
        security={
            "success": True,
            "data": {
                "review": {
                    "agent": "security_review_agent",
                    "summary": "One medium finding",
                    "findings": [
                        {
                            "title": "Hardcoded secret",
                            "detail": "Possible secret in config",
                            "severity": "high",
                            "recommendation": "Use env vars",
                            "file": "app/core/config.py",
                            "line": 10,
                            "category": "security",
                        }
                    ],
                    "recommendations": ["Rotate secrets"],
                    "severity": "high",
                    "confidence": 0.8,
                }
            },
            "errors": [],
        },
        style={
            "success": True,
            "data": {
                "review": {
                    "agent": "style_review_agent",
                    "summary": "Clean",
                    "findings": [],
                    "recommendations": [],
                    "severity": "none",
                    "confidence": 0.9,
                }
            },
        },
        testing={
            "success": True,
            "data": {
                "review": {
                    "agent": "testing_review_agent",
                    "summary": "Coverage could improve",
                    "findings": [
                        {
                            "title": "Low coverage in main",
                            "detail": "main.py at 55%",
                            "severity": "medium",
                            "recommendation": "Add unit tests",
                            "category": "testing",
                        }
                    ],
                    "recommendations": ["Add tests for main"],
                    "severity": "medium",
                    "confidence": 0.7,
                }
            },
        },
        architecture={
            "success": True,
            "data": {
                "review": {
                    "agent": "architecture_review_agent",
                    "summary": "Modular layout",
                    "findings": [],
                    "recommendations": [],
                    "severity": "info",
                    "confidence": 0.8,
                }
            },
        },
        errors=[],
        timings={"bandit": 0.2},
    )


def test_scoring_engine_applies_configurable_penalties() -> None:
    engine = ScoringEngine(
        ScoringConfig(
            score_max=10,
            score_base=10,
            penalty_high=1.0,
            penalty_medium=0.4,
            weight_security=1,
            weight_testing=0,
            weight_style=0,
            weight_architecture=0,
        )
    )
    scores = engine.score_categories(
        {
            "security": [{"severity": "high"}, {"severity": "medium"}],
            "testing": [],
            "style": [],
            "architecture": [],
        }
    )
    assert scores.security == 8.6
    assert scores.overall == 8.6


def test_dedupe_and_extract_findings() -> None:
    aggregated = _sample_aggregated().to_dict()
    by_category = extract_findings_by_category(aggregated)
    assert by_category["security"][0]["title"] == "Hardcoded secret"
    duped = by_category["security"] + by_category["security"]
    assert len(dedupe_findings(duped)) == 1


def test_intelligence_snapshot_without_summary() -> None:
    intelligence = ReviewIntelligence()
    payload = intelligence.analyze(_sample_aggregated(), include_summary=False)
    assert payload["intelligence"]["health_scores"]["security"] < 10
    assert payload["summary"]["executive_summary"] == "Summary skipped."
    assert payload["recommendations"]


def test_report_formatters_and_exporter(tmp_path: Path) -> None:
    aggregated = _sample_aggregated()
    intelligence = ReviewIntelligence().analyze(aggregated, include_summary=False)
    document = ReportBuilder().build(aggregated, intelligence)

    json_text = JsonReportFormatter().render(document)
    md_text = MarkdownReportFormatter().render(document)
    html_text = HtmlReportFormatter().render(document)

    assert '"overall_health"' in json_text
    assert "## Overall Health" in md_text
    assert "<html" in html_text.lower()
    assert "Hardcoded secret" in md_text or "Hardcoded secret" in json_text

    export = ReportExporter(tmp_path).export_all(document, stem="demo-review")
    assert export["artifacts"]["json"]
    assert export["artifacts"]["markdown"]
    assert export["artifacts"]["html"]
    assert Path(export["artifacts"]["json"]).exists()


def test_summary_agent_requires_aggregated_review() -> None:
    class FakeLLM:
        def complete(self, messages, temperature=None, max_tokens=None):  # noqa: ANN001
            return LLMResult(success=True, execution_time=0.01, data={"content": "{}"})

    agent = SummaryAgent(llm_service=FakeLLM())  # type: ignore[arg-type]
    result = agent.run({})
    assert result.success is False
    assert "aggregated_review" in result.errors[0]
