"""Prompt loading utilities.

Prompts live in per-agent folders as plain text files so copy can change
without editing Python classes.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from string import Template

logger = logging.getLogger(__name__)

PROMPTS_ROOT = Path(__file__).resolve().parent


class PromptNotFoundError(FileNotFoundError):
    """Raised when a requested prompt file does not exist."""


def agent_prompt_dir(agent_name: str) -> Path:
    return PROMPTS_ROOT / agent_name


@lru_cache(maxsize=128)
def load_prompt(agent_name: str, prompt_name: str) -> str:
    """Load ``agents/prompts/<agent_name>/<prompt_name>.txt``."""
    path = agent_prompt_dir(agent_name) / f"{prompt_name}.txt"
    if not path.exists():
        raise PromptNotFoundError(
            f"Prompt not found for agent '{agent_name}': {path}"
        )
    text = path.read_text(encoding="utf-8").strip()
    logger.debug("Loaded prompt agent=%s name=%s chars=%s", agent_name, prompt_name, len(text))
    return text


def render_prompt(agent_name: str, prompt_name: str, **variables: str) -> str:
    """Load a prompt and substitute ``$variable`` placeholders safely."""
    template = Template(load_prompt(agent_name, prompt_name))
    return template.safe_substitute(**variables)


def list_agent_prompts(agent_name: str) -> list[str]:
    directory = agent_prompt_dir(agent_name)
    if not directory.exists():
        return []
    return sorted(path.stem for path in directory.glob("*.txt"))
