"""Project structure summarizer for Architecture Review Agent."""

from __future__ import annotations

from typing import Any

from tools.summarizers.base import BaseToolSummarizer, coerce_tool_payload


class StructureSummarizer(BaseToolSummarizer):
    tool_name = "project_structure"

    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        # Accept either raw structure dict or wrapped payload.
        structure = tool_result
        if "project_structure" in tool_result and isinstance(tool_result["project_structure"], dict):
            structure = tool_result["project_structure"]
        elif "data" in tool_result and isinstance(tool_result["data"], dict):
            structure = tool_result["data"]

        top_level = list(structure.get("top_level") or [])
        directories = list(structure.get("directories") or [])
        files = list(structure.get("files") or [])

        truncated = (
            len(top_level) > self.config.structure_top_level_max
            or len(directories) > self.config.structure_dirs_max
            or len(files) > self.config.structure_files_max
        )
        summary = {
            "project_path": structure.get("project_path"),
            "directory_count": structure.get("directory_count", len(directories)),
            "file_count": structure.get("file_count", len(files)),
            "top_level": top_level[: self.config.structure_top_level_max],
            "directories": directories[: self.config.structure_dirs_max],
            "files": files[: self.config.structure_files_max],
            "truncated_inventory": bool(structure.get("truncated")) or truncated,
        }
        return summary, truncated, []

    def summarize_structure(self, structure: Any) -> dict[str, Any]:
        payload = coerce_tool_payload(structure)
        summary, truncated, _errors = self._build_summary(payload)
        summary["truncated"] = truncated
        return summary
