"""Tests for coverage summary and timeline synthesis helpers."""

from __future__ import annotations

from pathlib import Path

from app.services.review_history import (
    attach_coverage_summary_to_result,
    build_coverage_summary,
    resolve_steps_for_record,
    synthesize_steps_from_timings,
)
from app.services.review_persistence import (
    ReviewPersistence,
    report_document_to_persisted_record,
)


def test_build_coverage_summary_from_files_dict() -> None:
    tool = {
        "data": {
            "percent_covered": 73.93,
            "covered_lines": 2737,
            "num_statements": 3500,
            "files": {
                "app/services/llm/gemini.py": {
                    "summary": {
                        "percent_covered": 11.11,
                        "covered_lines": 10,
                        "num_statements": 90,
                    }
                },
                "agents/base_agent.py": {
                    "summary": {
                        "percent_covered": 100.0,
                        "covered_lines": 7,
                        "num_statements": 7,
                    }
                },
            },
        }
    }
    summary = build_coverage_summary(tool)
    assert summary is not None
    assert summary["percentage"] == 73.93
    assert summary["covered_lines"] == 2737
    assert summary["total_lines"] == 3500
    assert len(summary["modules"]) == 2
    assert summary["modules"][0]["name"] == "app/services/llm/gemini.py"


def test_synthesize_steps_from_timings() -> None:
    steps = synthesize_steps_from_timings(
        {
            "git": 0.1,
            "bandit": 1.2,
            "agent_security": 10.0,
        }
    )
    ids = [step["id"] for step in steps]
    assert ids[0] == "initialized"
    assert "git" in ids
    assert "bandit" in ids
    assert "security_agent" in ids
    assert ids[-1] == "completed"
    assert all(step["status"] == "completed" for step in steps)


def test_imported_report_includes_steps_and_coverage(tmp_path: Path) -> None:
    report = {
        "metadata": {
            "project_name": "Backend",
            "project_path": "/demo/Backend",
            "provider": "gemini",
            "timestamp": "2026-07-26T01:16:19+00:00",
            "execution_duration": 12.5,
            "app_version": "0.1.0",
        },
        "executive_summary": "Imported summary",
        "overall_health": 8.0,
        "category_scores": {},
        "priority_distribution": {},
        "category_issue_counts": {},
        "top_issues": [],
        "recommendations": [],
        "detailed_findings": {},
        "themes": [],
        "appendix": {
            "timings": {"git": 0.2, "coverage": 1.5, "agent_style": 3.0},
            "tool_results": {
                "coverage": {
                    "data": {
                        "percent_covered": 50.0,
                        "covered_lines": 10,
                        "num_statements": 20,
                        "files": {
                            "tools/pytest_tool.py": {
                                "summary": {
                                    "percent_covered": 40.0,
                                    "covered_lines": 4,
                                    "num_statements": 10,
                                }
                            }
                        },
                    }
                }
            },
        },
        "errors": [],
    }
    record = report_document_to_persisted_record(
        report,
        source_report=str(tmp_path / "Backend-review.json"),
    )
    assert len(record["steps"]) >= 3
    assert record["result"]["coverage"]["percentage"] == 50.0
    assert record["result"]["coverage"]["modules"]


def test_enrich_historical_record_without_steps(tmp_path: Path) -> None:
    store = ReviewPersistence(data_dir=tmp_path / "reviews")
    record = {
        "id": "imported-legacy",
        "status": "completed",
        "project_name": "Backend",
        "project_path": "/x",
        "provider": "gemini",
        "created_at": "2026-07-26T01:16:19+00:00",
        "started_at": "2026-07-26T01:16:19+00:00",
        "completed_at": "2026-07-26T01:16:19+00:00",
        "steps": [],
        "result": {
            "aggregated_review": {
                "timings": {"pytest": 1.0, "coverage": 2.0},
                "tools": {
                    "coverage": {
                        "data": {
                            "percent_covered": 80.0,
                            "covered_lines": 8,
                            "num_statements": 10,
                            "files": {
                                "app/main.py": {
                                    "summary": {
                                        "percent_covered": 80.0,
                                        "covered_lines": 8,
                                        "num_statements": 10,
                                    }
                                }
                            },
                        }
                    }
                },
            }
        },
        "source": "imported_report",
    }
    store.save_review(record)
    loaded = store.load_review("imported-legacy")
    assert loaded is not None
    assert len(loaded["steps"]) > 0
    assert loaded["result"]["coverage"]["percentage"] == 80.0


def test_resolve_steps_boundary_when_no_timings() -> None:
    steps = resolve_steps_for_record(
        {
            "steps": [],
            "started_at": "2026-01-01T00:00:00+00:00",
            "completed_at": "2026-01-01T00:01:00+00:00",
            "result": {"aggregated_review": {}},
        }
    )
    assert [step["id"] for step in steps] == ["initialized", "completed"]


def test_attach_coverage_summary_to_result() -> None:
    result = attach_coverage_summary_to_result(
        {
            "aggregated_review": {
                "tools": {
                    "coverage": {
                        "data": {
                            "percent_covered": 0.5,
                            "covered_lines": 1,
                            "num_statements": 2,
                            "files": {},
                        }
                    }
                }
            }
        }
    )
    assert result is not None
    assert result["coverage"]["percentage"] == 50.0
