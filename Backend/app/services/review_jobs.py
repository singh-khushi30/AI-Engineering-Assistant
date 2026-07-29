"""In-memory review job store and background runner."""

from __future__ import annotations

import logging
import threading
import time
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from agents.intelligence.intelligence import ReviewIntelligence
from agents.orchestration.orchestrator import ReviewOrchestrator
from app.api.schemas.review import (
    ReviewJobStatus,
    ReviewProgressStep,
    ReviewResultResponse,
    ReviewStatusResponse,
    ReviewStepStatus,
    ReviewSummaryItem,
    StartReviewRequest,
)
from app.core.config import get_settings
from app.core.llm_config import LLMProvider, get_llm_config
from app.services.llm_service import LLMService
from reports.builder import ReportBuilder
from reports.exporter import ReportExporter

logger = logging.getLogger(__name__)

STEP_DEFINITIONS: list[tuple[str, str]] = [
    ("initialized", "Review initialized"),
    ("repository_validated", "Repository validated"),
    ("git", "Git analysis"),
    ("bandit", "Bandit security analysis"),
    ("ruff", "Ruff style analysis"),
    ("pytest", "Pytest analysis"),
    ("coverage", "Coverage analysis"),
    ("security_agent", "Security review agent"),
    ("style_agent", "Style review agent"),
    ("testing_agent", "Testing review agent"),
    ("architecture_agent", "Architecture review agent"),
    ("executive_summary", "Executive summary"),
    ("report_generation", "Report generation"),
    ("completed", "Review completed"),
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _safe_error_message(exc: BaseException | str) -> str:
    text = str(exc).strip() or "Review failed"
    # Avoid dumping huge traces into API responses.
    if len(text) > 500:
        text = text[:497] + "..."
    lowered = text.lower()
    for secret_token in ("api_key", "apikey", "authorization", "bearer ", "token="):
        if secret_token in lowered:
            return "Review failed due to a provider authentication or configuration error."
    return text


@dataclass
class ReviewJob:
    id: str
    request: StartReviewRequest
    project_path: str
    project_name: str
    provider: str
    status: ReviewJobStatus = "queued"
    created_at: datetime = field(default_factory=_utcnow)
    started_at: datetime | None = None
    updated_at: datetime = field(default_factory=_utcnow)
    completed_at: datetime | None = None
    current_step: str | None = None
    message: str | None = "Review queued"
    error: str | None = None
    failed_stage: str | None = None
    steps: list[ReviewProgressStep] = field(default_factory=list)
    result: dict[str, Any] | None = None
    cancel_requested: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)


