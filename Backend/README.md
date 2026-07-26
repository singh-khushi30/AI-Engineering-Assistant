# AI Engineering Assistant — Backend

Production FastAPI backend for multi-agent code review (Security, Style, Testing, Architecture)
with a provider-agnostic LLM layer.

## Quick start

```bash
cd Backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set GEMINI_API_KEY (and optional GROQ_API_KEY / OPENROUTER_API_KEY)
uvicorn app.main:app --reload
```

## LLM providers

Architecture:

```
LLMService
    │
ProviderFactory
    │
 ┌────┼──────────────┬─────────────┐
 │    │              │             │
Gemini Groq       Ollama      OpenRouter
(+ OpenAI / Anthropic / Azure OpenAI)
```

| Provider | Env value | Free tier notes | Required config |
|----------|-----------|-----------------|-----------------|
| **Gemini** (default) | `gemini` | Google AI Studio | `GEMINI_API_KEY` |
| **Groq** | `groq` | Fast free inference | `GROQ_API_KEY` |
| **Ollama** | `ollama` | Fully local | `OLLAMA_BASE_URL` (no API key) |
| **OpenRouter** | `openrouter` | Prefer `:free` models | `OPENROUTER_API_KEY` |
| OpenAI | `openai` | Paid | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | Paid | `ANTHROPIC_API_KEY` |
| Azure OpenAI | `azure_openai` | Paid | `AZURE_OPENAI_*` |

### Selection

```env
LLM_PROVIDER=gemini
PRIMARY_PROVIDER=gemini
FALLBACK_PROVIDERS=groq,ollama
LLM_FALLBACK_ENABLED=true
LLM_FALLBACK_ON_MISSING_KEY=true
LLM_MAX_RETRIES=3
LLM_RETRY_BACKOFF_SECONDS=1.0
```

- `LLM_PROVIDER` / `PRIMARY_PROVIDER` — active primary (`PRIMARY_PROVIDER` wins when set).
- `FALLBACK_PROVIDERS` — comma-separated chain tried on quota, timeout, rate limit, unavailability, or missing key.
- Per-provider models: `GEMINI_MODEL`, `GROQ_MODEL`, `OLLAMA_MODEL`, `OPENROUTER_MODEL`, …

### Example: Gemini primary with free fallbacks

```env
LLM_PROVIDER=gemini
MODEL_NAME=gemini-3.5-flash
FALLBACK_PROVIDERS=groq,ollama,openrouter
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant
OLLAMA_MODEL=llama3.2
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openai/gpt-oss-20b:free
```

### Smoke test

```bash
python scripts/test_gemini_hello.py
```

## Extending with a new provider

1. Add enum value in `app/core/llm_config.py` (`LLMProvider`).
2. Implement `BaseLLMProvider` (or subclass `LiteLLMProvider`).
3. Register in `ProviderFactory._registry` (or call `ProviderFactory.register(...)`).
4. Add settings / `.env.example` keys.
5. Add a unit test in `tests/test_llm_providers.py`.

Agents and orchestration stay unchanged — they only call `LLMService.complete(...)`.

## Tool summarization

Raw Bandit/Ruff/Pytest/Coverage/Git JSON is preprocessed by `tools/summarizers` into compact
Top-N summaries before review-agent prompts (typically ~5–10% of original size).

## Tests

```bash
pytest -q
```

## Review pipeline

```bash
python scripts/run_review.py .
```

Reports land in `reports/output/`.
