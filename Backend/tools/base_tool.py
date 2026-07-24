"""Shared base types and helpers for developer tool services."""

from __future__ import annotations

import logging
import shutil
import subprocess  # nosec B404 - intentional controlled subprocess usage
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class ToolResult(BaseModel):
    """Consistent structured response returned by every tool."""

    success: bool
    tool: str
    execution_time: float = Field(..., description="Wall-clock seconds")
    data: dict[str, Any] = Field(default_factory=dict)
    errors: list[str] = Field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


@dataclass(slots=True)
class CommandResult:
    """Raw outcome of a subprocess invocation."""

    command: list[str]
    returncode: int
    stdout: str
    stderr: str
    timed_out: bool = False
    executable_missing: bool = False


class ToolError(Exception):
    """Raised for expected, recoverable tool failures."""

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class BaseTool(ABC):
    """Abstract base class for all developer tool services."""

    name: str = "base"
    default_timeout: float = 120.0

    def validate_project_path(self, project_path: str | Path) -> Path:
        """Resolve and validate that a project path exists and is a directory."""
        path = Path(project_path).expanduser().resolve()

        if not path.exists():
            raise ToolError(f"Project path does not exist: {path}")
        if not path.is_dir():
            raise ToolError(f"Project path is not a directory: {path}")

        logger.debug("%s validated project path: %s", self.name, path)
        return path

    def ensure_executable(self, executable: str) -> str:
        """Return the absolute path to an executable or raise ToolError."""
        resolved = shutil.which(executable)
        if resolved is None:
            raise ToolError(
                f"Required executable '{executable}' was not found on PATH. "
                f"Install it before running the {self.name} tool."
            )
        return resolved

    def run_command(
        self,
        command: list[str],
        *,
        cwd: Path,
        timeout: float | None = None,
        env: dict[str, str] | None = None,
    ) -> CommandResult:
        """Run a subprocess safely without shell interpolation."""
        if not command:
            raise ToolError("Command list must not be empty")

        timeout = self.default_timeout if timeout is None else timeout
        logger.info(
            "%s executing command: %s (cwd=%s, timeout=%ss)",
            self.name,
            command,
            cwd,
            timeout,
        )

        try:
            completed = subprocess.run(  # nosec B603 - args are list-based; shell=False
                command,
                cwd=str(cwd),
                capture_output=True,
                text=True,
                timeout=timeout,
                env=env,
                shell=False,
                check=False,
            )
        except FileNotFoundError:
            logger.error("%s executable missing for command: %s", self.name, command)
            return CommandResult(
                command=command,
                returncode=127,
                stdout="",
                stderr=f"Executable not found: {command[0]}",
                executable_missing=True,
            )
        except subprocess.TimeoutExpired as exc:
            logger.error("%s timed out after %ss: %s", self.name, timeout, command)
            stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
            stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
            return CommandResult(
                command=command,
                returncode=124,
                stdout=stdout,
                stderr=stderr or f"Command timed out after {timeout} seconds",
                timed_out=True,
            )

        result = CommandResult(
            command=command,
            returncode=completed.returncode,
            stdout=completed.stdout or "",
            stderr=completed.stderr or "",
        )
        logger.debug(
            "%s command finished returncode=%s stdout_len=%s stderr_len=%s",
            self.name,
            result.returncode,
            len(result.stdout),
            len(result.stderr),
        )
        return result

    def failure(
        self,
        *,
        execution_time: float,
        errors: list[str],
        data: dict[str, Any] | None = None,
    ) -> ToolResult:
        return ToolResult(
            success=False,
            tool=self.name,
            execution_time=round(execution_time, 3),
            data=data or {},
            errors=errors,
        )

    def success_result(
        self,
        *,
        execution_time: float,
        data: dict[str, Any],
        errors: list[str] | None = None,
    ) -> ToolResult:
        return ToolResult(
            success=True,
            tool=self.name,
            execution_time=round(execution_time, 3),
            data=data,
            errors=errors or [],
        )

    def timed_run(self, project_path: str | Path, **kwargs: Any) -> ToolResult:
        """Time a tool run and convert unexpected exceptions into ToolResult."""
        started = time.perf_counter()
        try:
            return self.run(project_path, **kwargs)
        except ToolError as exc:
            elapsed = time.perf_counter() - started
            logger.warning("%s tool error: %s", self.name, exc.message)
            return self.failure(
                execution_time=elapsed,
                errors=[exc.message],
                data=exc.details,
            )
        except Exception as exc:  # noqa: BLE001 - boundary for tool services
            elapsed = time.perf_counter() - started
            logger.exception("%s unexpected failure", self.name)
            return self.failure(
                execution_time=elapsed,
                errors=[f"Unexpected error: {exc}"],
            )

    @abstractmethod
    def run(self, project_path: str | Path, **kwargs: Any) -> ToolResult:
        """Execute the tool against a project path and return a structured result."""
