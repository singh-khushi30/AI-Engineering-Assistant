"""Pure aggregation of independent review-agent results."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AggregatedReview(BaseModel):
    """Combined review object — no scoring or summarization."""

    success: bool
    project_path: str
    execution_time: float
    tools: dict[str, Any] = Field(default_factory=dict)
    security: dict[str, Any] | None = None
    style: dict[str, Any] | None = None
    testing: dict[str, Any] | None = None
    architecture: dict[str, Any] | None = None
    crew: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)
    timings: dict[str, float] = Field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


def aggregate_review_results(
    *,
    project_path: str,
    execution_time: float,
    tools: dict[str, Any],
    agent_results: dict[str, dict[str, Any] | None],
    crew_info: dict[str, Any] | None = None,
    errors: list[str] | None = None,
    timings: dict[str, float] | None = None,
) -> AggregatedReview:
    """Assemble per-agent payloads into one structured object."""
    collected_errors = list(errors or [])
    for name, payload in agent_results.items():
        if payload is None:
            collected_errors.append(f"{name} agent returned no result")
            continue
        if payload.get("success") is False:
            for err in payload.get("errors") or []:
                collected_errors.append(f"{name}: {err}")

    # Overall success if project review completed and at least one agent succeeded.
    any_agent_ok = any(
        isinstance(payload, dict) and payload.get("success") is True
        for payload in agent_results.values()
    )

    return AggregatedReview(
        success=any_agent_ok,
        project_path=project_path,
        execution_time=round(execution_time, 3),
        tools=tools,
        security=agent_results.get("security"),
        style=agent_results.get("style"),
        testing=agent_results.get("testing"),
        architecture=agent_results.get("architecture"),
        crew=crew_info or {},
        errors=collected_errors,
        timings=timings or {},
    )
