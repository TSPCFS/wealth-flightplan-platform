"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import assessments as assessments_routes
from app.api import auth as auth_routes
from app.api import content as content_routes
from app.api import users as users_routes
from app.api import users_dashboard as dashboard_routes
from app.api import worksheets as worksheets_routes
from app.api.deps import limiter
from app.core.config import get_settings
from app.core.errors import (
    APIError,
    api_error_handler,
    error_payload,
    http_exception_handler,
    rate_limit_handler,
    validation_exception_handler,
)
from app.core.logging import configure_logging
from app.db.database import get_engine

# Bring error_payload into module namespace for the catch-all 404 handler.
_ = error_payload

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    # Eagerly init the engine so connection errors surface at startup.
    get_engine()
    logger.info("Wealth FlightPlan backend started (env=%s)", settings.environment)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Wealth FlightPlan API",
        description=(
            "Phase 1: Authentication & user management. "
            "Phase 2: Assessments. "
            "Phase 3: Framework, examples, calculators, case studies. "
            "Phase 4: Worksheets (drafts, submissions, exports). "
            "Phase 5: Dashboard, recommendations, progress, activity, milestones. "
            "Source of truth: docs/API_CONTRACT.md."
        ),
        version="0.5.0",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        allow_credentials=True,
        max_age=600,
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    # Error envelope handlers
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(RateLimitExceeded, rate_limit_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)

    # Routes
    app.include_router(auth_routes.router)
    app.include_router(users_routes.router)
    app.include_router(dashboard_routes.router)
    app.include_router(assessments_routes.router)
    app.include_router(content_routes.router)
    app.include_router(worksheets_routes.router)

    @app.get("/health", tags=["meta"], status_code=status.HTTP_200_OK)
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # Catch-all 404 so the standard error envelope is always emitted.
    @app.api_route(
        "/{full_path:path}",
        methods=["GET", "POST", "PATCH", "DELETE"],
        include_in_schema=False,
    )
    async def not_found(_: Request, full_path: str) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=error_payload("NOT_FOUND", f"Route /{full_path} does not exist."),
        )

    return app


app = create_app()
