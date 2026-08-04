"""API route modules."""

from fastapi import APIRouter

from app.api.routes import filesystem, health, reviews

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(reviews.router)
api_router.include_router(filesystem.router)
