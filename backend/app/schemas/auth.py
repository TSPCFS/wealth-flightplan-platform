from __future__ import annotations

from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas._base import MoneyAmount, ZuluDateTime, ZuluResponse

# ---------- Register ----------


class RegisterRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    email: EmailStr
    password: str = Field(min_length=12, max_length=256)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    household_income_monthly_after_tax: Decimal | None = Field(default=None, ge=0)
    household_size: int | None = Field(default=None, ge=1)
    number_of_dependants: int | None = Field(default=None, ge=0)


class RegisterResponse(BaseModel):
    user_id: UUID
    email: EmailStr
    email_verified: bool
    message: str


# ---------- Login ----------


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginUser(BaseModel):
    user_id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    email_verified: bool
    subscription_tier: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int
    user: LoginUser


# ---------- Verify ----------


class VerifyResponse(BaseModel):
    email_verified: bool
    message: str


# ---------- Refresh ----------


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    expires_in: int


# ---------- Logout ----------


class LogoutRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str


# ---------- Password reset ----------


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=12, max_length=256)


# ---------- Profile ----------


class UserProfile(ZuluResponse):
    user_id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    email_verified: bool
    household_income_monthly_after_tax: MoneyAmount | None = None
    household_size: int | None = None
    number_of_dependants: int | None = None
    is_business_owner: bool = False
    primary_language: str = "en"
    timezone: str = "SAST"
    subscription_tier: str
    current_stage: str | None = None
    latest_assessment_id: UUID | None = None
    created_at: ZuluDateTime


class ResetProgressRequest(BaseModel):
    """Body shape for POST /users/me/reset-progress.

    The contract requires the ``confirm`` field as a guardrail against
    accidental deletion. The value is checked at the API layer (must equal
    ``"RESET"``); the field is required so an empty body is rejected with
    ``MISSING_CONFIRM`` rather than silently destroying data.
    """

    model_config = ConfigDict(extra="forbid")

    confirm: str | None = None


class ResetProgressDeletedCounts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    assessments: int
    worksheet_responses: int
    example_interactions: int
    user_progress_rows: int


class ResetProgressResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    deleted: ResetProgressDeletedCounts
    preserved: list[str]
    message: str


class ProfileUpdateRequest(BaseModel):
    """Partial profile update. Every field is optional; the API layer applies
    only the fields that are present in the request body."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    household_income_monthly_after_tax: Decimal | None = Field(default=None, gt=0)
    household_size: int | None = Field(default=None, ge=1)
    number_of_dependants: int | None = Field(default=None, ge=0)
    is_business_owner: bool | None = None
    primary_language: str | None = Field(default=None, min_length=2, max_length=10)
    timezone: str | None = Field(default=None, min_length=1, max_length=50)
