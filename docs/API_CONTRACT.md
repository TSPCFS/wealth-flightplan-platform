# Phase 1 API Contract — SOURCE OF TRUTH

**Both backend and frontend agents MUST conform to this contract.**
**If you need to deviate, stop and flag it — do NOT silently change shape.**

Base URL (local dev): `http://localhost:8000`
All request/response bodies are JSON unless noted.
All authenticated endpoints expect: `Authorization: Bearer <access_token>`.

---

## Conventions

- All timestamps ISO 8601 UTC: `2026-05-12T10:30:00Z`
- All IDs are UUID v4 strings
- Error response shape (all 4xx/5xx):
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message",
      "details": { /* optional field-level errors */ }
    }
  }
  ```
- Validation error code: `VALIDATION_ERROR` with `details: { field_name: ["message"] }`
- Auth error codes: `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `TOKEN_INVALID`, `EMAIL_NOT_VERIFIED`, `EMAIL_ALREADY_REGISTERED`

---

## Auth Endpoints

### POST /auth/register
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!@#",
  "first_name": "John",
  "last_name": "Doe",
  "household_income_monthly_after_tax": 85000,
  "household_size": 4,
  "number_of_dependants": 2
}
```
- `email` required, valid email, unique
- `password` required, min 12 chars, mixed case, number, special char, not equal to email, HIBP breach check
- `first_name`, `last_name` required, 1–100 chars
- `household_income_monthly_after_tax`, `household_size`, `number_of_dependants` optional

**Response 201:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "email_verified": false,
  "message": "Verification email sent"
}
```
**Errors:** 400 `VALIDATION_ERROR`, 409 `EMAIL_ALREADY_REGISTERED`

---

### POST /auth/login
**Request:**
```json
{ "email": "user@example.com", "password": "SecurePass123!@#" }
```
**Response 200:**
```json
{
  "access_token": "jwt...",
  "refresh_token": "jwt...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "user_id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "email_verified": true,
    "subscription_tier": "free"
  }
}
```
**Errors:** 401 `INVALID_CREDENTIALS`, 403 `EMAIL_NOT_VERIFIED` (still allow login but flag), 429 rate-limited

---

### GET /auth/verify?token=<verification_token>
**Response 200:**
```json
{ "email_verified": true, "message": "Email verified successfully" }
```
**Errors:** 400 `TOKEN_INVALID`, 400 `TOKEN_EXPIRED`

---

### POST /auth/refresh
**Request:**
```json
{ "refresh_token": "jwt..." }
```
**Response 200:**
```json
{ "access_token": "jwt...", "expires_in": 3600 }
```
**Errors:** 401 `TOKEN_INVALID`, 401 `TOKEN_EXPIRED`

---

### POST /auth/logout
**Auth required.**
**Request:** `{ "refresh_token": "jwt..." }` (so server can blacklist it)
**Response 200:** `{ "message": "Logged out successfully" }`

---

### POST /auth/password-reset
**Request:** `{ "email": "user@example.com" }`
**Response 200:** `{ "message": "If that email exists, a reset link has been sent" }`
(Always return 200 to prevent enumeration. Send email only if email exists.)

---

### POST /auth/password-reset/confirm
**Request:**
```json
{ "token": "reset_token", "new_password": "NewSecurePass123!@#" }
```
**Response 200:** `{ "message": "Password reset successfully" }`
**Errors:** 400 `TOKEN_INVALID`, 400 `TOKEN_EXPIRED`, 400 `VALIDATION_ERROR`

---

## User Endpoints (Phase 1 minimum)

### GET /users/profile
**Auth required.**
**Response 200:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "email_verified": true,
  "household_income_monthly_after_tax": 85000,
  "household_size": 4,
  "number_of_dependants": 2,
  "subscription_tier": "free",
  "created_at": "2026-05-12T10:30:00Z"
}
```

---

## CORS

Backend must allow these origins for Phase 1:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Docker frontend)

Allowed methods: `GET, POST, PATCH, DELETE, OPTIONS`
Allowed headers: `Authorization, Content-Type`

---

## JWT

- Algorithm: **RS256** (RSA keypair, NOT HS256)
- Access token: 1-hour expiry
- Refresh token: 30-day expiry
- Claims: `sub` (user_id), `email`, `subscription_tier`, `iat`, `exp`, `iss: "wealthflightplan"`
- Refresh tokens MUST be revocable (blacklist on logout / password reset)

---

## Rate Limits (Phase 1)

- `/auth/register`: 5/hour per IP
- `/auth/login`: 10/hour per email
- `/auth/password-reset`: 3/hour per email
- Other endpoints: 100/min per authenticated user

Return `429` with `Retry-After` header when exceeded.