class ReviewJobManager:
    """Process-local job registry (no database)."""

    def __init__(self, *, max_workers: int = 2) -> None:
        self._jobs: dict[str, ReviewJob] = {}
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="review-job")
        self._futures: dict[str, Future[None]] = {}

    def create_job(self, request: StartReviewRequest) -> ReviewJob:
        path = Path(request.project_path).expanduser()
        # Keep unresolved display path until worker validates existence.
        project_name = path.name or "project"
        job_id = str(uuid.uuid4())
        steps = [
            ReviewProgressStep(id=step_id, label=label, status="pending")
            for step_id, label in STEP_DEFINITIONS
        ]
        # Mark tools that were disabled as skipped up front.
        disabled = {
            "git": not request.include_git,
            "bandit": not request.include_bandit,
            "ruff": not request.include_ruff,
            "pytest": not request.include_pytest,
            "coverage": not request.include_coverage,
        }
        for step in steps:
            if disabled.get(step.id):
                step.status = "skipped"
                step.detail = "Disabled in review options"

        job = ReviewJob(
            id=job_id,
            request=request,
            project_path=str(path),
            project_name=project_name,
            provider=request.provider,
            steps=steps,
        )
        with self._lock:
            self._jobs[job_id] = job
            future = self._executor.submit(self._run_job, job_id)
            self._futures[job_id] = future
        return job

    def get_job(self, job_id: str) -> ReviewJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self) -> list[ReviewJob]:
        with self._lock:
            jobs = list(self._jobs.values())
        return sorted(jobs, key=lambda job: job.created_at, reverse=True)

    def cancel_job(self, job_id: str) -> ReviewJob | None:
        job = self.get_job(job_id)
        if job is None:
            return None
        with job._lock:
            if job.status in {"completed", "failed", "cancelled"}:
                return job
            job.cancel_requested = True
            if job.status == "queued":
                job.status = "cancelled"
                job.message = "Review cancelled"
                job.error = "Review cancelled before execution started"
                job.completed_at = _utcnow()
                job.updated_at = job.completed_at
                self._set_step(job, "completed", "failed", detail="Cancelled")
            else:
                job.message = "Cancellation requested"
                job.updated_at = _utcnow()
        return job

    def to_status(self, job: ReviewJob) -> ReviewStatusResponse:
        with job._lock:
            elapsed = None
            if job.started_at is not None:
                end = job.completed_at or _utcnow()
                elapsed = round((end - job.started_at).total_seconds(), 3)
            current_label = None
            if job.current_step:
                for step in job.steps:
                    if step.id == job.current_step:
                        current_label = step.label
                        break
            return ReviewStatusResponse(
                id=job.id,
                status=job.status,
                project_path=job.project_path,
                project_name=job.project_name,
                provider=job.provider,
                current_step=job.current_step,
                current_step_label=current_label,
                message=job.message,
                error=job.error,
                failed_stage=job.failed_stage,
                steps=[step.model_copy(deep=True) for step in job.steps],
                created_at=job.created_at,
                started_at=job.started_at,
                updated_at=job.updated_at,
                completed_at=job.completed_at,
                elapsed_seconds=elapsed,
            )

    def to_summary(self, job: ReviewJob) -> ReviewSummaryItem:
        with job._lock:
            coverage = None
            tests_passed = None
            tests_failed = None
            high = medium = low = None
            duration = None
            if job.result:
                report = job.result.get("report") or {}
                meta = report.get("metadata") or {}
                duration = meta.get("execution_duration") or job.result.get("execution_time")
                tools = (job.result.get("aggregated_review") or {}).get("tools") or {}
                coverage_data = (tools.get("coverage") or {}).get("data") or {}
                if isinstance(coverage_data.get("total_coverage"), (int, float)):
                    coverage = float(coverage_data["total_coverage"])
                elif isinstance(coverage_data.get("percent_covered"), (int, float)):
                    coverage = float(coverage_data["percent_covered"])
                pytest_data = (tools.get("pytest") or {}).get("data") or {}
                if isinstance(pytest_data.get("passed"), int):
                    tests_passed = pytest_data["passed"]
                if isinstance(pytest_data.get("failed"), int):
                    tests_failed = pytest_data["failed"]
                priority = report.get("priority_distribution") or {}
                high = priority.get("high")
                medium = priority.get("medium")
                low = priority.get("low")
            if duration is None and job.started_at and job.completed_at:
                duration = round((job.completed_at - job.started_at).total_seconds(), 3)
            return ReviewSummaryItem(
                id=job.id,
                project_name=job.project_name,
                project_path=job.project_path,
                provider=job.provider,
                status=job.status,
                coverage_percent=coverage,
                tests_passed=tests_passed,
                tests_failed=tests_failed,
                high_count=high if isinstance(high, int) else None,
                medium_count=medium if isinstance(medium, int) else None,
                low_count=low if isinstance(low, int) else None,
                duration_seconds=float(duration) if isinstance(duration, (int, float)) else None,
                created_at=job.created_at,
                completed_at=job.completed_at,
                error=job.error,
            )

    def to_result(self, job: ReviewJob) -> ReviewResultResponse:
        with job._lock:
            duration = None
            if job.started_at is not None:
                end = job.completed_at or _utcnow()
                duration = round((end - job.started_at).total_seconds(), 3)
            return ReviewResultResponse(
                id=job.id,
                status=job.status,
                project_name=job.project_name,
                project_path=job.project_path,
                provider=job.provider,
                created_at=job.created_at,
                started_at=job.started_at,
                completed_at=job.completed_at,
                duration_seconds=duration,
                error=job.error,
                failed_stage=job.failed_stage,
                message=job.message,
                steps=[step.model_copy(deep=True) for step in job.steps],
                request=job.request.model_dump(),
                result=job.result,
            )

    def _run_job(self, job_id: str) -> None:
        job = self.get_job(job_id)
        if job is None:
            return

        with job._lock:
            if job.status == "cancelled":
                return
            job.status = "running"
            job.started_at = _utcnow()
            job.updated_at = job.started_at
            job.message = "Review running"

        timeout = job.request.timeout_seconds or 900
        deadline = time.monotonic() + timeout

        def timed_out() -> bool:
            return time.monotonic() > deadline

        def should_cancel() -> bool:
            with job._lock:
                return job.cancel_requested or timed_out()

        try:
            self._mark_step(job, "initialized", "running")
            self._mark_step(job, "initialized", "completed")

            if should_cancel():
                self._finalize_cancelled(job, timed_out=timed_out())
                return

            path = Path(job.request.project_path).expanduser().resolve()
            self._mark_step(job, "repository_validated", "running")
            if not path.exists():
                raise FileNotFoundError(f"Project path does not exist: {path}")
            if not path.is_dir():
                raise NotADirectoryError(f"Project path is not a directory: {path}")

            with job._lock:
                job.project_path = str(path)
                job.project_name = path.name
                job.updated_at = _utcnow()
            self._mark_step(job, "repository_validated", "completed")

            if should_cancel():
                self._finalize_cancelled(job, timed_out=timed_out())
                return

            llm_config = get_llm_config().model_copy(deep=True)
            provider = LLMProvider(job.request.provider)
            updates: dict[str, Any] = {
                "provider": provider,
                "primary_provider": provider,
            }
            if job.request.enable_fallback is not None:
                updates["fallback_enabled"] = job.request.enable_fallback
            llm_config = llm_config.model_copy(update=updates)

            missing = llm_config.missing_credentials_message_for(provider)
            if missing and not llm_config.fallback_enabled:
                raise ValueError(missing)

            orchestrator = ReviewOrchestrator(
                llm_config=llm_config,
                llm_service=LLMService(config=llm_config),
            )

            def on_progress(step_id: str, event: str) -> None:
                if event == "started":
                    self._mark_step(job, step_id, "running")
                elif event == "completed":
                    self._mark_step(job, step_id, "completed")
                elif event == "failed":
                    self._mark_step(job, step_id, "failed")
                elif event == "skipped":
                    self._mark_step(job, step_id, "skipped")

            aggregated = orchestrator.run(
                path,
                include_git=job.request.include_git,
                include_bandit=job.request.include_bandit,
                include_ruff=job.request.include_ruff,
                include_pytest=job.request.include_pytest,
                include_coverage=job.request.include_coverage,
                progress_callback=on_progress,
                should_cancel=should_cancel,
            )

            if should_cancel():
                self._finalize_cancelled(job, timed_out=timed_out())
                return

            self._mark_step(job, "executive_summary", "running")
            intelligence = ReviewIntelligence(llm_service=LLMService(config=llm_config))
            intelligence_payload = intelligence.analyze(aggregated, include_summary=True)
            self._mark_step(job, "executive_summary", "completed")

            if should_cancel():
                self._finalize_cancelled(job, timed_out=timed_out())
                return

            self._mark_step(job, "report_generation", "running")
            settings = get_settings()
            reports_dir = Path(settings.reports_dir)
            if not reports_dir.is_absolute():
                reports_dir = Path.cwd() / reports_dir
            document = ReportBuilder().build(aggregated, intelligence_payload)
            export_result = ReportExporter(reports_dir).export_all(document)
            self._mark_step(job, "report_generation", "completed")

            success = aggregated.success and bool(export_result["artifacts"].get("json"))
            payload = {
                "success": success,
                "execution_time": aggregated.execution_time,
                "aggregated_review": aggregated.to_dict(),
                "intelligence": intelligence_payload,
                "report": document.to_dict(),
                "artifacts": export_result["artifacts"],
                "errors": list(aggregated.errors)
                + list(intelligence_payload.get("summary_meta", {}).get("errors") or [])
                + list(export_result.get("errors") or []),
                "output_dir": export_result["output_dir"],
                "coverage_target": job.request.coverage_target,
            }

            with job._lock:
                job.result = payload
                job.status = "completed" if success else "failed"
                job.completed_at = _utcnow()
                job.updated_at = job.completed_at
                if success:
                    job.message = "Review completed"
                    job.error = None
                    self._set_step(job, "completed", "completed")
                    job.current_step = "completed"
                else:
                    job.message = "Review finished with errors"
                    errs = payload.get("errors") or []
                    job.error = _safe_error_message(errs[0] if errs else "Review failed")
                    job.failed_stage = job.current_step
                    self._set_step(job, "completed", "failed", detail=job.error)

        except Exception as exc:  # noqa: BLE001
            logger.exception("Review job failed id=%s", job_id)
            with job._lock:
                job.status = "failed"
                job.error = _safe_error_message(exc)
                job.failed_stage = job.current_step or "initialized"
                job.message = "Review failed"
                job.completed_at = _utcnow()
                job.updated_at = job.completed_at
                if job.current_step:
                    self._set_step(job, job.current_step, "failed", detail=job.error)
                self._set_step(job, "completed", "failed", detail=job.error)

    def _finalize_cancelled(self, job: ReviewJob, *, timed_out: bool) -> None:
        with job._lock:
            job.status = "cancelled" if not timed_out else "failed"
            job.completed_at = _utcnow()
            job.updated_at = job.completed_at
            if timed_out:
                job.error = "Review timed out"
                job.message = "Review timed out"
                job.failed_stage = job.current_step
                self._set_step(job, "completed", "failed", detail=job.error)
            else:
                job.error = "Review cancelled"
                job.message = "Review cancelled"
                job.failed_stage = job.current_step
                self._set_step(job, "completed", "failed", detail=job.error)

    def _mark_step(
        self,
        job: ReviewJob,
        step_id: str,
        status: ReviewStepStatus,
        *,
        detail: str | None = None,
    ) -> None:
        with job._lock:
            self._set_step(job, step_id, status, detail=detail)
            if status == "running":
                job.current_step = step_id
                job.message = next(
                    (step.label for step in job.steps if step.id == step_id),
                    step_id,
                )
            job.updated_at = _utcnow()

    def _set_step(
        self,
        job: ReviewJob,
        step_id: str,
        status: ReviewStepStatus,
        *,
        detail: str | None = None,
    ) -> None:
        for step in job.steps:
            if step.id == step_id:
                if step.status == "skipped" and status in {"running", "completed"}:
                    return
                step.status = status
                if detail is not None:
                    step.detail = detail
                break


_manager: ReviewJobManager | None = None
_manager_lock = threading.Lock()


def get_review_job_manager() -> ReviewJobManager:
    global _manager
    with _manager_lock:
        if _manager is None:
            _manager = ReviewJobManager()
        return _manager
