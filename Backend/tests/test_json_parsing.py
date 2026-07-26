"""Tests for robust review-agent JSON extraction and recovery."""

from __future__ import annotations

import pytest

from agents.review.json_utils import extract_json_object
from agents.review.base_review_agent import BaseReviewAgent
from agents.review.schemas import ReviewReport
from app.services.exceptions import InvalidLLMResponseError
from app.services.llm_service import LLMResult, LLMService


def test_extract_plain_json() -> None:
    payload = extract_json_object('{"agent": "x", "summary": "ok"}')
    assert payload["agent"] == "x"


def test_extract_fenced_json_with_prose() -> None:
    text = (
        "Sure — here is the review:\n"
        "```json\n"
        '{\n  "agent": "security_review_agent",\n  "summary": "ok",\n'
        '  "findings": [{"title": "A", "detail": "B", "severity": "high"}]\n}\n'
        "```\n"
        "Hope that helps!"
    )
    payload = extract_json_object(text)
    assert payload["agent"] == "security_review_agent"
    assert payload["findings"][0]["title"] == "A"


def test_extract_recovers_trailing_comma_and_smart_quotes() -> None:
    text = "{\n  “agent”: “x”,\n  “summary”: “ok”,\n}"
    payload = extract_json_object(text)
    assert payload["summary"] == "ok"


def test_extract_recovers_truncated_string() -> None:
    # Mimics Gemini cutting off mid-detail (Unterminated string).
    truncated = (
        '{\n'
        '  "agent": "security_review_agent",\n'
        '  "summary": "Found issues",\n'
        '  "findings": [\n'
        '    {\n'
        '      "title": "Hardcoded password",\n'
        '      "detail": "Password appears in config without env var wrap'
    )
    payload = extract_json_object(truncated)
    assert payload["agent"] == "security_review_agent"
    assert isinstance(payload.get("findings"), list)


def test_extract_recovers_truncated_after_complete_finding() -> None:
    truncated = (
        '{\n'
        '  "agent": "security_review_agent",\n'
        '  "summary": "Partial",\n'
        '  "findings": [\n'
        '    {"title": "One", "detail": "Done", "severity": "high"},\n'
        '    {"title": "Two", "detail": "Cut off mid'
    )
    payload = extract_json_object(truncated)
    assert payload["findings"][0]["title"] == "One"


class _StubLLM(LLMService):
    def __init__(self, content: str) -> None:
        self.content = content

    def complete(self, messages, *, temperature=None, max_tokens=None):  # noqa: ANN001
        _ = messages, temperature, max_tokens
        return LLMResult(
            success=True,
            execution_time=0.01,
            data={"content": self.content, "model": "fake", "provider": "fake"},
        )


class _TinyAgent(BaseReviewAgent):
    name = "tiny_review_agent"
    prompt_namespace = "security_agent"

    def build_tool_payload(self, context):  # noqa: ANN001
        return {"ok": True}


def test_review_agent_fallback_on_unrecoverable_json() -> None:
    agent = _TinyAgent(llm_service=_StubLLM("not json at all {{{"))
    result = agent.run({})
    assert result.success is True
    assert result.data["parse"]["fallback"] is True
    report = ReviewReport.model_validate(result.data["review"])
    assert report.agent == "tiny_review_agent"
    assert report.findings == []


def test_review_agent_parses_recovered_json() -> None:
    content = (
        'Here you go\n```json\n{"agent":"tiny_review_agent","summary":"ok",'
        '"findings":[],"recommendations":[],"severity":"NONE","confidence":0.9}\n```'
    )
    agent = _TinyAgent(llm_service=_StubLLM(content))
    result = agent.run({})
    assert result.success is True
    assert result.data["parse"]["parse_ok"] is True
    assert result.data["review"]["severity"] == "none"


def test_invalid_empty_still_raises_from_extractor() -> None:
    with pytest.raises(InvalidLLMResponseError):
        extract_json_object("   ")
