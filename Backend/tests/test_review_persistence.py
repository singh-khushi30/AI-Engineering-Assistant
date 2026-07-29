"""Tests for review JSON persistence and restart hydration."""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.api.schemas.review import StartReviewRequest
from app.services.review_jobs import ReviewJobManager
from app.services.review_persistence import (
    ReviewPersistence,
    report_document_to_persisted_record,
)


def test_persist_and_hydrate_review(tmp_path: Path) -> None:
    store = ReviewPersistence(data_dir=tmp_path / "reviews")
    manager = ReviewJobManager(
        max_workers=1,
        persistence=store,
        hydrate=False,
        import_legacy_reports=False,
    )

    with patch.object(manager._executor, "submit", return_value=MagicMock()):
        job = manager.create_job(
            StartReviewRequest(project_path="/tmp/demo-project", provider="gemini")
        )
    with job._lock:
        job.status = "completed"
        job.project_name = "demo-project"
        job.completed_at = job.created_at
        job.message = "Review completed"
        job.result = {
            "success": True,
            "execution_time": 1.5,
            "aggregated_review": {
                "tools": {
                    "coverage": {"data": {"percent_covered": 81.5}},
                    "pytest": {"data": {"passed": 10, "failed": 0}},
                }
            },
            "report": {
                "metadata": {
                    "project_name": "demo-project",
                    "project_path": "/tmp/demo-project",
                    "provider": "gemini",
                    "execution_duration": 1.5,
                },
                "priority_distribution": {"high": 1, "medium": 2, "low": 3},
                "executive_summary": "Looks good",
            },
            "artifacts": {"json": str(tmp_path / "demo.json")},
            "errors": [],
        }
        manager._persist_job_unlocked(job)

    assert store.review_path(job.id).exists()
    assert store.index_path.exists()

    restored = ReviewJobManager(
        max_workers=1,
        persistence=store,
        hydrate=True,
        import_legacy_reports=False,
    )
    jobs = restored.list_jobs()
    assert any(item.id == job.id for item in jobs)
    loaded = restored.get_job(job.id)
    assert loaded is not None
    assert loaded.status == "completed"
    assert loaded.result is not None
    summary = restored.to_summary(loaded)
    assert summary.coverage_percent == 81.5
    assert summary.tests_passed == 10


def test_import_legacy_report_json(tmp_path: Path) -> None:
    reports_dir = tmp_path / "reports"
    reviews_dir = tmp_path / "reviews"
    reports_dir.mkdir()
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
        "category_scores": {"security": 8.0, "style": 9.0, "testing": 7.0, "architecture": 8.5},
        "priority_distribution": {"high": 2, "medium": 4, "low": 1},
        "category_issue_counts": {},
        "top_issues": [],
        "recommendations": [],
        "detailed_findings": {"security": {"data": {"findings": []}}},
        "themes": ["solid structure"],
        "appendix": {
            "tool_results": {
                "coverage": {"data": {"percent_covered": 73.93}},
                "pytest": {"data": {"passed": 51, "failed": 0}},
            }
        },
        "errors": [],
    }
    report_path = reports_dir / "Backend-review.json"
    report_path.write_text(json.dumps(report), encoding="utf-8")

    store = ReviewPersistence(data_dir=reviews_dir)
    imported = store.import_legacy_report_files(reports_dir)
    assert imported == 1

    # Second import should be idempotent
    assert store.import_legacy_report_files(reports_dir) == 0

    manager = ReviewJobManager(
        max_workers=1,
        persistence=store,
        hydrate=True,
        import_legacy_reports=False,
    )
    assert len(manager.list_jobs()) == 1
    job = manager.list_jobs()[0]
    assert job.project_name == "Backend"
    assert job.status == "completed"
    assert job.id.startswith("imported-")
    result = manager.to_result(job)
    assert result.result is not None
    assert result.result["report"]["executive_summary"] == "Imported summary"


def test_report_document_to_persisted_record_stable_id() -> None:
    report = {
        "metadata": {
            "project_name": "Backend",
            "project_path": "/x",
            "provider": "gemini",
            "timestamp": "2026-01-01T00:00:00+00:00",
            "execution_duration": 1,
            "app_version": "0.1.0",
        },
        "executive_summary": "x",
        "overall_health": 1,
        "category_scores": {},
        "priority_distribution": {},
        "category_issue_counts": {},
        "top_issues": [],
        "recommendations": [],
        "detailed_findings": {},
        "themes": [],
        "appendix": {},
        "errors": [],
    }
    a = report_document_to_persisted_record(report, source_report="/tmp/a/Backend-review.json")
    b = report_document_to_persisted_record(report, source_report="/tmp/a/Backend-review.json")
    assert a["id"] == b["id"]
