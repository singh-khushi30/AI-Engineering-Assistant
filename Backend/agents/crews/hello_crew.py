"""CrewAI Hello demo — verifies CrewAI wiring only (Phase 1.3A).

This is intentionally NOT a review agent. Phase 1.3B will add Security,
Testing, Style, and Architecture agents.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from pydantic import BaseModel, Field

from agents.prompts.loader import load_prompt
from app.core.crewai_setup import bootstrap_crewai
from app.core.llm_config import LLMConfig, build_crewai_llm, get_llm_config

logger = logging.getLogger(__name__)


class CrewRunResult(BaseModel):
    success: bool
    agent: str = "hello_agent"
    execution_time: float
    data: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


def build_hello_agent(config: LLMConfig | None = None) -> Any:
    """Create the CrewAI Hello Agent."""
    from crewai import Agent

    cfg = config or get_llm_config()
    llm = build_crewai_llm(cfg)

    return Agent(
        role="Hello Agent",
        goal="Respond with a short hello to verify CrewAI is working",
        backstory=load_prompt("hello_agent", "backstory"),
        llm=llm,
        verbose=True,
        allow_delegation=False,
    )


def build_hello_task(agent: Any, user_input: str = "Say hello") -> Any:
    """Create the single demo task for the Hello Agent."""
    from crewai import Task

    description = load_prompt("hello_agent", "task").replace("$input", user_input)
    return Task(
        description=description,
        expected_output="Hello from CrewAI",
        agent=agent,
    )


def build_hello_crew(user_input: str = "Say hello", config: LLMConfig | None = None) -> Any:
    """Assemble Agent + Task + Crew for the Phase 1.3A demo."""
    from crewai import Crew, Process

    bootstrap_crewai()
    agent = build_hello_agent(config=config)
    task = build_hello_task(agent, user_input=user_input)
    crew = Crew(
        agents=[agent],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
    )
    logger.info("Hello Crew initialized agents=1 tasks=1")
    return crew


def run_hello_crew(user_input: str = "Say hello", config: LLMConfig | None = None) -> CrewRunResult:
    """Execute the Hello Crew and return a structured result."""
    started = time.perf_counter()
    logger.info("Agent started name=hello_agent input=%s", user_input)

    try:
        cfg = config or get_llm_config()
        missing = cfg.missing_credentials_message()
        if missing:
            elapsed = time.perf_counter() - started
            logger.error("Hello Crew aborted: %s", missing)
            return CrewRunResult(
                success=False,
                execution_time=round(elapsed, 3),
                errors=[missing],
            )

        crew = build_hello_crew(user_input=user_input, config=cfg)
        logger.info("Prompt sent agent=hello_agent")
        output = crew.kickoff()
        elapsed = time.perf_counter() - started
        text = str(output).strip()

        logger.info(
            "Response received agent=hello_agent execution_time=%.3fs chars=%s",
            elapsed,
            len(text),
        )
        return CrewRunResult(
            success=True,
            execution_time=round(elapsed, 3),
            data={"content": text, "raw": repr(output)},
        )
    except Exception as exc:  # noqa: BLE001 - crew boundary
        elapsed = time.perf_counter() - started
        logger.exception("Hello Crew failed")
        return CrewRunResult(
            success=False,
            execution_time=round(elapsed, 3),
            errors=[f"CrewAI hello agent failed: {exc}"],
        )
