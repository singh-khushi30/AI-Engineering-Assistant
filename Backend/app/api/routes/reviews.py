"""Review job HTTP endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.api.schemas.review import (
    ReviewListResponse,
    ReviewResultResponse,
    ReviewStatusResponse,
    StartReviewRequest,
    StartReviewResponse,
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
