"""CrewAI crew definitions."""

from agents.crews.hello_crew import (
    CrewRunResult,
    build_hello_agent,
    build_hello_crew,
    build_hello_task,
    run_hello_crew,
)

__all__ = [
    "CrewRunResult",
    "build_hello_agent",
    "build_hello_crew",
    "build_hello_task",
    "build_review_agents",
    "build_review_crew",
    "build_review_tasks",
    "crew_registry_info",
    "run_hello_crew",
]


def __getattr__(name: str):
    if name in {
        "build_review_agents",
        "build_review_crew",
        "build_review_tasks",
        "crew_registry_info",
    }:
        from agents.crews import review_crew

        return getattr(review_crew, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
