"""Authentication endpoints — conforms to docs/API_CONTRACT.md."""

from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, Request, status
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_user,
    get_request_context,
    limiter,
)
from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LoginUser,
    LogoutRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    VerifyResponse,
)
from app.services import auth as auth_service
from app.services import rate_limit
from app.services.auth import RequestContext

router = APIRouter(prefix="/auth", tags=["auth"])


def _ip_key(request: Request) -> str:
    return get_remote_address(request)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(get_settings().rate_limit_register, key_func=_ip_key)
async def register(
    request: Request,
    payload: RegisterRequest = Body(...),
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> RegisterResponse:
    user = await auth_service.register(
        session,
        email_addr=payload.email,
        password=payload.password,
        first_name=payload.first_name,
        last_name=payload.last_name,
        household_income_monthly_after_tax=payload.household_income_monthly_after_tax,
        household_size=payload.household_size,
        number_of_dependants=payload.number_of_dependants,
        ctx=ctx,
    )
    return RegisterResponse(
        user_id=user.user_id,
        email=user.email,
        email_verified=user.email_verified,
        message="Verification email sent",
    )


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> LoginResponse:
    settings = get_settings()
    await rate_limit.enforce(
        bucket="login",
        key=payload.email.strip().lower(),
        limit=settings.rate_limit_login,
    )
    user, access, refresh = await auth_service.login(
        session,
        email_addr=payload.email,
        password=payload.password,
        ctx=ctx,
        settings=settings,
    )
    return LoginResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="Bearer",
        expires_in=settings.jwt_access_token_expire_seconds,
        user=LoginUser(
            user_id=user.user_id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            email_verified=user.email_verified,
            subscription_tier=user.subscription_tier,
        ),
    )


@router.get(
    "/verify",
    response_model=VerifyResponse,
    status_code=status.HTTP_200_OK,
)
async def verify(
    token: Annotated[str, Query(min_length=10)],
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> VerifyResponse:
    user = await auth_service.verify_email(session, token=token, ctx=ctx)
    return VerifyResponse(
        email_verified=user.email_verified,
        message="Email verified successfully",
    )


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    status_code=status.HTTP_200_OK,
)
async def refresh(
    payload: RefreshRequest,
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> RefreshResponse:
    access, expires_in = await auth_service.refresh_access_token(
        session, refresh_token=payload.refresh_token, ctx=ctx
    )
    return RefreshResponse(access_token=access, expires_in=expires_in)


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def logout(
    payload: LogoutRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    ctx: RequestContext = Depends(get_request_context),
) -> MessageResponse:
    await auth_service.logout(
        session,
        user_id=current_user.user_id,
        refresh_token=payload.refresh_token,
        ctx=ctx,
    )
    return MessageResponse(message="Logged out successfully")


@router.post(
    "/password-reset",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def password_reset(
    payload: PasswordResetRequest,
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> MessageResponse:
    settings = get_settings()
    await rate_limit.enforce(
        bucket="password_reset",
        key=payload.email.strip().lower(),
        limit=settings.rate_limit_password_reset,
    )
    await auth_service.request_password_reset(session, email_addr=payload.email, ctx=ctx)
    return MessageResponse(message="If that email exists, a reset link has been sent")


@router.post(
    "/password-reset/confirm",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def password_reset_confirm(
    payload: PasswordResetConfirmRequest,
    session: AsyncSession = Depends(get_db),
    ctx: RequestContext = Depends(get_request_context),
) -> MessageResponse:
    await auth_service.confirm_password_reset(
        session,
        token=payload.token,
        new_password=payload.new_password,
        ctx=ctx,
    )
    return MessageResponse(message="Password reset successfully")
