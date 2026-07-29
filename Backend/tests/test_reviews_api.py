"""API tests for review job endpoints (without running the full pipeline)."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.services.review_jobs import ReviewJobManager, get_review_job_manager

client = TestClient(app)


def test_start_review_validation_empty_path() -> None:
    response = client.post("/reviews", json={"project_path": "   ", "provider": "gemini"})
    assert response.status_code == 422


def test_start_review_unsupported_provider() -> None:
    response = client.post(
        "/reviews",
        json={"project_path": "/tmp/demo", "provider": "not-a-provider"},
    )
    assert response.status_code == 422


def test_get_unknown_review_returns_404() -> None:
    response = client.get("/reviews/does-not-exist")
    assert response.status_code == 404
    assert response.json()["detail"] == "Review not found"


def test_start_review_queues_job() -> None:
    manager = ReviewJobManager(
        max_workers=1,
        hydrate=False,
        import_legacy_reports=False,
    )

    def fake_run(job_id: str) -> None:
        job = manager.get_job(job_id)
        assert job is not None
        with job._lock:
            job.status = "completed"
            job.message = "Review completed"

    with patch("app.api.routes.reviews.get_review_job_manager", return_value=manager):
        with patch.object(manager, "_run_job", side_effect=fake_run):
            response = client.post(
                "/reviews",
                json={
                    "project_path": "/tmp/demo-project",
                    "provider": "gemini",
                    "include_git": True,
                    "include_bandit": False,
                },
            )

    assert response.status_code == 202
    payload = response.json()
    assert "id" in payload
    assert payload["status"] in {"queued", "running", "completed"}
    assert payload["provider"] == "gemini"
    assert payload["project_name"] == "demo-project"

    status = client.get(f"/reviews/{payload['id']}/status")
    # Manager is patched only on start; use same manager via patch for status.
    with patch("app.api.routes.reviews.get_review_job_manager", return_value=manager):
        status = client.get(f"/reviews/{payload['id']}/status")
        result = client.get(f"/reviews/{payload['id']}")
        listing = client.get("/reviews")

    assert status.status_code == 200
    assert status.json()["id"] == payload["id"]
    assert result.status_code == 200
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1


def test_cancel_queued_review() -> None:
    manager = ReviewJobManager(
        max_workers=1,
        hydrate=False,
        import_legacy_reports=False,
    )

    # Prevent background execution from racing cancel.
    with patch.object(manager._executor, "submit", return_value=MagicMock()):
        with patch("app.api.routes.reviews.get_review_job_manager", return_value=manager):
            created = client.post(
                "/reviews",
                json={"project_path": "/tmp/cancel-me", "provider": "ollama"},
            )
            assert created.status_code == 202
            review_id = created.json()["id"]
            cancelled = client.post(f"/reviews/{review_id}/cancel")

    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
