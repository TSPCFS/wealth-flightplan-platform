"""Standard error envelope + domain exceptions.

API_CONTRACT.md mandates this shape for all 4xx/5xx responses:

    {
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable message",
        "details": { ... }   # optional
      }
    }
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded


class APIError(HTTPException):
    """Raise this anywhere in the app to emit a contract-shaped error."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.details = details
        super().__init__(status_code=status_code, detail=message, headers=headers)


def error_payload(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return {"error": body}


async def api_error_handler(_: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.code, exc.message, exc.details),
        headers=exc.headers or {},
    )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    code = {
        status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
        status.HTTP_403_FORBIDDEN: "FORBIDDEN",
        status.HTTP_404_NOT_FOUND: "NOT_FOUND",
        status.HTTP_405_METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
        status.HTTP_409_CONFLICT: "CONFLICT",
        status.HTTP_422_UNPROCESSABLE_ENTITY: "VALIDATION_ERROR",
        status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMITED",
    }.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(code, str(exc.detail)),
        headers=exc.headers or {},
    )


async def validation_exception_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    details: dict[str, list[str]] = {}
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
        field = ".".join(loc) if loc else "_"
        details.setdefault(field, []).append(err.get("msg", "Invalid value"))
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=error_payload(
            "VALIDATION_ERROR",
            "One or more fields are invalid.",
            jsonable_encoder(details),
        ),
    )


async def rate_limit_handler(_: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content=error_payload(
            "RATE_LIMITED",
            f"Rate limit exceeded: {exc.detail}",
        ),
        headers={"Retry-After": "60"},
    )
