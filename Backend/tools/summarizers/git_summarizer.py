"""Git output summarizer — branch, changed files, diffstat, commit."""

from __future__ import annotations

from typing import Any

from tools.summarizers.base import BaseToolSummarizer


class GitSummarizer(BaseToolSummarizer):
    tool_name = "git"

    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        data = tool_result.get("data") if isinstance(tool_result.get("data"), dict) else {}
        modified = list(data.get("modified_files") or [])
        staged = list(data.get("staged_files") or [])
        untracked = list(data.get("untracked_files") or [])

        # Preserve uniqueness while prioritizing modified/staged.
        changed: list[str] = []
        seen: set[str] = set()
        for name in modified + staged + untracked:
            if name in seen:
                continue
            seen.add(name)
            changed.append(name)

        top_n = self.config.top_n_changed_files
        truncated = len(changed) > top_n
        summary = {
            "is_git_repository": data.get("is_git_repository"),
            "branch": data.get("branch"),
            "latest_commit": data.get("latest_commit"),
            "diffstat": data.get("diffstat"),
            "changed_file_count": len(changed),
            "modified_count": len(modified),
            "staged_count": len(staged),
            "untracked_count": len(untracked),
            "changed_files": changed[:top_n],
            "omitted_changed_files": max(0, len(changed) - top_n),
        }
        return summary, truncated, list(tool_result.get("errors") or [])
