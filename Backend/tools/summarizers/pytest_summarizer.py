"""Pytest output summarizer — counts + failing tests only."""

from __future__ import annotations

import re
from typing import Any

from tools.summarizers.base import FAILED_TEST_RE, BaseToolSummarizer, truncate_text


class PytestSummarizer(BaseToolSummarizer):
    tool_name = "pytest"

    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        data = tool_result.get("data") if isinstance(tool_result.get("data"), dict) else {}
        counts = data.get("summary") if isinstance(data.get("summary"), dict) else {}
        stdout = str(data.get("stdout") or "")
        stderr = str(data.get("stderr") or "")
        combined = f"{stdout}\n{stderr}"

        failing_names = [
            match.group(2)
            for match in FAILED_TEST_RE.finditer(combined)
        ]
        # Deduplicate while preserving order
        seen: set[str] = set()
        unique_failing: list[str] = []
        for name in failing_names:
            if name in seen:
                continue
            seen.add(name)
            unique_failing.append(name)

        failure_blocks = self._extract_failure_blocks(combined)
        top_n = self.config.top_n_findings
        truncated = len(unique_failing) > top_n or len(failure_blocks) > top_n

        failures = []
        for index, name in enumerate(unique_failing[:top_n]):
            trace = failure_blocks[index] if index < len(failure_blocks) else None
            failures.append(
                {
                    "test": name,
                    "stack_trace": truncate_text(trace, self.config.stack_trace_max_chars),
                }
            )

        # If we parsed traces but not names, still include truncated traces.
        if not failures and failure_blocks:
            for block in failure_blocks[:top_n]:
                failures.append(
                    {
                        "test": "unknown",
                        "stack_trace": truncate_text(block, self.config.stack_trace_max_chars),
                    }
                )

        summary = {
            "passed": data.get("passed"),
            "returncode": data.get("returncode"),
            "counts": {
                "passed": int(counts.get("passed") or 0),
                "failed": int(counts.get("failed") or 0),
                "errors": int(counts.get("errors") or 0),
                "skipped": int(counts.get("skipped") or 0),
                "xfailed": int(counts.get("xfailed") or 0),
                "xpassed": int(counts.get("xpassed") or 0),
            },
            "failing_tests": failures,
            "omitted_failures": max(0, len(unique_failing) - len(failures)),
        }
        return summary, truncated, list(tool_result.get("errors") or [])

    @staticmethod
    def _extract_failure_blocks(output: str) -> list[str]:
        if not output.strip():
            return []
        failures_match = re.search(
            r"=+\s*FAILURES\s*=+(.*?)(?:=\s*\d+\s+|\Z)",
            output,
            re.DOTALL | re.IGNORECASE,
        )
        section = failures_match.group(1) if failures_match else output
        parts = re.split(r"\n_{5,}\s*", section)
        blocks: list[str] = []
        for part in parts:
            text = part.strip()
            if not text:
                continue
            if "Error" in text or "assert" in text.lower() or "FAILED" in text:
                blocks.append(text)
        if not blocks:
            blocks = [part.strip() for part in parts if len(part.strip()) > 40][:10]
        return blocks
