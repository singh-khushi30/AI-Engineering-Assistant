"""Phase 1.3A AI Foundation unit checks (no live provider calls required)."""

from __future__ import annotations

from agents.base_agent import HelloFoundationAgent
from agents.prompts.loader import list_agent_prompts, load_prompt, render_prompt
from app.core.config import Settings
from app.core.llm_config import LLMConfig, LLMProvider, llm_config_from_settings
from app.services.llm_service import LLMMessage, LLMService


def test_settings_default_to_gemini() -> None:
    settings = Settings(_env_file=None)
    assert settings.llm_provider == "gemini"
    assert settings.model_name == "gemini-3.5-flash"


def test_settings_load_llm_fields() -> None:
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="gemini",
        MODEL_NAME="gemini-3.5-flash",
        TEMPERATURE="0.1",
        MAX_TOKENS="512",
        GEMINI_API_KEY="test-key",
    )
    assert settings.llm_provider == "gemini"
    assert settings.model_name == "gemini-3.5-flash"
    assert settings.temperature == 0.1
    assert settings.max_tokens == 512


def test_llm_config_provider_mapping() -> None:
    settings = Settings(
        _env_file=None,
        LLM_PROVIDER="gemini",
        MODEL_NAME="gemini-3.5-flash",
        GEMINI_API_KEY="test-key",
    )
    config = llm_config_from_settings(settings)
    assert config.provider is LLMProvider.GEMINI
    assert config.resolved_model == "gemini-3.5-flash"
    assert config.litellm_model == "gemini/gemini-3.5-flash"
    assert config.missing_credentials_message() is None


def test_llm_config_missing_key() -> None:
    config = LLMConfig(provider=LLMProvider.GEMINI, gemini_api_key=None)
    message = config.missing_credentials_message()
    assert message is not None
    assert "GEMINI_API_KEY" in message


def test_prompt_files_exist_for_hello_agent() -> None:
    prompts = list_agent_prompts("hello_agent")
    assert "system" in prompts
    assert "task" in prompts
    assert "backstory" in prompts
    assert "Hello Agent" in load_prompt("hello_agent", "system")
    rendered = render_prompt("hello_agent", "task", input="Say hello")
    assert "Say hello" in rendered


def test_llm_service_returns_structured_missing_key_error() -> None:
    service = LLMService(config=LLMConfig(provider=LLMProvider.GEMINI, gemini_api_key=None))
    result = service.complete([LLMMessage(role="user", content="Say hello")])
    assert result.success is False
    assert result.errors
    assert "GEMINI_API_KEY" in result.errors[0]
    assert result.data["error"]["error_code"] == "missing_api_key"


def test_hello_foundation_agent_builds_messages_from_prompts() -> None:
    agent = HelloFoundationAgent(
        llm_service=LLMService(
            config=LLMConfig(provider=LLMProvider.GEMINI, gemini_api_key=None)
        )
    )
    messages = agent.build_messages({"input": "Say hello"})
    assert messages[0].role == "system"
    assert messages[1].role == "user"
    assert "Say hello" in messages[1].content

    result = agent.run({"input": "Say hello"})
    assert result.success is False
    assert result.agent == "hello_foundation_agent"
    assert result.errors
