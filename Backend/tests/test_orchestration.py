"""Unit tests for Phase 1.3C orchestration (mocked tools/agents — no live Gemini)."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from agents.base_agent import AgentResult
from agents.orchestration.aggregator import aggregate_review_results
from agents.orchestration.context import ReviewContext
from agents.orchestration.orchestrator import ReviewOrchestrator
from agents.orchestration.tool_runner import ReviewToolRunner
from tools.base_tool import ToolResult


class _FakeTool:
    def __init__(self, name: str, data: dict[str, Any] | None = None) -> None:
        self.name = name
        self.data = data or {}

    def timed_run(self, project_path: Any) -> ToolResult:
        _ = project_path
        return ToolResult(
            success=True,
            tool=self.name,
            execution_time=0.01,
            data=self.data,
            errors=[],
        )


class _FakeAgent:
    def __init__(self, name: str, *, succeed: bool = True) -> None:
        self.name = name
        self.succeed = succeed

    def run(self, context: dict[str, Any]) -> AgentResult:
        _ = context
        if not self.succeed:
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=0.01,
                errors=[f"{self.name} failed intentionally"],
            )
        return AgentResult(
            success=True,
            agent=self.name,
            execution_time=0.02,
            data={"review": {"agent": self.name, "summary": "ok", "findings": [], "recommendations": [], "severity": "none", "confidence": 0.9}},
        )


def test_aggregate_review_results_shape() -> None:
    aggregated = aggregate_review_results(
        project_path="/demo",
        execution_time=1.23,
        tools={"bandit": {"success": True}},
        agent_results={
            "security": {"success": True, "data": {"review": {"summary": "s"}}},
            "style": {"success": False, "errors": ["boom"]},
            "testing": {"success": True, "data": {}},
            "architecture": {"success": True, "data": {}},
        },
        errors=["bandit: warning"],
        timings={"bandit": 0.1},
    )
    payload = aggregated.to_dict()
    assert payload["security"]["success"] is True
    assert payload["style"]["success"] is False
    assert any("style: boom" in err for err in payload["errors"])
    assert aggregated.success is True


def test_orchestrator_missing_project() -> None:
    orchestrator = ReviewOrchestrator(
        tool_runner=ReviewToolRunner(
            git_tool=_FakeTool("git"),  # type: ignore[arg-type]
            bandit_tool=_FakeTool("bandit"),  # type: ignore[arg-type]
            ruff_tool=_FakeTool("ruff"),  # type: ignore[arg-type]
            pytest_tool=_FakeTool("pytest"),  # type: ignore[arg-type]
            coverage_tool=_FakeTool("coverage"),  # type: ignore[arg-type]
        )
    )
    result = orchestrator.run("/tmp/does-not-exist-ai-review-orchestrator")
    assert result.success is False
    assert result.errors


def test_orchestrator_continues_when_one_agent_fails(tmp_path: Path) -> None:
    project = tmp_path / "demo"
    project.mkdir()
    (project / "app").mkdir()
    (project / "app" / "main.py").write_text("print('hi')\n", encoding="utf-8")

    runner = ReviewToolRunner(
        git_tool=_FakeTool("git", {"is_git_repository": False}),  # type: ignore[arg-type]
        bandit_tool=_FakeTool("bandit", {"findings": []}),  # type: ignore[arg-type]
        ruff_tool=_FakeTool("ruff", {"issues": []}),  # type: ignore[arg-type]
        pytest_tool=_FakeTool("pytest", {"passed": True}),  # type: ignore[arg-type]
        coverage_tool=_FakeTool("coverage", {"percent_covered": 80}),  # type: ignore[arg-type]
    )

    orchestrator = ReviewOrchestrator(
        tool_runner=runner,
        security_agent_factory=lambda: _FakeAgent("security_review_agent"),
        style_agent_factory=lambda: _FakeAgent("style_review_agent", succeed=False),
        testing_agent_factory=lambda: _FakeAgent("testing_review_agent"),
        architecture_agent_factory=lambda: _FakeAgent("architecture_review_agent"),
    )

    # Avoid requiring Gemini credentials for crew registration in this unit test.
    def _fake_build_crew(context: ReviewContext, config=None):  # noqa: ANN001
        class _Crew:
            agents = [type("A", (), {"role": "Security Review Agent", "goal": "g"})()]
            tasks = [object(), object(), object(), object()]

        return _Crew()

    import agents.crews.review_crew as review_crew_mod

    original = review_crew_mod.build_review_crew
    review_crew_mod.build_review_crew = _fake_build_crew  # type: ignore[assignment]
    try:
        result = orchestrator.run(project)
    finally:
        review_crew_mod.build_review_crew = original  # type: ignore[assignment]

    assert result.security and result.security["success"] is True
    assert result.style and result.style["success"] is False
    assert result.testing and result.testing["success"] is True
    assert result.architecture and result.architecture["success"] is True
    assert result.success is True
    assert "agent_style" in result.timings


def test_review_context_to_dict(tmp_path: Path) -> None:
    context = ReviewContext(project_path=tmp_path, metadata={"project_name": tmp_path.name})
    payload = context.to_dict()
    assert payload["project_path"] == str(tmp_path.resolve()) or payload["project_path"] == str(tmp_path)
    assert payload["metadata"]["project_name"] == tmp_path.name
