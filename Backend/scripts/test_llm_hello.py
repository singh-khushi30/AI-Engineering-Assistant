#!/usr/bin/env python3
"""Quick LLM provider connectivity check.

Usage:
  python scripts/test_llm_hello.py              # uses LLM_PROVIDER from .env
  python scripts/test_llm_hello.py groq
  python scripts/test_llm_hello.py ollama
  python scripts/test_llm_hello.py openrouter
  python scripts/test_llm_hello.py gemini
"""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import get_settings  # noqa: E402
from app.core.llm_config import LLMProvider, get_llm_config, llm_config_from_settings  # noqa: E402
from app.core.logging import configure_logging  # noqa: E402
from app.services.llm_service import LLMMessage, LLMService  # noqa: E402


def main() -> int:
    get_settings.cache_clear()
    get_llm_config.cache_clear()

    settings = get_settings()
    configure_logging(level=settings.log_level, log_format="text")

    config = llm_config_from_settings(settings)

    if len(sys.argv) > 1:
        provider_name = sys.argv[1].strip().lower()
        try:
            provider = LLMProvider(provider_name)
        except ValueError:
            supported = ", ".join(p.value for p in LLMProvider)
            print(f"ERROR: unknown provider '{provider_name}'. Supported: {supported}")
            return 1
        # Force a single-provider check (no fallback noise).
        config = config.model_copy(
            update={
                "provider": provider,
                "primary_provider": provider,
                "fallback_providers": [],
                "fallback_enabled": False,
            }
        )

    print(f"provider={config.provider.value}")
    print(f"model={config.resolved_model_for(config.provider)}")

    missing = config.missing_credentials_message_for(config.provider)
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
    print(f"provider_used={result.data.get('provider')}")
    print(f"execution_time={result.execution_time}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
