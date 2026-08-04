"""Tests for review report artifact download endpoint."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_download_report_unsupported_format() -> None:
    response = client.get("/reviews/any-id/reports/pdf")
    assert response.status_code == 400


def test_download_report_unknown_review() -> None:
    manager = MagicMock()
    manager.get_job.return_value = None
    with patch("app.api.routes.reviews.get_review_job_manager", return_value=manager):
        response = client.get("/reviews/missing/reports/json")
    assert response.status_code == 404


def test_download_report_streams_file(tmp_path: Path) -> None:
    report_file = tmp_path / "demo-review.json"
    report_file.write_text('{"ok": true}', encoding="utf-8")

    job = MagicMock()
    job.result = {"artifacts": {"json": str(report_file)}}

    manager = MagicMock()
    manager.get_job.return_value = job

    with patch("app.api.routes.reviews.get_review_job_manager", return_value=manager):
        response = client.get("/reviews/demo/reports/json")

    assert response.status_code == 200
    assert response.json() == {"ok": True}
    assert "application/json" in response.headers.get("content-type", "")
