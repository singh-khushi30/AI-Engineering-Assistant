"""Ruff output summarizer — rule groups + representative examples."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any

from tools.summarizers.base import BaseToolSummarizer


class RuffSummarizer(BaseToolSummarizer):
    tool_name = "ruff"

    def _build_summary(
        self,
        tool_result: dict[str, Any],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        data = tool_result.get("data") if isinstance(tool_result.get("data"), dict) else {}
        issues = data.get("issues") if isinstance(data.get("issues"), list) else []
        by_file = (
            data.get("issues_by_file")
            if isinstance(data.get("issues_by_file"), dict)
            else {}
        )

        rule_counts: Counter[str] = Counter()
        file_counts: Counter[str] = Counter()
        examples_by_rule: dict[str, list[dict[str, Any]]] = defaultdict(list)

        for issue in issues:
            if not isinstance(issue, dict):
                continue
            code = str(issue.get("code") or "UNKNOWN")
            filename = str(issue.get("filename") or "unknown")
            rule_counts[code] += 1
            file_counts[filename] += 1
            if len(examples_by_rule[code]) < 2:
                location = issue.get("location") if isinstance(issue.get("location"), dict) else {}
                examples_by_rule[code].append(
                    {
                        "file": filename,
                        "line": location.get("row"),
                        "message": issue.get("message"),
                    }
                )

        # Fallback if only grouped map exists.
        if not issues and by_file:
            for filename, file_issues in by_file.items():
                if not isinstance(file_issues, list):
                    continue
                for issue in file_issues:
                    if not isinstance(issue, dict):
                        continue
                    code = str(issue.get("code") or "UNKNOWN")
                    rule_counts[code] += 1
                    file_counts[str(filename)] += 1
                    if len(examples_by_rule[code]) < 2:
                        location = (
                            issue.get("location")
                            if isinstance(issue.get("location"), dict)
                            else {}
                        )
                        examples_by_rule[code].append(
                            {
                                "file": str(filename),
                                "line": location.get("row"),
                                "message": issue.get("message"),
                            }
                        )

        top_rules = []
        for code, count in rule_counts.most_common(self.config.top_n_rules):
            top_rules.append(
                {
                    "rule": code,
                    "count": count,
                    "examples": examples_by_rule.get(code, [])[:2],
                }
            )

        affected_files = [
            {"file": name, "issue_count": count}
            for name, count in file_counts.most_common(self.config.top_n_files)
        ]

        total_issues = int(data.get("issue_count") or sum(rule_counts.values()))
        truncated = (
            len(rule_counts) > self.config.top_n_rules
            or len(file_counts) > self.config.top_n_files
        )
        summary = {
            "issue_count": total_issues,
            "file_count": int(data.get("file_count") or len(file_counts)),
            "rule_counts_top": top_rules,
            "affected_files_top": affected_files,
            "omitted_rules": max(0, len(rule_counts) - len(top_rules)),
            "omitted_files": max(0, len(file_counts) - len(affected_files)),
        }
        return summary, truncated, list(tool_result.get("errors") or [])
