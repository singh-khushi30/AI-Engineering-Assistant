"""Unit tests for Phase 1.3B review agents (mocked LLM — no live Gemini calls)."""

from __future__ import annotations

import json
from typing import Any

from agents.review.architecture_agent import ArchitectureReviewAgent
from agents.review.json_utils import extract_json_object
from agents.review.security_agent import SecurityReviewAgent
from agents.review.style_agent import StyleReviewAgent
from agents.review.testing_agent import TestingReviewAgent
from app.services.llm_service import LLMMessage, LLMResult, LLMService


class FakeLLMService(LLMService):
    """Deterministic LLM stub for unit tests."""

    def __init__(self, response_payload: dict[str, Any]) -> None:
        self.response_payload = response_payload
        self.calls: list[list[LLMMessage]] = []

    def complete(  # type: ignore[override]
        self,
        messages: list[LLMMessage] | list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResult:
        _ = temperature, max_tokens
        normalized = [
            message if isinstance(message, LLMMessage) else LLMMessage(**message)
            for message in messages
        ]
        self.calls.append(normalized)
        return LLMResult(
            success=True,
            execution_time=0.01,
            data={"content": json.dumps(self.response_payload), "model": "fake", "provider": "fake"},
        )


def _sample_report(agent: str) -> dict[str, Any]:
    return {
        "agent": agent,
        "summary": "Sample review summary",
        "findings": [
            {
                "title": "Example finding",
                "detail": "Example detail",
                "severity": "medium",
                "recommendation": "Fix it",
                "file": "app/main.py",
                "line": 10,
                "category": "example",
            }
        ],
        "recommendations": ["Do the fix"],
        "severity": "medium",
        "confidence": 0.8,
    }


def test_extract_json_from_fenced_response() -> None:
    payload = extract_json_object('Here you go:\n```json\n{"agent": "x", "summary": "ok"}\n```')
    assert payload["agent"] == "x"


def test_security_agent_requires_bandit_result() -> None:
    agent = SecurityReviewAgent(llm_service=FakeLLMService(_sample_report("security_review_agent")))
    result = agent.run({})
    assert result.success is False
    assert "bandit_result" in result.errors[0]


def test_security_agent_consumes_bandit_output() -> None:
    fake = FakeLLMService(_sample_report("security_review_agent"))
    agent = SecurityReviewAgent(llm_service=fake)
    bandit_result = {
        "success": True,
        "tool": "bandit",
        "execution_time": 0.1,
        "data": {
            "finding_count": 1,
            "findings": [
                {
                    "filename": "app/core/config.py",
                    "issue_text": "Possible hardcoded password",
                    "issue_severity": "MEDIUM",
                    "issue_confidence": "MEDIUM",
                    "line_number": 12,
                    "test_id": "B105",
                }
            ],
        },
        "errors": [],
    }
    result = agent.run({"bandit_result": bandit_result})
    assert result.success is True
    assert result.data["review"]["agent"] == "security_review_agent"
    assert result.data["review"]["findings"]
    assert fake.calls
    assert "Possible hardcoded password" in fake.calls[0][1].content


def test_style_agent_consumes_ruff_output() -> None:
    fake = FakeLLMService(_sample_report("style_review_agent"))
    agent = StyleReviewAgent(llm_service=fake)
    ruff_result = {
        "success": True,
        "tool": "ruff",
        "execution_time": 0.1,
        "data": {
            "issue_count": 1,
            "issues": [{"code": "E501", "message": "Line too long", "filename": "x.py"}],
            "issues_by_file": {"x.py": [{"code": "E501", "message": "Line too long"}]},
        },
        "errors": [],
    }
    result = agent.run({"ruff_result": ruff_result})
    assert result.success is True
    assert "E501" in fake.calls[0][1].content


def test_testing_agent_consumes_pytest_and_coverage() -> None:
    fake = FakeLLMService(_sample_report("testing_review_agent"))
    agent = TestingReviewAgent(llm_service=fake)
    result = agent.run(
        {
            "pytest_result": {
                "success": True,
                "tool": "pytest",
                "execution_time": 0.2,
                "data": {"passed": True, "summary": {"passed": 2, "failed": 0}},
                "errors": [],
            },
            "coverage_result": {
                "success": True,
                "tool": "coverage",
                "execution_time": 0.3,
                "data": {
                    "percent_covered": 72.0,
                    "files": {
                        "app/main.py": {"summary": {"percent_covered": 55.0, "missing_lines": 10}}
                    },
                },
                "errors": [],
            },
        }
    )
    assert result.success is True
    assert "percent_covered" in fake.calls[0][1].content


def test_architecture_agent_invalid_path() -> None:
    agent = ArchitectureReviewAgent(
        llm_service=FakeLLMService(_sample_report("architecture_review_agent"))
    )
    result = agent.run({"project_path": "/tmp/does-not-exist-ai-eng-assistant"})
    assert result.success is False
    assert "Invalid project path" in result.errors[0] or "does not exist" in result.errors[0]


def test_architecture_agent_uses_structure_snapshot() -> None:
    fake = FakeLLMService(_sample_report("architecture_review_agent"))
    agent = ArchitectureReviewAgent(llm_service=fake)
    result = agent.run(
        {
            "project_structure": {
                "project_path": "/demo",
                "top_level": ["app", "agents", "tools"],
                "directories": ["app", "agents"],
                "files": ["app/main.py"],
                "directory_count": 2,
                "file_count": 1,
            }
        }
    )
    assert result.success is True
    assert "app/main.py" in fake.calls[0][1].content
