"""Phase 1.3C multi-agent review orchestration."""

from agents.orchestration.aggregator import AggregatedReview, aggregate_review_results
from agents.orchestration.context import ReviewContext
from agents.orchestration.tool_runner import ReviewToolRunner

__all__ = [
    "AggregatedReview",
    "ReviewContext",
    "ReviewOrchestrator",
    "ReviewToolRunner",
    "aggregate_review_results",
]


def __getattr__(name: str):
    if name == "ReviewOrchestrator":
        from agents.orchestration.orchestrator import ReviewOrchestrator

        return ReviewOrchestrator
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
