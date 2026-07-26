"""Shared review context passed through the Phase 1.3C workflow."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ReviewContext:
    """Mutable shared state for one full-project review run.

    Architectural note:
      Tools run once and store results here. Every review agent reads from this
      context so scanners are not re-executed per agent.
    """

    project_path: Path
    metadata: dict[str, Any] = field(default_factory=dict)
    git_result: dict[str, Any] | None = None
    bandit_result: dict[str, Any] | None = None
    ruff_result: dict[str, Any] | None = None
    pytest_result: dict[str, Any] | None = None
    coverage_result: dict[str, Any] | None = None
    project_structure: dict[str, Any] | None = None
    tool_errors: list[str] = field(default_factory=list)
    timings: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "project_path": str(self.project_path),
            "metadata": self.metadata,
            "git_result": self.git_result,
            "bandit_result": self.bandit_result,
            "ruff_result": self.ruff_result,
            "pytest_result": self.pytest_result,
            "coverage_result": self.coverage_result,
            "project_structure": self.project_structure,
            "tool_errors": list(self.tool_errors),
            "timings": dict(self.timings),
        }
