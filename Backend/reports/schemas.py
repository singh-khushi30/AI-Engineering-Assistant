"""Report document schema for Phase 1.3D outputs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ReportMetadata(BaseModel):
    product_name: str = "AI Engineering Assistant"
    project_name: str
    project_path: str
    timestamp: str
    execution_duration: float
    model_used: str | None = None
    provider: str | None = None
    app_version: str
    agent_versions: dict[str, str] = Field(default_factory=dict)
    tool_versions: dict[str, str] = Field(default_factory=dict)


class ReportDocument(BaseModel):
    """Canonical report payload consumed by all formatters."""

    metadata: ReportMetadata
    executive_summary: str
    overall_health: float
    category_scores: dict[str, float]
    priority_distribution: dict[str, int]
    category_issue_counts: dict[str, int]
    top_issues: list[dict[str, Any]] = Field(default_factory=list)
    recommendations: list[dict[str, Any]] = Field(default_factory=list)
    detailed_findings: dict[str, Any] = Field(default_factory=dict)
    themes: list[str] = Field(default_factory=list)
    appendix: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()
