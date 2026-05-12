from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

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


class UserProfile(BaseModel):
    user_id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    email_verified: bool
    household_income_monthly_after_tax: Decimal | None = None
    household_size: int | None = None
    number_of_dependants: int | None = None
    subscription_tier: str
    created_at: datetime
