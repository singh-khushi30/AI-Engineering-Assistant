"""Review job HTTP endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.api.schemas.review import (
    ReviewListResponse,
    ReviewResultResponse,
    ReviewStatusResponse,
    StartReviewRequest,
    StartReviewResponse,
)
from app.services.report_artifacts import (
    media_type_for_format,
    normalize_report_format,
    resolve_artifact_path,
)
from app.services.review_jobs import get_review_job_manager

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post(
    "",
    response_model=StartReviewResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def start_review(payload: StartReviewRequest) -> StartReviewResponse:
    """Queue a multi-agent review for a local repository path."""
    manager = get_review_job_manager()
    job = manager.create_job(payload)
    return StartReviewResponse(
        id=job.id,
        status=job.status,
        project_path=job.project_path,
        project_name=job.project_name,
        provider=job.provider,
        created_at=job.created_at,
        message=job.message or "Review queued",
    )


@router.get("", response_model=ReviewListResponse)
async def list_reviews() -> ReviewListResponse:
    manager = get_review_job_manager()
    jobs = manager.list_jobs()
    items = [manager.to_summary(job) for job in jobs]
    return ReviewListResponse(items=items, total=len(items))


@router.get("/{review_id}/status", response_model=ReviewStatusResponse)
async def get_review_status(review_id: str) -> ReviewStatusResponse:
    manager = get_review_job_manager()
    job = manager.get_job(review_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return manager.to_status(job)


@router.get("/{review_id}", response_model=ReviewResultResponse)
async def get_review_result(review_id: str) -> ReviewResultResponse:
    manager = get_review_job_manager()
    job = manager.get_job(review_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return manager.to_result(job)


@router.post("/{review_id}/cancel", response_model=ReviewStatusResponse)
async def cancel_review(review_id: str) -> ReviewStatusResponse:
    manager = get_review_job_manager()
    job = manager.cancel_job(review_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    return manager.to_status(job)


@router.get("/{review_id}/reports/{format_name}")
async def download_review_report(review_id: str, format_name: str) -> FileResponse:
    """Stream a generated report artifact (json / markdown / html) for a review."""
    normalized = normalize_report_format(format_name)
    if normalized is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported report format. Use json, markdown, or html.",
        )

    manager = get_review_job_manager()
    job = manager.get_job(review_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")

    path = resolve_artifact_path(job.result if isinstance(job.result, dict) else None, normalized)
    if path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{normalized.upper()} report artifact is not available for this review.",
        )

    return FileResponse(
        path=path,
        media_type=media_type_for_format(normalized),
        filename=path.name,
        content_disposition_type="inline",
    )
