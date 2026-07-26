#!/usr/bin/env python3
"""Simple Gemini connectivity check.

Sends ``Say hello`` through LLMService (Google Gen AI SDK) and prints the reply.

Usage:
  python scripts/test_gemini_hello.py
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.llm_config import get_llm_config  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from app.services.llm_service import LLMMessage, LLMService  # noqa: E402


def main() -> int:
    get_settings.cache_clear()
    get_llm_config.cache_clear()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")

    config = get_llm_config()
    print(f"provider={config.provider.value}")
    print(f"model={config.resolved_model}")

    missing = config.missing_credentials_message()
    if missing:
        print(f"ERROR: {missing}")
        return 1

    result = LLMService(config=config).complete(
        [
            LLMMessage(
                role="system",
                content="You are a concise assistant. Reply in one short sentence.",
            ),
            LLMMessage(role="user", content="Say hello"),
        ]
    )

    if not result.success:
        print("ERROR:", "; ".join(result.errors))
        return 1

    print("response:", result.data.get("content"))
    print(f"execution_time={result.execution_time}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
