"""Configurable limits for tool-output summarization (token-efficient prompts)."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings


class SummarizerConfig(BaseModel):
    """Tunable Top-N and truncation knobs for compact LLM context."""

    top_n_findings: int = Field(default=15, ge=1, le=100)
    top_n_rules: int = Field(default=20, ge=1, le=100)
    top_n_files: int = Field(default=20, ge=1, le=200)
    top_n_low_coverage: int = Field(default=15, ge=1, le=100)
    top_n_changed_files: int = Field(default=40, ge=1, le=200)
    code_snippet_max_chars: int = Field(default=180, ge=40, le=2000)
    stack_trace_max_chars: int = Field(default=600, ge=100, le=5000)
    low_coverage_threshold: float = Field(default=80.0, ge=0, le=100)
    structure_top_level_max: int = Field(default=40, ge=5, le=200)
    structure_dirs_max: int = Field(default=40, ge=5, le=300)
    structure_files_max: int = Field(default=60, ge=5, le=500)
    compact_json: bool = True

    @classmethod
    def from_settings(cls, settings: Settings | None = None) -> SummarizerConfig:
        cfg = settings or get_settings()
        return cls(
            top_n_findings=cfg.summary_top_n_findings,
            top_n_rules=cfg.summary_top_n_rules,
            top_n_files=cfg.summary_top_n_files,
            top_n_low_coverage=cfg.summary_top_n_low_coverage,
            top_n_changed_files=cfg.summary_top_n_changed_files,
            code_snippet_max_chars=cfg.summary_code_snippet_max_chars,
            stack_trace_max_chars=cfg.summary_stack_trace_max_chars,
            low_coverage_threshold=cfg.summary_low_coverage_threshold,
            structure_top_level_max=cfg.summary_structure_top_level_max,
            structure_dirs_max=cfg.summary_structure_dirs_max,
            structure_files_max=cfg.summary_structure_files_max,
            compact_json=cfg.summary_compact_json,
        )
