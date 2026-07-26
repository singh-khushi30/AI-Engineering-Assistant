"""Coverage output summarizer — overall % + lowest-coverage files."""

from __future__ import annotations

from typing import Any

from tools.summarizers.base import BaseToolSummarizer


class CoverageSummarizer(BaseToolSummarizer):
    tool_name = "coverage"

    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        data = tool_result.get("data") if isinstance(tool_result.get("data"), dict) else {}
        files = data.get("files") if isinstance(data.get("files"), dict) else {}

        low_files: list[dict[str, Any]] = []
        for file_name, file_data in files.items():
            summary = (
                file_data.get("summary")
                if isinstance(file_data, dict) and isinstance(file_data.get("summary"), dict)
                else {}
            )
            percent = summary.get("percent_covered")
            if not isinstance(percent, (int, float)):
                continue
            if percent >= self.config.low_coverage_threshold:
                continue
            low_files.append(
                {
                    "file": file_name,
                    "percent_covered": round(float(percent), 2),
                    "missing_lines": summary.get("missing_lines"),
                    "num_statements": summary.get("num_statements"),
                    "covered_lines": summary.get("covered_lines"),
                }
            )

        low_files.sort(key=lambda item: item.get("percent_covered", 100.0))
        top_n = self.config.top_n_low_coverage
        truncated = len(low_files) > top_n
        top_low = low_files[:top_n]

        summary = {
            "percent_covered": data.get("percent_covered"),
            "covered_lines": data.get("covered_lines"),
            "num_statements": data.get("num_statements"),
            "missing_lines": data.get("missing_lines"),
            "num_branches": data.get("num_branches"),
            "covered_branches": data.get("covered_branches"),
            "threshold": self.config.low_coverage_threshold,
            "lowest_coverage_files": top_low,
            "omitted_low_coverage_files": max(0, len(low_files) - len(top_low)),
        }
        return summary, truncated, list(tool_result.get("errors") or [])
