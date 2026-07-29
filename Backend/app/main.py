"""FastAPI application entrypoint for the AI Engineering Assistant."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Application startup and shutdown hooks."""
    settings = get_settings()
    configure_logging(level=settings.log_level, log_format=settings.log_format)
    logger.info(
        "Starting %s v%s (%s)",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )
    # Hydrate persisted review history (and import legacy report JSON if needed).
    from app.services.review_jobs import get_review_job_manager

    manager = get_review_job_manager()
    logger.info("Review history ready jobs=%s", len(manager.list_jobs()))
    yield
    logger.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    """Application factory used by Uvicorn and tests."""
    settings = get_settings()

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.app_debug,
        lifespan=lifespan,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.get("/", tags=["root"])
    async def root() -> dict:
        """Root endpoint with basic service metadata."""
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "environment": settings.app_env,
            "docs": "/docs",
            "health": "/health",
        }

    application.include_router(api_router)
    return application


app = create_app()
