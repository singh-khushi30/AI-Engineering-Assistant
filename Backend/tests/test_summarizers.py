"""Unit tests for tool-output summarization (prompt-size optimization)."""

from __future__ import annotations

import json
from typing import Any

from tools.summarizers import ToolSummaryService
from tools.summarizers.config import SummarizerConfig


def _huge_bandit_result(n: int = 80) -> dict[str, Any]:
    findings = []
    for i in range(n):
        severity = ["HIGH", "MEDIUM", "LOW"][i % 3]
        findings.append(
            {
                "filename": f"app/module_{i % 12}/file_{i}.py",
                "issue_text": f"Possible hardcoded password variant {i} " + ("x" * 40),
                "issue_severity": severity,
                "issue_confidence": ["HIGH", "MEDIUM", "LOW"][i % 3],
                "line_number": 10 + i,
                "test_id": f"B10{i % 10}",
                "test_name": f"hardcoded_password_{i}",
                "more_info": f"https://bandit.readthedocs.io/en/latest/plugins/b105.html#{i}",
                "code": "password = 'secret'\n" + (" " * 20 + "unused = " + str(i) + "\n") * 30,
                "line_range": [10 + i, 12 + i],
                "cwe": {"id": 259, "link": "https://cwe.mitre.org/data/definitions/259.html"},
            }
        )
    return {
        "success": True,
        "tool": "bandit",
        "execution_time": 1.23,
        "data": {
            "finding_count": n,
            "findings": findings,
            "metrics": {
                "_totals": {
                    "SEVERITY.HIGH": sum(1 for f in findings if f["issue_severity"] == "HIGH"),
                    "SEVERITY.MEDIUM": sum(1 for f in findings if f["issue_severity"] == "MEDIUM"),
                    "SEVERITY.LOW": sum(1 for f in findings if f["issue_severity"] == "LOW"),
                    "CONFIDENCE.HIGH": sum(1 for f in findings if f["issue_confidence"] == "HIGH"),
                    "CONFIDENCE.MEDIUM": sum(1 for f in findings if f["issue_confidence"] == "MEDIUM"),
                    "CONFIDENCE.LOW": sum(1 for f in findings if f["issue_confidence"] == "LOW"),
                    "loc": 5000,
                    "nosec": 0,
                },
                "app/module_0/file_0.py": {"SEVERITY.HIGH": 1, "loc": 100},
            },
            "generated_at": "2026-07-24T00:00:00Z",
        },
        "errors": [],
    }


def test_bandit_summarizer_keeps_review_fields_and_compresses() -> None:
    config = SummarizerConfig(top_n_findings=10, code_snippet_max_chars=120)
    service = ToolSummaryService(config=config)
    raw = _huge_bandit_result(80)
    summary = service.summarize("bandit", raw)

    assert summary.truncated is True
    assert summary.summary["finding_count"] == 80
    assert "severity_counts" in summary.summary
    assert "confidence_counts" in summary.summary
    assert len(summary.summary["top_findings"]) == 10
    assert summary.summary["omitted_findings"] == 70

    top = summary.summary["top_findings"][0]
    assert top["severity"] == "HIGH"
    assert top["file"]
    assert top["line"]
    assert top["issue"]
    assert top.get("code") is None or len(top["code"]) <= 120 + 20

    # Must be far smaller than raw Bandit JSON (target ~5–10%, allow headroom).
    assert summary.compression_ratio < 0.12
    assert summary.summary_chars < summary.original_chars * 0.12

    prompt = summary.prompt_dict()
    assert "original_chars" not in prompt
    prompt_text = json.dumps(prompt, separators=(",", ":"))
    raw_text = json.dumps(raw, separators=(",", ":"))
    assert len(prompt_text) / len(raw_text) < 0.12


def test_ruff_summarizer_groups_by_rule() -> None:
    config = SummarizerConfig(top_n_rules=3, top_n_files=2)
    service = ToolSummaryService(config=config)
    issues = []
    for i in range(50):
        issues.append(
            {
                "code": ["E501", "F401", "I001", "W292"][i % 4],
                "message": f"Issue {i} " + ("m" * 80),
                "filename": f"pkg/file_{i % 5}.py",
                "location": {"row": i + 1, "column": 1},
            }
        )
    raw = {
        "success": True,
        "tool": "ruff",
        "data": {"issue_count": 50, "file_count": 5, "issues": issues, "issues_by_file": {}},
        "errors": [],
    }
    summary = service.summarize("ruff", raw)
    assert summary.summary["issue_count"] == 50
    assert len(summary.summary["rule_counts_top"]) == 3
    assert len(summary.summary["affected_files_top"]) == 2
    assert summary.summary["rule_counts_top"][0]["examples"]
    assert summary.compression_ratio < 0.25


