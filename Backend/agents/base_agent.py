"""Reusable base AI agent used by all future review agents.

This layer owns prompt assembly + LLMService calls. CrewAI orchestration
(crews/tasks) lives separately under ``agents/crews`` and can reuse the same
LLM configuration via ``build_crewai_llm``.
"""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field

from agents.prompts.loader import render_prompt
from app.services.llm_service import LLMMessage, LLMService

logger = logging.getLogger(__name__)


class AgentResult(BaseModel):
    """Structured agent response — aligned with ToolResult / LLMResult."""

    success: bool
    agent: str
    execution_time: float
    data: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


class BaseAIAgent(ABC):
    """Abstract AI agent that calls the shared LLM service."""

    name: str = "base_ai_agent"
    prompt_namespace: str = "base"

    def __init__(self, llm_service: LLMService | None = None) -> None:
        self.llm_service = llm_service or LLMService()

    @abstractmethod
    def build_messages(self, context: dict[str, Any]) -> list[LLMMessage]:
        """Turn caller context into chat messages."""

    def run(self, context: dict[str, Any] | None = None) -> AgentResult:
        """Execute the agent with logging and structured error handling."""
        started = time.perf_counter()
        context = context or {}

        logger.info("Agent started name=%s", self.name)
        try:
            messages = self.build_messages(context)
            logger.info(
                "Prompt sent agent=%s messages=%s",
                self.name,
                [{"role": m.role, "chars": len(m.content)} for m in messages],
            )

            llm_result = self.llm_service.complete(messages)
            elapsed = time.perf_counter() - started

            if not llm_result.success:
                logger.error(
                    "Agent failed name=%s errors=%s execution_time=%.3fs",
                    self.name,
                    llm_result.errors,
                    elapsed,
                )
                return AgentResult(
                    success=False,
                    agent=self.name,
                    execution_time=round(elapsed, 3),
                    data={"llm": llm_result.to_dict()},
                    errors=llm_result.errors,
                )

            content = str(llm_result.data.get("content", ""))
            logger.info(
                "Response received agent=%s execution_time=%.3fs chars=%s",
                self.name,
                elapsed,
                len(content),
            )
            return AgentResult(
                success=True,
                agent=self.name,
                execution_time=round(elapsed, 3),
                data={
                    "content": content,
                    "context": context,
                    "llm": {
                        "model": llm_result.data.get("model"),
                        "provider": llm_result.data.get("provider"),
                        "usage": llm_result.data.get("usage"),
                    },
                },
            )
        except Exception as exc:  # noqa: BLE001 - agent boundary
            elapsed = time.perf_counter() - started
            logger.exception("Agent error name=%s", self.name)
            return AgentResult(
                success=False,
                agent=self.name,
                execution_time=round(elapsed, 3),
                errors=[f"Agent error: {exc}"],
            )

    def render(self, prompt_name: str, **variables: str) -> str:
        """Load a prompt from this agent's prompt namespace."""
        return render_prompt(self.prompt_namespace, prompt_name, **variables)


class HelloFoundationAgent(BaseAIAgent):
    """Minimal LLMService-based agent for foundation verification (not a review agent)."""

    name = "hello_foundation_agent"
    prompt_namespace = "hello_agent"

    def build_messages(self, context: dict[str, Any]) -> list[LLMMessage]:
        user_input = str(context.get("input", "Say hello"))
        return [
            LLMMessage(role="system", content=self.render("system")),
            LLMMessage(
                role="user",
                content=self.render("task", input=user_input),
            ),
        ]
