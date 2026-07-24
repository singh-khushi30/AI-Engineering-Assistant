"""Health and readiness endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, status

from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict:
    """Liveness probe for load balancers and orchestration platforms."""
    settings = get_settings()
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
