# Phase 1 API Contract — SOURCE OF TRUTH

**Both backend and frontend agents MUST conform to this contract.**
**If you need to deviate, stop and flag it — do NOT silently change shape.**

Base URL (local dev): `http://localhost:8000`
All request/response bodies are JSON unless noted.
All authenticated endpoints expect: `Authorization: Bearer <access_token>`.

---

## Conventions

- All timestamps ISO 8601 UTC with explicit `Z` suffix: `2026-05-12T10:30:00Z`. Fractional seconds optional but tz designator is required. Backend must emit tz-aware UTC datetimes (e.g. `datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")`).
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
**Errors:** 401 `INVALID_CREDENTIALS`, 429 rate-limited

**Unverified email policy:** Login SUCCEEDS for unverified users (200 with full token pair). The response `user.email_verified` flag tells the UI whether to render a "please verify" banner. There is NO 403 path for unverified login in Phase 1. Endpoints that require verification (added in later phases) will return 403 `EMAIL_NOT_VERIFIED` themselves.

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

## User Endpoints

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
  "current_stage": "Freedom",
  "latest_assessment_id": "uuid",
  "created_at": "2026-05-12T10:30:00Z"
}
```
- `current_stage`: string | null — stage from most recent 5Q or 10Q (null if user has never taken one)
- `latest_assessment_id`: string | null — most recent assessment of any type (null if none)

---

## Assessment Endpoints (Phase 2)

All require Bearer auth. Each submission inserts a new row in `assessments` (no overwrites). History preserved.

### Scoring tables

**5Q / 10Q letter → points:** `a=1, b=2, c=3, d=4`

**5Q stage bands (total 5-20):**
- 5-8 → `Foundation`
- 9-12 → `Momentum`
- 13-16 → `Freedom`
- 17-20 → `Independence`

**10Q stage bands (total 10-40):**
- 10-16 → `Foundation`
- 17-23 → `Momentum`
- 24-30 → `Freedom`
- 31-36 → `Independence`
- 37-40 → `Abundance`

**GAP Test value → points:** `no=0, partially=1, yes=2`

**GAP Test bands (total 0-24):**
- 20-24 → `solid_plan`
- 13-19 → `meaningful_gaps`
- 0-12 → `wide_gaps`

### Question catalogue

**5Q (also Q1-Q5 of 10Q):**
1. **q1** — *If both earners stopped today, how long could you maintain current lifestyle?* — a: <1mo · b: 1-3mo · c: 3-12mo · d: indefinite (passive covers)
2. **q2** — *How is your household budget structured?* — a: none · b: rough mental tally · c: written · d: zero-based
3. **q3** — *State of your consumer debt (credit cards, store accounts, personal loans)?* — a: not tracked · b: >15% of income · c: <15% and reducing · d: zero
4. **q4** — *6+ months of income protection (insurance + cash reserves)?* — a: none · b: partial · c: in place · d: in place + passive income
5. **q5** — *% of net worth that is income-generating (excludes home, cars, contents)?* — a: <10% · b: 10-30% · c: 30-60% · d: >60%

**Additional Q6-Q10 for 10Q:**
6. **q6** — *Will status?* — a: none · b: >5yr old · c: <5yr old · d: reviewed in last 12mo
7. **q7** — *TFSA usage?* — a: none · b: irregular · c: consistent, below cap · d: maxed for the couple
8. **q8** — *Section 11F retirement (27.5%, capped R350k)?* — a: none · b: employer only · c: partial · d: optimised
9. **q9** — *Last insurance cover review (life/disability/income protection)?* — a: >3yr · b: 2-3yr · c: 1-2yr · d: <12mo
10. **q10** — *Last Net Worth Statement produced?* — a: never · b: >5yr · c: 1-2yr · d: annually

**GAP Test (12 items, each `yes`/`partially`/`no`):**
1. **q1** — *Current will signed within last 3 years*
2. **q2** — *Known monthly surplus to within R5,000 accuracy*
3. **q3** — *Monthly Money Conversation in last 30 days*
4. **q4** — *Emergency fund equal to 3-6 months of expenses*
5. **q5** — *Life cover sized for debt + 10-15yr income replacement*
6. **q6** — *Income protection (monthly benefit) in place*
7. **q7** — *Short-term insurance reviewed in last 12mo (with 2+ quotes)*
8. **q8** — *TFSA maxed (R36k per person this tax year)*
9. **q9** — *Section 11F retirement contribution optimised (27.5%)*
10. **q10** — *Bucket 3 "Dream Fund" held in a separate, named account*
11. **q11** — *Business owner: key-person & buy-and-sell cover current — answer `yes` if not a business owner*
12. **q12** — *Annual cover review with an advisor in last 12mo*

### POST /assessments/5q
**Request:**
```json
{
  "responses": { "q1": "c", "q2": "d", "q3": "b", "q4": "a", "q5": "c" },
  "completion_time_seconds": 95
}
```
- All 5 keys required, each value `a|b|c|d`
- `completion_time_seconds`: optional non-negative integer

**Response 201:**
```json
{
  "assessment_id": "uuid",
  "assessment_type": "5q",
  "total_score": 13,
  "calculated_stage": "Freedom",
  "previous_stage": "Momentum",
  "stage_details": {
    "name": "Freedom",
    "income_runway": "3-12 months",
    "description": "Mostly debt-free; consistently investing 20%+ of income."
  },
  "recommendations": [
    "Complete the Net Worth Statement (Appendix B)",
    "Review TFSA and RA contributions",
    "Take the full 10-question assessment for deeper placement"
  ],
  "created_at": "2026-05-12T10:30:00Z"
}
```
- `previous_stage`: null if user has no prior 5Q/10Q
- `stage_details.description`: one-line stage summary (backend authors the strings)
- `recommendations`: 3-5 stage-specific bullets (backend authors)
**Errors:** 400 `VALIDATION_ERROR`, 401

### POST /assessments/10q
Same shape with `q1..q10`. Total 10-40. 5 stage bands.

### POST /assessments/gap-test
**Request:**
```json
{
  "responses": { "q1": "yes", "q2": "partially", "q3": "no", "q4": "no", "q5": "yes", "q6": "yes", "q7": "partially", "q8": "no", "q9": "no", "q10": "yes", "q11": "yes", "q12": "partially" },
  "completion_time_seconds": 240
}
```
**Response 201:**
```json
{
  "assessment_id": "uuid",
  "assessment_type": "gap_test",
  "total_score": 13,
  "band": "meaningful_gaps",
  "gaps_identified": [
    {
      "question_code": "q3",
      "title": "Monthly Money Conversation",
      "current_status": "no",
      "priority": "high",
      "recommendation": "Schedule a 30-minute Money Conversation with your partner this week (see Appendix E)."
    },
    {
      "question_code": "q2",
      "title": "Monthly surplus accuracy",
      "current_status": "partially",
      "priority": "medium",
      "recommendation": "Tighten budget tracking — aim to know surplus within R5,000 each month."
    }
  ],
  "advisor_recommendation": "Book a GAP Plan™ conversation",
  "gap_plan_eligible": true,
  "created_at": "2026-05-12T10:30:00Z"
}
```
- `band`: `solid_plan` | `meaningful_gaps` | `wide_gaps`
- `gap_plan_eligible`: true if total < 20 OR any answer is `no`
- `gaps_identified`: any `no` (priority `high`) or `partially` (priority `medium`) answer. `yes` excluded. Sorted: `no` first then `partially`, then by question number ascending.
- `recommendation` strings authored by backend, one per gap
- `advisor_recommendation`: `string | null` — ALWAYS present in the response object. Non-null when `gap_plan_eligible` is true; `null` otherwise. Never omitted.

### GET /assessments/history
**Response 200:**
```json
{
  "assessments": [
    { "assessment_id": "uuid", "assessment_type": "10q", "total_score": 28, "calculated_stage": "Freedom", "band": null, "created_at": "2026-05-12T10:30:00Z" },
    { "assessment_id": "uuid", "assessment_type": "gap_test", "total_score": 13, "calculated_stage": null, "band": "meaningful_gaps", "created_at": "2026-05-10T08:00:00Z" }
  ],
  "current_stage": "Freedom",
  "stage_progression": [
    { "stage": "Foundation", "score": 12, "date": "2026-01-15T08:00:00Z" },
    { "stage": "Momentum", "score": 18, "date": "2026-03-20T08:00:00Z" },
    { "stage": "Freedom", "score": 28, "date": "2026-05-12T10:30:00Z" }
  ]
}
```
- `assessments`: all submissions for the user, newest first, all types. Every entry includes BOTH `calculated_stage` and `band` keys — exactly one is non-null per row (`calculated_stage` for 5Q/10Q; `band` for gap_test). Keys are always present so the frontend can discriminate without re-fetching.
- `current_stage`: most recent 5Q or 10Q `calculated_stage`. null if none.
- `stage_progression`: one entry per 5Q/10Q submission, oldest first. Verbatim audit trail — consecutive same-stage submissions are NOT deduplicated (useful for charting velocity/regression). gap_test submissions are excluded from this array.

### GET /assessments/{assessment_id}
Owner-only.
**Response 200:** full submission including raw `responses`, score, stage/band, `gaps_identified` (for gap test), `recommendations`, `completion_time_seconds`, `created_at`.
**Errors:** 404 `NOT_FOUND` for either non-existent or other-user IDs (no enumeration).

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
