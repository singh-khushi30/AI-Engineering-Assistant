"""Helpers for coverage summaries and timeline steps from review payloads."""

from __future__ import annotations

from typing import Any

# Timing keys produced by the orchestrator → API step id + label.
TIMING_STEP_MAP: list[tuple[str, str, str]] = [
    ("project_structure", "repository_validated", "Repository validated"),
    ("git", "git", "Git analysis"),
    ("bandit", "bandit", "Bandit security analysis"),
    ("ruff", "ruff", "Ruff style analysis"),
    ("pytest", "pytest", "Pytest analysis"),
    ("coverage", "coverage", "Coverage analysis"),
    ("agent_security", "security_agent", "Security review agent"),
    ("agent_style", "style_agent", "Style review agent"),
    ("agent_testing", "testing_agent", "Testing review agent"),
    ("agent_architecture", "architecture_agent", "Architecture review agent"),
    ("executive_summary", "executive_summary", "Executive summary"),
    ("report_generation", "report_generation", "Report generation"),
]


def _as_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        if number != number:  # NaN
            return None
        return number
    return None


def normalize_coverage_percent(value: Any) -> float | None:
    """Accept 73.93 or 0.7393; reject NaN / out-of-range values."""
    number = _as_float(value)
    if number is None:
        return None
    # Coverage.py usually emits 0–100. Treat exclusive (0, 1) as a fraction.
    if 0.0 < number < 1.0:
        number *= 100.0
    if number < 0 or number > 100:
        return None
    return round(number, 2)


