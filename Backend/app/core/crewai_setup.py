"""CrewAI runtime bootstrap (storage + telemetry).

Architectural note:
  CrewAI defaults to the OS user data directory and several modules bind
  ``db_storage_path`` at import time. We redirect storage to
  ``Backend/.crewai`` and rebind that symbol across already-imported CrewAI
  modules so artifacts stay inside the workspace.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

_BOOTSTRAPPED = False
_STORAGE_PATH: Path | None = None


def bootstrap_crewai(storage_root: Path | None = None) -> Path:
    """Configure CrewAI storage/telemetry once per process."""
    global _BOOTSTRAPPED, _STORAGE_PATH

    backend_root = Path(__file__).resolve().parents[2]
    target = (storage_root or (backend_root / ".crewai")).resolve()
    target.mkdir(parents=True, exist_ok=True)
    _STORAGE_PATH = target

    os.environ.setdefault("CREWAI_DISABLE_TELEMETRY", "true")
    os.environ.setdefault("CREWAI_STORAGE_DIR", "ai_engineering_assistant")

    def _db_storage_path() -> str:
        assert _STORAGE_PATH is not None
        _STORAGE_PATH.mkdir(parents=True, exist_ok=True)
        return str(_STORAGE_PATH)

    import crewai.utilities.paths as crewai_paths

    crewai_paths.db_storage_path = _db_storage_path  # type: ignore[method-assign]

    # Rebind imported references (CrewAI imports db_storage_path by name).
    for module_name, module in list(sys.modules.items()):
        if module is None or not module_name.startswith("crewai"):
            continue
        if hasattr(module, "db_storage_path"):
            setattr(module, "db_storage_path", _db_storage_path)

    if not _BOOTSTRAPPED:
        _BOOTSTRAPPED = True
        logger.info("CrewAI storage configured at %s", target)

    return target
