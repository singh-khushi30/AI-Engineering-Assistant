#!/usr/bin/env python3
"""Verify Phase 1.3A AI Foundation from the terminal.

Checks:
  1. Environment / settings load
  2. Prompt management works
  3. LLM service responds (live call if API key is set)
  4. CrewAI Hello Agent initializes and runs (live if API key is set)

Examples:
  python scripts/run_ai_foundation.py
  python scripts/run_ai_foundation.py --skip-live
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from agents.base_agent import HelloFoundationAgent  # noqa: E402
from agents.crews.hello_crew import build_hello_crew, run_hello_crew  # noqa: E402
from agents.prompts.loader import list_agent_prompts, load_prompt  # noqa: E402
from app.core.config import get_settings  # noqa: E402
from app.core.llm_config import get_llm_config  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from app.services.llm_service import LLMMessage, LLMService  # noqa: E402

logger = logging.getLogger("ai_foundation")


def _print_section(title: str) -> None:
    print(f"\n=== {title} ===")


def check_environment() -> dict[str, Any]:
    get_settings.cache_clear()
    get_llm_config.cache_clear()
    settings = get_settings()
    llm = get_llm_config()
    payload = {
        "app_name": settings.app_name,
        "app_env": settings.app_env,
        "llm_provider": llm.provider.value,
        "model_name": llm.model_name,
        "resolved_model": llm.resolved_model,
        "temperature": llm.temperature,
        "max_tokens": llm.max_tokens,
        "api_key_configured": bool(llm.resolve_api_key()),
        "credentials_error": llm.missing_credentials_message(),
    }
    return payload


def check_prompts() -> dict[str, Any]:
    prompts = list_agent_prompts("hello_agent")
    loaded = {name: load_prompt("hello_agent", name)[:80] for name in prompts}
    return {"prompt_files": prompts, "samples": loaded}


def check_llm_service(*, skip_live: bool) -> dict[str, Any]:
    service = LLMService()
    if skip_live:
        missing = service.config.missing_credentials_message()
        return {
            "mode": "skipped_live",
            "success": missing is None,
            "detail": missing or "API key present; live call skipped by flag",
        }

    result = service.complete(
        [
            LLMMessage(role="system", content="Reply with a short greeting."),
            LLMMessage(role="user", content="Say hello"),
        ]
    )
    return result.to_dict()


def check_base_agent(*, skip_live: bool) -> dict[str, Any]:
    if skip_live:
        return {"mode": "skipped_live", "success": True}
    result = HelloFoundationAgent().run({"input": "Say hello"})
    return result.to_dict()


def check_crewai(*, skip_live: bool) -> dict[str, Any]:
    cfg = get_llm_config()
    if cfg.missing_credentials_message():
        # Still verify imports + that credential guard works.
        result = run_hello_crew("Say hello", config=cfg)
        return {
            "initialized": True,
            "live_run": result.to_dict(),
        }

    if skip_live:
        crew = build_hello_crew("Say hello", config=cfg)
        return {
            "initialized": True,
            "crew_type": type(crew).__name__,
            "agents": len(crew.agents),
            "tasks": len(crew.tasks),
            "mode": "skipped_live",
        }

    result = run_hello_crew("Say hello", config=cfg)
    return {"initialized": True, "live_run": result.to_dict()}


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify AI Foundation (Phase 1.3A)")
    parser.add_argument(
        "--skip-live",
        action="store_true",
        help="Do not call the remote LLM / CrewAI kickoff",
    )
    parser.add_argument("-v", "--verbose", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    settings = get_settings()
    configure_logging(
        level="DEBUG" if args.verbose else settings.log_level,
        log_format="text",
    )

    report: dict[str, Any] = {}
    exit_code = 0

    _print_section("1) Environment")
    env = check_environment()
    report["environment"] = env
    print(json.dumps(env, indent=2))
    if env["credentials_error"]:
        print(
            "\nNote: No API key configured yet. "
            "Set GEMINI_API_KEY in Backend/.env for live Gemini calls."
        )

    _print_section("2) Prompts")
    prompts = check_prompts()
    report["prompts"] = prompts
    print(json.dumps(prompts, indent=2))
    if not prompts["prompt_files"]:
        exit_code = 1

    _print_section("3) LLM Service")
    llm = check_llm_service(skip_live=args.skip_live)
    report["llm_service"] = llm
    print(json.dumps(llm, indent=2, default=str))
    if not args.skip_live and not llm.get("success", False) and env["api_key_configured"]:
        exit_code = 1

    _print_section("4) Base AI Agent")
    agent = check_base_agent(skip_live=args.skip_live or not env["api_key_configured"])
    report["base_agent"] = agent
    print(json.dumps(agent, indent=2, default=str))

    _print_section("5) CrewAI Hello Agent")
    crew = check_crewai(skip_live=args.skip_live)
    report["crewai"] = crew
    print(json.dumps(crew, indent=2, default=str))
    live = crew.get("live_run") or {}
    if live and not live.get("success", True) and env["api_key_configured"]:
        exit_code = 1

    _print_section("Summary")
    summary = {
        "environment_ok": True,
        "prompts_ok": bool(prompts["prompt_files"]),
        "api_key_configured": env["api_key_configured"],
        "crewai_initialized": bool(crew.get("initialized")),
        "exit_code": exit_code,
    }
    print(json.dumps(summary, indent=2))
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