def extract_coverage_file_entries(coverage_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize coverage.py `files` dict or list into file summary rows."""
    files = coverage_data.get("files")
    modules = coverage_data.get("modules")
    entries: list[dict[str, Any]] = []

    if isinstance(files, dict):
        for path, payload in files.items():
            summary: dict[str, Any]
            if isinstance(payload, dict) and isinstance(payload.get("summary"), dict):
                summary = payload["summary"]
            elif isinstance(payload, dict):
                summary = payload
            else:
                continue
            percent = normalize_coverage_percent(
                summary.get("percent_covered", summary.get("coverage", summary.get("percent")))
            )
            covered = summary.get("covered_lines")
            total = summary.get("num_statements")
            if total is None:
                total = summary.get("total_lines")
            entries.append(
                {
                    "name": str(path),
                    "percentage": percent,
                    "covered_lines": covered if isinstance(covered, int) else None,
                    "total_lines": total if isinstance(total, int) else None,
                }
            )
    elif isinstance(files, list):
        for item in files:
            if not isinstance(item, dict):
                continue
            name = item.get("file") or item.get("name") or item.get("path")
            if not name:
                continue
            percent = normalize_coverage_percent(
                item.get("percent_covered", item.get("coverage", item.get("percent")))
            )
            covered = item.get("covered_lines")
            total = item.get("num_statements", item.get("total_lines"))
            entries.append(
                {
                    "name": str(name),
                    "percentage": percent,
                    "covered_lines": covered if isinstance(covered, int) else None,
                    "total_lines": total if isinstance(total, int) else None,
                }
            )
    elif isinstance(modules, list):
        for item in modules:
            if not isinstance(item, dict):
                continue
            name = item.get("name") or item.get("file") or item.get("path")
            if not name:
                continue
            percent = normalize_coverage_percent(
                item.get("percentage", item.get("percent_covered", item.get("percent")))
            )
            covered = item.get("covered_lines")
            total = item.get("total_lines", item.get("num_statements"))
            entries.append(
                {
                    "name": str(name),
                    "percentage": percent,
                    "covered_lines": covered if isinstance(covered, int) else None,
                    "total_lines": total if isinstance(total, int) else None,
                }
            )

    return entries


def build_coverage_summary(tool_payload: Any) -> dict[str, Any] | None:
    """Build a stable coverage summary from a coverage tool result blob."""
    if not isinstance(tool_payload, dict):
        return None
    data = tool_payload.get("data") if isinstance(tool_payload.get("data"), dict) else tool_payload
    if not isinstance(data, dict):
        return None

    percentage = normalize_coverage_percent(
        data.get("percent_covered", data.get("total_coverage", data.get("coverage_percent")))
    )
    covered = data.get("covered_lines")
    total = data.get("num_statements")
    if total is None:
        total = data.get("total_lines")

    modules = extract_coverage_file_entries(data)
    if percentage is None and not modules and covered is None and total is None:
        return None

    return {
        "percentage": percentage,
        "covered_lines": covered if isinstance(covered, int) else None,
        "total_lines": total if isinstance(total, int) else None,
        "modules": modules,
    }


def synthesize_steps_from_timings(timings: Any) -> list[dict[str, Any]]:
    """Build completed progress steps from truthful orchestrator timings."""
    if not isinstance(timings, dict) or not timings:
        return []

    steps: list[dict[str, Any]] = [
        {
            "id": "initialized",
            "label": "Review initialized",
            "status": "completed",
            "detail": None,
        }
    ]

    for timing_key, step_id, label in TIMING_STEP_MAP:
        if timing_key not in timings:
            continue
        duration = _as_float(timings.get(timing_key))
        detail = f"{duration:.3f}s" if duration is not None else None
        steps.append(
            {
                "id": step_id,
                "label": label,
                "status": "completed",
                "detail": detail,
            }
        )

    steps.append(
        {
            "id": "completed",
            "label": "Review completed",
            "status": "completed",
            "detail": None,
        }
    )
    return steps


def synthesize_boundary_steps(
    *,
    started_at: str | None,
    completed_at: str | None,
) -> list[dict[str, Any]]:
    """High-level started/completed events when timings are unavailable."""
    steps: list[dict[str, Any]] = []
    if started_at:
        steps.append(
            {
                "id": "initialized",
                "label": "Review started",
                "status": "completed",
                "detail": started_at,
            }
        )
    if completed_at:
        steps.append(
            {
                "id": "completed",
                "label": "Review completed",
                "status": "completed",
                "detail": completed_at,
            }
        )
    return steps


def resolve_steps_for_record(record: dict[str, Any]) -> list[dict[str, Any]]:
    """Return existing steps, or derive truthful ones for imported/historical records."""
    existing = record.get("steps")
    if isinstance(existing, list) and len(existing) > 0:
        return existing

    result = record.get("result") if isinstance(record.get("result"), dict) else {}
    aggregated = result.get("aggregated_review") if isinstance(result.get("aggregated_review"), dict) else {}
    report = result.get("report") if isinstance(result.get("report"), dict) else {}
    appendix = report.get("appendix") if isinstance(report.get("appendix"), dict) else {}

    timings = aggregated.get("timings") if isinstance(aggregated.get("timings"), dict) else None
    if not timings and isinstance(appendix.get("timings"), dict):
        timings = appendix["timings"]

    from_timings = synthesize_steps_from_timings(timings)
    if from_timings:
        return from_timings

    started = record.get("started_at") or record.get("created_at")
    completed = record.get("completed_at")
    return synthesize_boundary_steps(
        started_at=str(started) if started else None,
        completed_at=str(completed) if completed else None,
    )


def attach_coverage_summary_to_result(result: dict[str, Any] | None) -> dict[str, Any] | None:
    """Ensure result.coverage is populated from tool output when possible."""
    if not isinstance(result, dict):
        return result
    if isinstance(result.get("coverage"), dict) and result["coverage"].get("modules") is not None:
        return result

    aggregated = result.get("aggregated_review") if isinstance(result.get("aggregated_review"), dict) else {}
    tools = aggregated.get("tools") if isinstance(aggregated.get("tools"), dict) else {}
    coverage_tool = tools.get("coverage")
    summary = build_coverage_summary(coverage_tool)
    if summary is None:
        # Fallback: report appendix
        report = result.get("report") if isinstance(result.get("report"), dict) else {}
        appendix = report.get("appendix") if isinstance(report.get("appendix"), dict) else {}
        tool_results = appendix.get("tool_results") if isinstance(appendix.get("tool_results"), dict) else {}
        summary = build_coverage_summary(tool_results.get("coverage"))

    if summary is not None:
        result = dict(result)
        result["coverage"] = summary
    return result
