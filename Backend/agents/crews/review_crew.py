"""CrewAI Code Review Crew — registers the four specialized review agents.

Architectural note:
  Review *logic* lives in ``agents.review.*`` (Phase 1.3B). This module only
  registers CrewAI Agent/Task/Crew wrappers that call those agents through
  tools bound to a shared ``ReviewContext``. The ``ReviewOrchestrator`` remains
  the fault-tolerant execution engine for Phase 1.3C.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from agents.orchestration.context import ReviewContext
from agents.prompts.loader import load_prompt
from agents.review.architecture_agent import ArchitectureReviewAgent
from agents.review.security_agent import SecurityReviewAgent
from agents.review.style_agent import StyleReviewAgent
from agents.review.testing_agent import TestingReviewAgent
from app.core.crewai_setup import bootstrap_crewai
from app.core.llm_config import LLMConfig, build_crewai_llm, get_llm_config

logger = logging.getLogger(__name__)


def _build_context_tools(context: ReviewContext) -> list[Any]:
    """Create CrewAI tools that invoke existing review agents against shared context."""
    from crewai.tools import tool

    @tool("security_review")
    def security_review() -> str:
        """Run the Security Review Agent on shared Bandit results."""
        result = SecurityReviewAgent().run({"bandit_result": context.bandit_result})
        return json.dumps(result.to_dict(), default=str)

    @tool("style_review")
    def style_review() -> str:
        """Run the Style Review Agent on shared Ruff results."""
        result = StyleReviewAgent().run({"ruff_result": context.ruff_result})
        return json.dumps(result.to_dict(), default=str)

    @tool("testing_review")
    def testing_review() -> str:
        """Run the Testing Review Agent on shared pytest/coverage results."""
        result = TestingReviewAgent().run(
            {
                "pytest_result": context.pytest_result,
                "coverage_result": context.coverage_result,
            }
        )
        return json.dumps(result.to_dict(), default=str)

    @tool("architecture_review")
    def architecture_review() -> str:
        """Run the Architecture Review Agent on shared project structure."""
        result = ArchitectureReviewAgent().run(
            {
                "project_structure": context.project_structure,
                "git_result": context.git_result,
                "project_path": str(context.project_path),
            }
        )
        return json.dumps(result.to_dict(), default=str)

    return [security_review, style_review, testing_review, architecture_review]


def build_review_agents(
    context: ReviewContext,
    *,
    config: LLMConfig | None = None,
) -> dict[str, Any]:
    """Create the four CrewAI agents with roles, goals, backstories, and tools."""
    from crewai import Agent

    cfg = config or get_llm_config()
    llm = build_crewai_llm(cfg)
    tools = _build_context_tools(context)
    security_tool, style_tool, testing_tool, architecture_tool = tools

    agents = {
        "security": Agent(
            role="Security Review Agent",
            goal="Produce a structured security review from Bandit findings",
            backstory=load_prompt("security_agent", "backstory"),
            llm=llm,
            tools=[security_tool],
            allow_delegation=False,
            verbose=True,
        ),
        "style": Agent(
            role="Style Review Agent",
            goal="Produce a structured style review from Ruff findings",
            backstory=load_prompt("style_agent", "backstory"),
            llm=llm,
            tools=[style_tool],
            allow_delegation=False,
            verbose=True,
        ),
        "testing": Agent(
            role="Testing Review Agent",
            goal="Produce a structured testing review from pytest and coverage results",
            backstory=load_prompt("testing_agent", "backstory"),
            llm=llm,
            tools=[testing_tool],
            allow_delegation=False,
            verbose=True,
        ),
        "architecture": Agent(
            role="Architecture Review Agent",
            goal="Produce a structured architecture review from project structure facts",
            backstory=load_prompt("architecture_agent", "backstory"),
            llm=llm,
            tools=[architecture_tool],
            allow_delegation=False,
            verbose=True,
        ),
    }
    return agents


def build_review_tasks(agents: dict[str, Any]) -> list[Any]:
    """Create one independent CrewAI task per review agent."""
    from crewai import Task

    specs = [
        ("security", "security_agent", "Structured security review JSON"),
        ("style", "style_agent", "Structured style review JSON"),
        ("testing", "testing_agent", "Structured testing review JSON"),
        ("architecture", "architecture_agent", "Structured architecture review JSON"),
    ]
    tasks = []
    for key, prompt_ns, expected in specs:
        tasks.append(
            Task(
                description=load_prompt(prompt_ns, "crew_task"),
                expected_output=expected,
                agent=agents[key],
            )
        )
    return tasks


def build_review_crew(
    context: ReviewContext,
    *,
    config: LLMConfig | None = None,
) -> Any:
    """Assemble the production Code Review Crew for the given shared context."""
    from crewai import Crew, Process

    bootstrap_crewai()
    agents = build_review_agents(context, config=config)
    tasks = build_review_tasks(agents)
    crew = Crew(
        agents=list(agents.values()),
        tasks=tasks,
        process=Process.sequential,
        verbose=True,
    )
    logger.info(
        "Review Crew initialized agents=%s tasks=%s project=%s",
        len(crew.agents),
        len(crew.tasks),
        context.project_path,
    )
    return crew


def crew_registry_info(crew: Any) -> dict[str, Any]:
    """Metadata describing the registered CrewAI crew (no execution)."""
    agent_roles = []
    for agent in getattr(crew, "agents", []) or []:
        agent_roles.append(
            {
                "role": getattr(agent, "role", None),
                "goal": getattr(agent, "goal", None),
            }
        )
    return {
        "registered": True,
        "agent_count": len(getattr(crew, "agents", []) or []),
        "task_count": len(getattr(crew, "tasks", []) or []),
        "process": "sequential",
        "agents": agent_roles,
    }