def test_pytest_summarizer_keeps_failures_only() -> None:
    service = ToolSummaryService(config=SummarizerConfig(top_n_findings=5, stack_trace_max_chars=200))
    stdout = """
=========================== FAILURES ===========================
_____________________ test_login_rejects _____________________
def test_login_rejects():
>       assert False
E       AssertionError
FAILED tests/test_auth.py::test_login_rejects - AssertionError
FAILED tests/test_auth.py::test_logout - AssertionError
==================== 2 failed, 10 passed ====================
"""
    raw = {
        "success": False,
        "tool": "pytest",
        "data": {
            "passed": False,
            "returncode": 1,
            "summary": {"passed": 10, "failed": 2, "skipped": 1, "errors": 0},
            "stdout": stdout + ("noise line\n" * 200),
            "stderr": "",
        },
        "errors": [],
    }
    summary = service.summarize("pytest", raw)
    body = summary.summary
    assert body["counts"]["passed"] == 10
    assert body["counts"]["failed"] == 2
    assert body["counts"]["skipped"] == 1
    assert len(body["failing_tests"]) >= 1
    assert any("test_login" in f.get("test", "") for f in body["failing_tests"])
    for failure in body["failing_tests"]:
        if failure.get("stack_trace"):
            assert len(failure["stack_trace"]) <= 220
    assert summary.compression_ratio < 0.35


def test_coverage_summarizer_lowest_files_only() -> None:
    files = {
        f"app/a{i}.py": {
            "summary": {
                "percent_covered": 90 - i,
                "missing_lines": i * 3,
                "num_statements": 100,
                "covered_lines": 90 - i,
            }
        }
        for i in range(30)
    }
    raw = {
        "success": True,
        "tool": "coverage",
        "data": {
            "percent_covered": 71.5,
            "covered_lines": 700,
            "num_statements": 980,
            "missing_lines": 280,
            "files": files,
        },
        "errors": [],
    }
    service = ToolSummaryService(config=SummarizerConfig(top_n_low_coverage=5, low_coverage_threshold=80))
    summary = service.summarize("coverage", raw)
    assert summary.summary["percent_covered"] == 71.5
    assert len(summary.summary["lowest_coverage_files"]) == 5
    percents = [f["percent_covered"] for f in summary.summary["lowest_coverage_files"]]
    assert percents == sorted(percents)


def test_git_summarizer_caps_changed_files() -> None:
    modified = [f"src/file_{i}.py" for i in range(60)]
    raw = {
        "success": True,
        "tool": "git",
        "data": {
            "is_git_repository": True,
            "branch": "feature/summarizers",
            "latest_commit": "abc1234 Add summarizers",
            "diffstat": {"files_changed": 60, "insertions": 400, "deletions": 50},
            "modified_files": modified,
            "staged_files": ["src/file_0.py"],
            "untracked_files": ["tmp.out"],
        },
        "errors": [],
    }
    service = ToolSummaryService(config=SummarizerConfig(top_n_changed_files=10))
    summary = service.summarize("git", raw)
    assert summary.summary["branch"] == "feature/summarizers"
    assert summary.summary["latest_commit"]
    assert summary.summary["diffstat"]["insertions"] == 400
    assert len(summary.summary["changed_files"]) == 10
    assert summary.summary["omitted_changed_files"] > 0
    assert summary.truncated is True


def test_structure_summarizer_caps_inventory() -> None:
    service = ToolSummaryService(
        config=SummarizerConfig(
            structure_top_level_max=5,
            structure_dirs_max=5,
            structure_files_max=5,
        )
    )
    structure = {
        "project_path": "/demo",
        "top_level": ["a", "b", "c", "d", "e", "f"],
        "directories": ["a", "b", "c", "d", "e", "f"],
        "files": [f"a/{i}.py" for i in range(20)],
        "directory_count": 6,
        "file_count": 20,
    }
    compact = service.summarize_structure(structure)
    assert len(compact["top_level"]) == 5
    assert len(compact["directories"]) == 5
    assert len(compact["files"]) == 5
    assert compact["truncated"] is True
