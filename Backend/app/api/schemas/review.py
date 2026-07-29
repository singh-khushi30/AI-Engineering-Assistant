"""Pydantic request/response schemas for the review API."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

ReviewJobStatus = Literal["queued", "running", "completed", "failed", "cancelled"]
ReviewStepStatus = Literal["pending", "running", "completed", "failed", "skipped"]

SUPPORTED_PROVIDERS = (
    "gemini",
    "groq",
    "openrouter",
    "ollama",
    "openai",
    "anthropic",
    "azure_openai",
)


class StartReviewRequest(BaseModel):
    """Payload for POST /reviews."""

    project_path: str = Field(..., min_length=1, description="Absolute path on the API host")
    provider: str = Field(default="gemini", description="LLM provider id")
    include_git: bool = True
    include_bandit: bool = True
    include_ruff: bool = True
    include_pytest: bool = True
    include_coverage: bool = True
    coverage_target: float | None = Field(default=80.0, ge=0.0, le=100.0)
    timeout_seconds: int | None = Field(default=900, ge=30, le=7200)
    enable_fallback: bool | None = Field(
        default=None,
        description="Override LLM fallback behavior for this review",
    )

    @field_validator("project_path")
    @classmethod
    def trim_project_path(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("project_path is required")
        return trimmed

    @field_validator("provider")
    @classmethod
    def normalize_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Unsupported provider '{value}'. "
                f"Supported: {', '.join(SUPPORTED_PROVIDERS)}"
            )
        return normalized


class ReviewProgressStep(BaseModel):
    id: str
    label: str
    status: ReviewStepStatus = "pending"
    detail: str | None = None


class StartReviewResponse(BaseModel):
    id: str
    status: ReviewJobStatus
    project_path: str
    project_name: str
    provider: str
    created_at: datetime
    message: str = "Review queued"


class ReviewStatusResponse(BaseModel):
    id: str
    status: ReviewJobStatus
    project_path: str
    project_name: str
    provider: str
    current_step: str | None = None
    current_step_label: str | None = None
    message: str | None = None
    error: str | None = None
    failed_stage: str | None = None
    steps: list[ReviewProgressStep] = Field(default_factory=list)
    created_at: datetime
    started_at: datetime | None = None
    updated_at: datetime
    completed_at: datetime | None = None
    elapsed_seconds: float | None = None


class ReviewSummaryItem(BaseModel):
    id: str
    project_name: str
    project_path: str
    provider: str
    status: ReviewJobStatus
    coverage_percent: float | None = None
    tests_passed: int | None = None
    tests_failed: int | None = None
    high_count: int | None = None
    medium_count: int | None = None
    low_count: int | None = None
    duration_seconds: float | None = None
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class ReviewListResponse(BaseModel):
    items: list[ReviewSummaryItem]
    total: int


class ReviewResultResponse(BaseModel):
    """Full review payload returned by GET /reviews/{id}."""

    id: str
    status: ReviewJobStatus
    project_name: str
    project_path: str
    provider: str
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    duration_seconds: float | None = None
    error: str | None = None
    failed_stage: str | None = None
    message: str | None = None
    steps: list[ReviewProgressStep] = Field(default_factory=list)
    request: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] | None = None
