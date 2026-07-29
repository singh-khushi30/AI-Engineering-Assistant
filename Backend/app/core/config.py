"""Application settings loaded from environment variables via Pydantic Settings."""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the AI Engineering Assistant API."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = Field(default="AI Engineering Assistant", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=False, alias="APP_DEBUG")
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")

    # Server
    host: str = Field(default="0.0.0.0", alias="HOST")
    port: int = Field(default=8000, alias="PORT")
    reload: bool = Field(default=False, alias="RELOAD")

    # CORS — kept as a string so .env comma-separated values parse reliably
    cors_origins: str = Field(
        default="http://localhost:3000",
        alias="CORS_ORIGINS",
    )

    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    log_format: str = Field(default="json", alias="LOG_FORMAT")

    # LLM provider selection
    # Supported: gemini | groq | ollama | openrouter | openai | anthropic | azure_openai
    llm_provider: str = Field(default="gemini", alias="LLM_PROVIDER")
    primary_provider: str | None = Field(default=None, alias="PRIMARY_PROVIDER")
    fallback_providers: str = Field(default="", alias="FALLBACK_PROVIDERS")
    llm_fallback_enabled: bool = Field(default=True, alias="LLM_FALLBACK_ENABLED")
    llm_fallback_on_missing_key: bool = Field(
        default=True,
        alias="LLM_FALLBACK_ON_MISSING_KEY",
    )
    model_name: str = Field(default="gemini-3.5-flash", alias="MODEL_NAME")
    temperature: float = Field(default=0.2, alias="TEMPERATURE")
    max_tokens: int = Field(default=1024, alias="MAX_TOKENS")
    llm_timeout: float = Field(default=60.0, alias="LLM_TIMEOUT")
    llm_max_retries: int = Field(default=3, alias="LLM_MAX_RETRIES")
    llm_retry_backoff_seconds: float = Field(default=1.0, alias="LLM_RETRY_BACKOFF_SECONDS")

    # Optional per-provider model overrides
    gemini_model: str | None = Field(default=None, alias="GEMINI_MODEL")
    groq_model: str | None = Field(default="llama-3.1-8b-instant", alias="GROQ_MODEL")
    ollama_model: str | None = Field(default="llama3.2", alias="OLLAMA_MODEL")
    openrouter_model: str | None = Field(
        default="openai/gpt-oss-20b:free",
        alias="OPENROUTER_MODEL",
    )
    openai_model: str | None = Field(default=None, alias="OPENAI_MODEL")
    anthropic_model: str | None = Field(default=None, alias="ANTHROPIC_MODEL")
    azure_model: str | None = Field(default=None, alias="AZURE_MODEL")

    # Provider secrets / endpoints — never hardcode these
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    groq_api_key: str | None = Field(default=None, alias="GROQ_API_KEY")
    openrouter_api_key: str | None = Field(default=None, alias="OPENROUTER_API_KEY")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    azure_openai_api_key: str | None = Field(default=None, alias="AZURE_OPENAI_API_KEY")
    azure_openai_endpoint: str | None = Field(default=None, alias="AZURE_OPENAI_ENDPOINT")
    azure_openai_api_version: str = Field(
        default="2024-08-01-preview",
        alias="AZURE_OPENAI_API_VERSION",
    )
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    openrouter_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        alias="OPENROUTER_BASE_URL",
    )

    # Optional tooling / search integrations
    serper_api_key: str | None = Field(default=None, alias="SERPER_API_KEY")

    # Review intelligence / scoring (configurable — no magic numbers in engines)
    score_max: float = Field(default=10.0, alias="SCORE_MAX")
    score_base: float = Field(default=10.0, alias="SCORE_BASE")
    score_weight_security: float = Field(default=0.30, alias="SCORE_WEIGHT_SECURITY")
    score_weight_testing: float = Field(default=0.25, alias="SCORE_WEIGHT_TESTING")
    score_weight_style: float = Field(default=0.20, alias="SCORE_WEIGHT_STYLE")
    score_weight_architecture: float = Field(default=0.25, alias="SCORE_WEIGHT_ARCHITECTURE")
    score_penalty_critical: float = Field(default=2.0, alias="SCORE_PENALTY_CRITICAL")
    score_penalty_high: float = Field(default=1.0, alias="SCORE_PENALTY_HIGH")
    score_penalty_medium: float = Field(default=0.4, alias="SCORE_PENALTY_MEDIUM")
    score_penalty_low: float = Field(default=0.15, alias="SCORE_PENALTY_LOW")
    score_penalty_info: float = Field(default=0.05, alias="SCORE_PENALTY_INFO")
    reports_dir: str = Field(default="reports/output", alias="REPORTS_DIR")
    reviews_data_dir: str = Field(default="data/reviews", alias="REVIEWS_DATA_DIR")

    # Tool-output summarization (compact LLM context)
    summary_top_n_findings: int = Field(default=15, alias="SUMMARY_TOP_N_FINDINGS")
    summary_top_n_rules: int = Field(default=20, alias="SUMMARY_TOP_N_RULES")
    summary_top_n_files: int = Field(default=20, alias="SUMMARY_TOP_N_FILES")
    summary_top_n_low_coverage: int = Field(default=15, alias="SUMMARY_TOP_N_LOW_COVERAGE")
    summary_top_n_changed_files: int = Field(default=40, alias="SUMMARY_TOP_N_CHANGED_FILES")
    summary_code_snippet_max_chars: int = Field(default=180, alias="SUMMARY_CODE_SNIPPET_MAX_CHARS")
    summary_stack_trace_max_chars: int = Field(default=600, alias="SUMMARY_STACK_TRACE_MAX_CHARS")
    summary_low_coverage_threshold: float = Field(default=80.0, alias="SUMMARY_LOW_COVERAGE_THRESHOLD")
    summary_structure_top_level_max: int = Field(default=40, alias="SUMMARY_STRUCTURE_TOP_LEVEL_MAX")
    summary_structure_dirs_max: int = Field(default=40, alias="SUMMARY_STRUCTURE_DIRS_MAX")
    summary_structure_files_max: int = Field(default=60, alias="SUMMARY_STRUCTURE_FILES_MAX")
    summary_compact_json: bool = Field(default=True, alias="SUMMARY_COMPACT_JSON")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def normalize_cors_origins(cls, value: str | list[str]) -> str:
        if isinstance(value, list):
            return ",".join(value)
        return value

    @field_validator("llm_provider", mode="before")
    @classmethod
    def normalize_llm_provider(cls, value: str | None) -> str:
        return str(value or "gemini").strip().lower() or "gemini"

    @field_validator("primary_provider", mode="before")
    @classmethod
    def normalize_primary_provider(cls, value: str | None) -> str | None:
        if value is None or str(value).strip() == "":
            return None
        return str(value).strip().lower()

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
