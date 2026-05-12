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

### PATCH /users/profile
**Auth required.** Partial update.
**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "household_income_monthly_after_tax": 90000,
  "household_size": 5,
  "number_of_dependants": 3,
  "is_business_owner": true,
  "primary_language": "en",
  "timezone": "SAST"
}
```
All fields optional. Missing fields untouched. `email` is not editable here (separate flow not in Phase 5).
**Response 200:** the full profile (same shape as GET).
**Errors:** 400 `VALIDATION_ERROR`.

### GET /users/dashboard (Phase 5)
**Auth required.** One-shot aggregator for the dashboard view.
**Response 200:**
```json
{
  "current_stage": "Freedom",
  "current_stage_details": {
    "name": "Freedom",
    "description": "Mostly debt-free; consistently investing 20%+ of income.",
    "income_runway": "3-12 months",
    "progress_to_next_stage_pct": 45,
    "next_stage": "Independence"
  },
  "overall_progress": {
    "framework_completion_pct": 33,
    "steps_completed": 2,
    "steps_total": 6,
    "current_focus_step": "3",
    "next_step": { "step_number": "3", "title": "Money Matrix" }
  },
  "recommended_actions": [
    {
      "priority": "high",
      "title": "Complete the Net Worth Statement (Appendix B)",
      "reason": "Foundation for Step 3 — Money Matrix.",
      "action_url": "/worksheets/APP-B",
      "estimated_time_minutes": 45,
      "source": "stage_gap"
    }
  ],
  "recent_activity": [
    {
      "event_type": "assessment_submitted",
      "title": "Completed 10Q assessment — placed at Freedom",
      "timestamp": "2026-05-12T10:30:00Z",
      "link": "/assessments/results/uuid"
    }
  ],
  "upcoming_milestones": [
    {
      "code": "monthly_money_conversation",
      "title": "Monthly Money Conversation",
      "due_date": "2026-05-31",
      "category": "review",
      "urgency": "soon"
    }
  ],
  "quick_stats": {
    "net_worth": 2600000,
    "monthly_surplus": 5000,
    "total_consumer_debt": 0,
    "income_generating_pct": 46.2
  }
}
```

Field rules:
- `current_stage` / `current_stage_details`: null when no 5Q/10Q yet
- `progress_to_next_stage_pct`: linear within the stage's score band (e.g. 10Q score 27 in Freedom band [24, 30] → (27-24)/(30-24)·100 = 50%)
- `recommended_actions[].source`: `"stage_gap"|"missing_worksheet"|"stale_review"|"high_priority_gap"|"first_step"` — for analytics
- `recommended_actions`: max 5, ordered by priority
- `recent_activity`: max 10, newest first
- `upcoming_milestones[].urgency`: `"overdue"|"soon"|"upcoming"` (within 7 days / within 30 days / later)
- `quick_stats.*`: null when the underlying worksheet hasn't been submitted

### GET /users/recommendations
Deeper view of recommendations + reading path + suggested content.
**Response 200:**
```json
{
  "current_stage": "Freedom",
  "immediate_actions": [ /* same shape as dashboard.recommended_actions */ ],
  "reading_path": [
    { "order": 1, "step_number": "3", "title": "Money Matrix", "status": "next" },
    { "order": 2, "step_number": "4a", "title": "Risk Cover — Households", "status": "upcoming" }
  ],
  "suggested_examples": [
    { "example_code": "WE-8", "title": "Hennie's Net Worth", "reason": "Illustrates Step 3's central question" }
  ],
  "suggested_worksheets": [
    { "worksheet_code": "APP-B", "title": "Net Worth Statement", "reason": "Required for Step 3" }
  ]
}
```

### Recommendation engine — rules

The engine composes signals into the action list. Apply rules in order; stop when 5 actions selected.

1. **No assessment yet** → ONE action: "Take the 5-Question Quick Assessment". Source `first_step`.
2. **Critical GAP test items** (any `no` on q1 will / q4 emergency fund / q5 life cover / q6 income protection from latest gap_test, taken within 90 days) → one action per critical item, source `high_priority_gap`. Stop after these.
3. **Stage-specific recommended worksheet** (from table below), if the user hasn't submitted it → source `missing_worksheet`.
4. **Stale annual review** (last APP-C / APP-B submission > 11 months ago) → "Refresh the annual review", source `stale_review`.
5. **Stage-specific next-step content**:
   - Foundation: complete Step 2 (Zero-Based Budget)
   - Momentum: take GAP test if none in 90 days; complete Step 4a (Risk Cover)
   - Freedom: complete Step 6 (Investment) optimisation
   - Independence: estate planning (APP-F)
   - Abundance: succession planning content
   Source `stage_gap`.
6. **Backfill** with "Continue Step N" where N is the user's `current_focus_step` (or step 1 if none).

Stage → recommended worksheet baseline:
| Stage | Worksheet |
|---|---|
| Foundation | APP-A (Zero-Based Budget) |
| Momentum | APP-D (Debt Disclosure) → then APP-C (Risk Cover Review) |
| Freedom | APP-B (Net Worth Statement) |
| Independence | APP-F (attooh! Life File) |
| Abundance | APP-F refresh + advisor review |

### GET /users/progress
**Auth required.**
**Response 200:**
```json
{
  "overall_completion_pct": 35,
  "steps_completed": 2,
  "steps_total": 7,
  "current_focus_step": "3",
  "steps": [
    {
      "step_number": "1",
      "title": "Financial GPS",
      "is_completed": true,
      "completed_at": "2026-04-15T10:00:00Z",
      "time_spent_minutes": 92
    },
    {
      "step_number": "2",
      "title": "Zero-Based Budget",
      "is_completed": true,
      "completed_at": "2026-04-20T15:30:00Z",
      "time_spent_minutes": 110
    },
    {
      "step_number": "3",
      "title": "Money Matrix",
      "is_completed": false,
      "completed_at": null,
      "time_spent_minutes": 0
    }
  ]
}
```

A `user_progress` row is upserted on first call if absent. `time_spent_minutes` is best-effort (Phase 5 may return 0 for all steps; instrumented in Phase 6).

**`steps_total` is conditional on `is_business_owner`:**
- `is_business_owner: false` → `steps_total: 6`, the `steps[]` array excludes step `4b`
- `is_business_owner: true` → `steps_total: 7`, the `steps[]` array includes step `4b`

`overall_completion_pct` uses the conditional denominator. Rounding: half-up (`floor(x + 0.5)`), so 1/6 → 17%, 1/7 → 14%.

`current_focus_step` auto-advances to the next incomplete step when a step is completed via POST. There is no explicit setter endpoint in Phase 5 — if the user wants to revisit an earlier step, they can navigate freely via the framework UI; the focus only auto-advances on completion.

`stage_changed` events in the activity feed are emitted on ANY adjacent-stage difference (upward AND downward — regressions are meaningful information for the user).

### POST /users/progress/steps/{step_number}/complete
**Auth required.** Marks the step complete; sets `completed_at = now`.
**Response 200:** the full progress object (same shape as GET).
**Errors:** 400 if `step_number` invalid.

### POST /users/progress/steps/{step_number}/incomplete
Undo. **Response 200:** same shape.

### GET /users/activity
**Auth required.** Cursor-paginated activity feed.
**Query params:** `limit` (default 20, max 100), `cursor` (opaque, omit for first page)
**Response 200:**
```json
{
  "events": [
    {
      "event_type": "assessment_submitted",
      "title": "Completed 10Q assessment — placed at Freedom",
      "details": { "assessment_id": "uuid", "stage": "Freedom", "score": 28 },
      "timestamp": "2026-05-12T10:30:00Z",
      "link": "/assessments/results/uuid"
    },
    {
      "event_type": "worksheet_submitted",
      "title": "Submitted Zero-Based Budget — 71/8/21 split",
      "details": { "worksheet_id": "uuid", "worksheet_code": "APP-A" },
      "timestamp": "2026-05-12T10:25:00Z",
      "link": "/worksheets/results/uuid"
    }
  ],
  "next_cursor": "opaque-string",
  "has_more": true
}
```

Event types (Phase 5): `assessment_submitted`, `worksheet_submitted`, `step_completed`, `stage_changed`.

`stage_changed` is derived (consecutive 5Q/10Q assessments where calculated_stage differs) — never stored, computed on read.

Per-event `details` shape:
- `assessment_submitted`: `{ assessment_id, assessment_type, stage, score }` (stage is null for gap_test)
- `worksheet_submitted`: `{ worksheet_id, worksheet_code }`
- `step_completed`: `{ step_number }`
- `stage_changed`: `{ from_stage, to_stage, assessment_id }`. The FE derives direction (up/down/same) from `from_stage` + `to_stage` against the canonical stage order — backend does NOT emit a `direction` field.

Aggregations like calculator use are out of scope for Phase 5.

### GET /users/milestones
Standalone endpoint when the dashboard summary isn't enough.
**Response 200:**
```json
{
  "achieved": [
    { "code": "first_assessment", "title": "First assessment completed", "date": "2026-01-15T10:00:00Z" },
    { "code": "stage_progression", "title": "Moved from Foundation → Momentum", "date": "2026-03-20T10:00:00Z" }
  ],
  "upcoming": [
    { "code": "monthly_money_conversation", "title": "Monthly Money Conversation", "due_date": "2026-05-31", "category": "review", "urgency": "soon" },
    { "code": "annual_cover_review", "title": "Annual cover review", "due_date": "2026-12-15", "category": "review", "urgency": "upcoming" }
  ]
}
```

Milestone codes (Phase 5):
- `first_assessment`, `first_worksheet`, `stage_progression`, `framework_step_completed` (per step), `worksheet_streak_3` (3 in a month)
- Upcoming: `monthly_money_conversation` (last day of each month), `annual_cover_review` (12mo after last APP-C OR today+30 if none), `annual_net_worth_review` (12mo after last APP-B), `quarterly_assessment_refresh` (3mo after last 5Q/10Q)

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

The prompts below are **reference text** — they define the question intent and answer mapping. The frontend may polish wording for readability so long as: (a) the `qN` keys are unchanged, (b) the option values (`a/b/c/d` for 5Q/10Q, `yes/partially/no` for GAP) are unchanged, and (c) the intent of each option remains the same. The backend is authoritative for scoring; it must accept the values exactly as listed.

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

## Content Endpoints (Phase 3)

All require Bearer auth. Content is seeded (read-only for v1) — there is no POST/PATCH/DELETE.

Source content lives in `/Users/cornels/Downloads/files/wealth_index.md`. Backend authors the seed in `content_metadata` and a sibling table for example detail fields (see Phase 3 backend prompt for schema decisions).

### Stage and step identifiers

- **Stage**: `"Foundation" | "Momentum" | "Freedom" | "Independence" | "Abundance"`
- **Step number**: string, one of `"1" | "2" | "3" | "4a" | "4b" | "5" | "6"` (string so 4a/4b stay first-class)

### Calculator types

Phase 3 defines 4 calculator types. Each example has `calculator_type: <type> | null`.

#### compound_interest
**Input:**
```json
{
  "monthly_contribution": 5000,
  "initial_amount": 0,
  "years": 25,
  "annual_rate_pct": 10,
  "withdrawal_rate_pct": 4
}
```
- `monthly_contribution`: number ≥ 0
- `initial_amount`: number ≥ 0 (default 0)
- `years`: integer 1–60
- `annual_rate_pct`: number 0–25 (typical 2–15)
- `withdrawal_rate_pct`: number 0–10 (default 4, used to compute monthly_passive_income)

**Output:**
```json
{
  "final_amount": 6400000,
  "total_contributed": 1500000,
  "total_growth": 4900000,
  "monthly_passive_income": 21333.33,
  "year_by_year": [
    { "year": 1, "balance": 62800, "contributions_to_date": 60000, "growth_to_date": 2800 }
  ]
}
```
All monetary outputs are rounded to 2 decimal places; `year_by_year` has exactly `years` entries.

#### debt_analysis
**Input:**
```json
{
  "debts": [
    { "name": "Credit Card", "balance": 15000, "annual_rate_pct": 24, "minimum_payment": 750 },
    { "name": "Store Account", "balance": 8000, "annual_rate_pct": 28, "minimum_payment": 400 }
  ],
  "surplus_available": 2000,
  "method": "snowball"
}
```
- `debts`: array of 1–20; each entry's fields all required, all numeric ≥ 0
- `surplus_available`: number ≥ 0 — extra paid each month above sum-of-minimums
- `method`: `"snowball" | "avalanche" | "debtonator"`

**Output:**
```json
{
  "total_debt": 23000,
  "weighted_average_rate_pct": 25.4,
  "total_monthly_minimums": 1150,
  "debt_free_months": 11,
  "total_interest_paid": 2410.55,
  "payment_order": [
    { "name": "Store Account", "balance": 8000, "annual_rate_pct": 28, "expected_close_month": 5, "reason": "smallest balance first" }
  ],
  "monthly_projection": [
    { "month": 1, "total_balance": 21950, "interest_charged": 510, "accounts_remaining": 2 }
  ]
}
```

#### budget_allocator
**Input:**
```json
{ "income_monthly": 45000, "needs": 32000, "wants": 3500, "invest": 9500 }
```
All required, numbers ≥ 0.

**Output:**
```json
{
  "total_income": 45000,
  "total_allocated": 45000,
  "surplus_deficit": 0,
  "needs_pct": 71.1,
  "wants_pct": 7.8,
  "invest_pct": 21.1,
  "status": "balanced",
  "feedback": "Needs are 21 pts above the 50% target; consider reviewing bond affordability.",
  "target_comparison": [
    { "category": "needs",  "actual_pct": 71.1, "target_pct": 50, "status": "high" },
    { "category": "wants",  "actual_pct": 7.8,  "target_pct": 30, "status": "low" },
    { "category": "invest", "actual_pct": 21.1, "target_pct": 20, "status": "on_track" }
  ]
}
```
- `status`: `"balanced" | "deficit" | "surplus"` based on `total_income - total_allocated`
- Per-category status: `"low" | "on_track" | "high"` (on_track if within ±5 percentage points of target)

#### net_worth_analyzer
**Input:**
```json
{
  "lifestyle_assets":         [{ "name": "Primary home",    "value": 4500000 }],
  "income_generating_assets": [{ "name": "Retirement annuity", "value": 1200000 }],
  "liabilities":              [{ "name": "Bond", "value": 3100000 }]
}
```

**Output:**
```json
{
  "total_lifestyle_assets": 4500000,
  "total_income_generating_assets": 1200000,
  "total_assets": 5700000,
  "total_liabilities": 3100000,
  "net_worth": 2600000,
  "income_generating_pct_of_net_worth": 46.2,
  "interpretation": "46% of your net worth is income-generating. Healthy households target 60%+ over time."
}
```

### Calculator config input shapes

`calculator_config.inputs[]` entries use one of these shapes:

**Scalar (`number`, `text`, `select`):**
```json
{ "name": "years", "label": "Years", "type": "number", "default": 25,
  "min": 1, "max": 60, "step": 1, "format": "integer" }
```
- `format`: `"currency" | "integer" | "percent" | "decimal"` (number only)
- `options: string[]` required when `type: "select"`

**Array (`array`):** for table-style inputs like `debts`, `lifestyle_assets`, `liabilities`. Use `type: "array"`. `item_schema` is an **ordered array** of column definitions (so rendering order + labels are preserved):
```json
{
  "name": "debts",
  "label": "Debts",
  "type": "array",
  "min_items": 1,
  "max_items": 20,
  "item_schema": [
    { "name": "name",             "label": "Account",  "type": "text" },
    { "name": "balance",          "label": "Balance",  "type": "number", "format": "currency", "min": 0 },
    { "name": "annual_rate_pct",  "label": "Rate",     "type": "number", "format": "percent",  "min": 0, "max": 50 },
    { "name": "minimum_payment",  "label": "Minimum",  "type": "number", "format": "currency", "min": 0 }
  ],
  "default": [
    { "name": "Credit Card", "balance": 30000, "annual_rate_pct": 24, "minimum_payment": 1500 }
  ]
}
```
The contract uses `type: "array"`, NOT `type: "list"`. `item_schema` is an array, NOT an object map.

### Compound interest semantics

The `compound_interest` calculator uses **nominal monthly compounding throughout** (the textbook formula `FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]` with `r = annual_rate_pct/100/12`, `n = years × 12`). Some book examples in `wealth_index.md` quote figures that imply annual compounding during idle phases (e.g. WE-4's R11.06M for Nomvula's 25-year idle phase) or real returns rather than nominal (e.g. WE-6's R1.9M implies ~6% effective). These book figures are **illustrative approximations**, not exact targets — calculator output may diverge by 5–25%. The `educational_text` for each affected example should disclose the difference.

### Debtonator™ implementation

The `debtonator` method is implemented as **avalanche with the highest-rate debt's effective rate capped at prime (10.25%)** — a simplified model of the access-bond mechanic described in `wealth_index.md` WE-12. Captures the headline saving without modelling daily-interest accrual or partial-draw cashflows. A higher-fidelity model is out of scope for Phase 3.

### Examples with `calculator_type: null`

Not every worked example has an interactive calculator. WE-9 (Vitality), WE-10 (Section 11F tax relief — deferred), and WE-13 (Bond date-change trick — daily-interest mechanic doesn't fit the month-step debt simulator faithfully) are descriptive-only in Phase 3. The frontend should render the description + `educational_text` and omit the calculator block.

### GET /content/framework
**Response 200:**
```json
{
  "steps": [
    {
      "step_number": "1",
      "title": "Financial GPS",
      "subtitle": "Know your position",
      "description": "...",
      "key_metrics": ["Current stage", "Destination"],
      "time_estimate_minutes": 90,
      "stage_relevance": ["Foundation", "Momentum", "Freedom", "Independence", "Abundance"],
      "related_example_codes": ["WE-1"],
      "related_worksheet_codes": ["APP-B", "APP-G"]
    }
  ]
}
```
Ordering: `"1", "2", "3", "4a", "4b", "5", "6"`. `related_worksheet_codes` is forward-looking metadata for Phase 4; FE may render as placeholders.

### GET /content/steps/{step_number}
Single step; same shape as one entry in `framework.steps` plus an optional long-form `body_markdown` field for narrative content.
**Errors:** 404 `NOT_FOUND` for unknown step_number.

### GET /content/examples
**Query params (all optional):**
- `step_number`: `"1" | "2" | ... | "6"`
- `stage`: one of the 5 stage strings
- `calculator_type`: one of the 4 calc types
- `has_calculator`: `true | false`
- `q`: free-text search (matches title, summary, key_principle, keywords)

**Response 200:**
```json
{
  "examples": [
    {
      "example_code": "WE-3",
      "title": "R5k/month for 25 years",
      "step_number": "6",
      "chapter": "Step 6: Investment",
      "calculator_type": "compound_interest",
      "stage_relevance": ["Foundation", "Momentum", "Freedom"],
      "key_principle": "Magic of consistent monthly saving + time horizon.",
      "summary": "Age 35→60, 10% p.a. → R6.4m at retirement; R21.3k/month passive (4% rule)."
    }
  ],
  "total": 13
}
```
List view; no calculator config. Use the detail endpoint for that.

### GET /content/examples/{example_code}
**Response 200:**
```json
{
  "example_code": "WE-3",
  "title": "R5k/month for 25 years",
  "step_number": "6",
  "chapter": "Step 6: Investment",
  "description": "Long-form description of the scenario.",
  "key_principle": "Magic of consistent monthly saving + time horizon.",
  "key_takeaway": "Time horizon beats contribution amount.",
  "educational_text": "Markdown-formatted teaching content.",
  "stage_relevance": ["Foundation", "Momentum", "Freedom"],
  "calculator_type": "compound_interest",
  "calculator_config": {
    "inputs": [
      { "name": "monthly_contribution", "label": "Monthly contribution (R)", "type": "number", "default": 5000, "min": 0, "max": 100000, "step": 500, "format": "currency" },
      { "name": "years", "label": "Years", "type": "number", "default": 25, "min": 1, "max": 60, "step": 1, "format": "integer" },
      { "name": "annual_rate_pct", "label": "Annual growth rate (%)", "type": "number", "default": 10, "min": 0, "max": 25, "step": 0.5, "format": "percent" }
    ],
    "interpretation_template": "At R{monthly_contribution}/month for {years} years at {annual_rate_pct}% growth, you accumulate R{final_amount}, generating R{monthly_passive_income}/month in passive income."
  },
  "related_example_codes": ["WE-4", "WE-5", "WE-6"]
}
```
- `calculator_config` is present iff `calculator_type` is non-null.
- `inputs[].format`: `"currency" | "integer" | "percent" | "decimal"` — UI rendering hint.
- `interpretation_template` placeholders are output keys formatted per the field's expected format on the frontend.
**Errors:** 404 `NOT_FOUND`.

### POST /content/examples/{example_code}/calculate
**Auth required.** Body matches the input shape of the example's `calculator_type`.
**Response 200:**
```json
{
  "example_code": "WE-3",
  "calculator_type": "compound_interest",
  "inputs": { "monthly_contribution": 5000, "years": 25, "annual_rate_pct": 10, "initial_amount": 0, "withdrawal_rate_pct": 4 },
  "outputs": { /* output shape per calculator_type */ },
  "interpretation": "At R5,000/month for 25 years at 10% growth, you accumulate R6,400,000..."
}
```
- `inputs` echoes the (validated, defaulted) inputs back so the FE can render exactly what was computed.
- `interpretation` is the template filled with formatted values.
**Errors:** 400 `VALIDATION_ERROR`, 404 `NOT_FOUND` if example has `calculator_type: null` or doesn't exist, 401.

The calculate endpoint records an `example_interactions` row (per DATABASE_SCHEMA.md) for analytics.

### GET /content/case-studies
**Query params (all optional):** `stage`, `step_number`, `q`.
**Response 200:**
```json
{
  "case_studies": [
    {
      "study_code": "CS-001",
      "name": "Susan & Johan",
      "summary": "R85k/month → found R90k invisible monthly drain.",
      "learning": "Started with honest number; built 20-year plan to independence.",
      "stage_relevance": ["Foundation", "Momentum"],
      "related_step_numbers": ["1"]
    }
  ],
  "total": 15
}
```

### GET /content/case-studies/{study_code}
**Response 200:**
```json
{
  "study_code": "CS-001",
  "name": "Susan & Johan",
  "age_band": "Multiple",
  "income_monthly": 85000,
  "situation": "Long-form description of where the household started.",
  "learning": "What changed and why.",
  "key_insight": "One-line takeaway.",
  "stage_relevance": ["Foundation", "Momentum"],
  "related_step_numbers": ["1"],
  "related_example_codes": ["WE-1"]
}
```
- `income_monthly`: number or null
- `age_band`: short string ("34/32", "Senior/40s", "Multiple"...) — preserves source text from the book.
**Errors:** 404 `NOT_FOUND`.

---

## Decimal serialization (carryover fix)

All monetary fields (`household_income_monthly_after_tax`, all `total_*`/`balance` numeric outputs, etc.) MUST serialize as JSON numbers, not strings. Backend Phase 2 currently emits `"85000.00"` from `Decimal` columns — fix in Phase 3 by adding a Pydantic v2 serializer that coerces `Decimal → float` for response models.

---

## Worksheet Endpoints (Phase 4)

All require Bearer auth. Worksheets are user-data forms with backend validation and calculation. Each submission inserts a row into `worksheet_responses` (per DATABASE_SCHEMA.md). Drafts (`is_draft: true`) are autosaved as the user types; submits (`is_draft: false`) trigger validation and calculation.

### Worksheet codes

- `APP-A` — Zero-Based Budget
- `APP-B` — Net Worth Statement
- `APP-C` — Risk Cover Review Checklist
- `APP-D` — Debt Disclosure
- `APP-E` — Monthly Money Review Agenda
- `APP-F` — attooh! Life File (estate documentation)
- `APP-G` — 10-Question Self-Assessment *(already wired via /assessments/10q; the worksheet variant just persists the same questions as a fillable, draftable form. Use the existing assessment endpoint for submission. Listed here for completeness.)*

### GET /worksheets
List worksheet catalogue (metadata only; no user data).
**Response 200:**
```json
{
  "worksheets": [
    {
      "worksheet_code": "APP-A",
      "title": "Zero-Based Budget",
      "description": "Every rand has a job. Income − (Needs + Wants + Invest) = R0.",
      "related_step_number": "2",
      "related_example_codes": ["WE-7"],
      "estimated_time_minutes": 30,
      "has_calculator": true
    }
  ],
  "total": 7
}
```

### GET /worksheets/{worksheet_code}
Single worksheet schema (form definition) — no user data.
**Response 200:**
```json
{
  "worksheet_code": "APP-A",
  "title": "Zero-Based Budget",
  "description": "...",
  "sections": [
    {
      "name": "income",
      "label": "Income",
      "fields": [
        { "name": "salary_1", "label": "Salary (primary earner)", "type": "number", "format": "currency", "min": 0 },
        { "name": "salary_2", "label": "Salary (secondary)", "type": "number", "format": "currency", "min": 0 }
      ]
    },
    {
      "name": "needs",
      "label": "Needs",
      "fields": [
        { "name": "bond", "label": "Bond / rent", "type": "number", "format": "currency", "min": 0 },
        { "name": "utilities", "label": "Utilities", "type": "number", "format": "currency", "min": 0 }
      ]
    }
  ]
}
```
- Section fields use the same scalar shapes as `calculator_config.inputs` (`type: number|text|select`).
- Some worksheets use `type: array` at the section level (e.g. APP-D Debt Disclosure has one section `debts` whose `fields` is empty but the section carries `item_schema` + `min_items`/`max_items`). Document any worksheet-specific shapes in the seed.

### POST /worksheets/{worksheet_code}/draft
Save (or overwrite) the user's current draft. Idempotent — at most one draft per (user, worksheet_code).
**Request:**
```json
{
  "response_data": { "income": { "salary_1": 45000 }, "needs": { "bond": 11000 } },
  "completion_percentage": 25
}
```
- `response_data`: free-form JSON; partial allowed
- `completion_percentage`: integer 0-100 (FE may compute and pass; backend re-derives on submit)

**Response 200:**
```json
{
  "worksheet_id": "uuid",
  "worksheet_code": "APP-A",
  "is_draft": true,
  "completion_percentage": 25,
  "updated_at": "2026-05-12T10:30:00Z"
}
```

### POST /worksheets/{worksheet_code}/submit
Submit final response. Validates against worksheet schema, runs the calculation (if any), persists as a non-draft row, deletes the matching draft.
**Request:** same shape as `/draft` (full `response_data`).
**Response 201:**
```json
{
  "worksheet_id": "uuid",
  "worksheet_code": "APP-A",
  "is_draft": false,
  "completion_percentage": 100,
  "calculated_values": {
    "total_income": 45000,
    "total_needs": 32000,
    "total_wants": 3500,
    "total_invest": 9500,
    "surplus_deficit": 0,
    "needs_pct": 71.1,
    "wants_pct": 7.8,
    "invest_pct": 21.1,
    "status": "balanced"
  },
  "feedback": {
    "status": "needs_attention",
    "message": "Needs at 71.1% exceeds the 50% target by 21.1 pts.",
    "recommendations": [
      "Review bond affordability or refinance options",
      "Audit recurring subscriptions and discretionary fixed costs"
    ]
  },
  "created_at": "2026-05-12T10:30:00Z"
}
```
- `feedback.status`: `"on_track" | "needs_attention" | "critical"`
- `calculated_values` shape varies per worksheet (documented in the worksheet catalogue's `calculated_schema` field)
- For worksheets without a calculator (APP-C, APP-E, APP-F): `calculated_values: null`, `feedback` describes completion-based status only.
**Errors:** 400 `VALIDATION_ERROR` (missing required fields, out-of-range numbers, etc.), 404 `NOT_FOUND` for unknown worksheet_code.

### GET /worksheets/{worksheet_code}/latest
Returns the user's most recent submission OR draft for this worksheet (whichever is newer).
**Response 200:**
```json
{
  "worksheet_id": "uuid",
  "worksheet_code": "APP-A",
  "is_draft": false,
  "response_data": { /* ... */ },
  "calculated_values": { /* ... */ },
  "feedback": { /* ... */ },
  "completion_percentage": 100,
  "created_at": "2026-05-12T10:30:00Z",
  "updated_at": "2026-05-12T10:30:00Z"
}
```
**Response 204:** No content (user has neither submitted nor drafted this worksheet).

### GET /worksheets/{worksheet_code}/history
**Response 200:**
```json
{
  "worksheet_code": "APP-A",
  "submissions": [
    { "worksheet_id": "uuid", "completion_percentage": 100, "calculated_values_summary": { "surplus_deficit": 0, "needs_pct": 71.1 }, "created_at": "2026-05-12T10:30:00Z" }
  ]
}
```
- `submissions`: completed (non-draft) only, newest first
- `calculated_values_summary`: 2-4 headline values per worksheet (defined in seed)

### Path-shape note: id-based vs code-based routes

To prevent a `{worksheet_code}` route from matching a UUID (or vice versa), id-based routes are namespaced under `/worksheets/submissions/`. The path-parameter type tells you which is which:

- `{worksheet_code}` matches the pattern `^APP-[A-G]$` (7 fixed values)
- `{worksheet_id}` matches a UUID v4

### GET /worksheets/submissions/{worksheet_id}
Owner-only. Returns a single submission (or draft) by id — used for deep-linking to results pages and refresh-after-submit flows.
**Response 200:**
```json
{
  "worksheet_id": "uuid",
  "worksheet_code": "APP-A",
  "is_draft": false,
  "response_data": { /* ... */ },
  "calculated_values": { /* ... */ },
  "feedback": { /* ... */ },
  "completion_percentage": 100,
  "created_at": "2026-05-12T10:30:00Z",
  "updated_at": "2026-05-12T10:30:00Z"
}
```
**Errors:** 404 `NOT_FOUND` for both unknown ids and other-user ids (no enumeration).

### GET /worksheets/submissions/{worksheet_id}/export/{format}
- `format`: `"pdf" | "csv"`
- Returns the binary file with `Content-Disposition: attachment; filename=...`
- PDF generated server-side (ReportLab) using worksheet-specific templates
- CSV is a flat key/value of `response_data` + `calculated_values`
**Errors:** 404 `NOT_FOUND` if worksheet_id doesn't belong to user or doesn't exist (no enumeration), 400 if `is_draft: true` (cannot export drafts).

### response_data shape for array sections

Worksheets with `type: "array"` sections (e.g. APP-D Debt Disclosure) emit/accept the section as an array of row objects whose keys match the section's `item_schema[].name`. Example APP-D submit body:

```json
{
  "response_data": {
    "debts": [
      { "creditor": "Credit Card", "balance": 30000, "annual_rate_pct": 24, "minimum_payment": 1500, "account_type": "credit_card" },
      { "creditor": "Store Card",  "balance":  8000, "annual_rate_pct": 28, "minimum_payment":  400, "account_type": "store_account" }
    ]
  },
  "completion_percentage": 100
}
```

### Completion percentage algorithm

Both `/draft` (FE-computed) and `/submit` (BE-recomputed) MUST use the same algorithm so progress badges and submission percentages agree:

1. Enumerate all leaf fields across all sections from the schema. A scalar section field counts as one leaf. An array section counts as one leaf that is "filled" when the row count is ≥ `min_items` (default 1) AND every row has all its `item_schema` fields non-empty.
2. A scalar leaf is "filled" if its value is non-null AND (for `type: number`) is a finite number AND (for `type: text` or `type: select`) is a non-empty string.
3. `completion_percentage = round(100 × filled_leaves / total_leaves)`.

Fields marked `optional: true` in the schema are excluded from the denominator. (Default is required.)

### feedback.status for non-calculator worksheets

APP-E and APP-F (text-only worksheets) derive `feedback.status` purely from completion:
- `completion_percentage == 100` → `on_track`
- `50 ≤ completion_percentage < 100` → `needs_attention`
- `completion_percentage < 50` → `critical`

**APP-C uses content-aware status** (the checklist answers carry meaning):
- Any `no` on a critical item (life cover, income protection, will/estate) → `critical`
- Any other `no` → `needs_attention`
- All items answered (`yes`/`partial`/`na`) with no remaining `no` → `on_track`

`feedback.recommendations` lists the unchecked critical items (APP-C) or the incomplete section labels (APP-E/F).

### completion_percentage authority

The backend is the single source of truth. Both `/draft` and `/submit` re-derive `completion_percentage` server-side using the algorithm above. The FE MAY pass a `completion_percentage` value on `/draft` as an optimistic hint, but the BE replaces it with the recomputed value in the response. This guarantees the catalogue badge ("Draft 65% saved") and the form's live progress bar agree.

### APP-G (self-assessment) — out-of-band submission

APP-G appears in the worksheet catalogue and supports `GET /worksheets/APP-G` (schema) for completeness. However, **`POST /worksheets/APP-G/submit` returns 400 with `code: "USE_ASSESSMENTS_ENDPOINT"`** — APP-G's submissions land in the `assessments` table via `POST /assessments/10q`, not in `worksheet_responses`. The FE should redirect to `/assessments/10q` on encountering this code. Drafts (`POST /worksheets/APP-G/draft`) and `GET /worksheets/APP-G/latest|history` operate normally but only ever return draft state — there's never a completed APP-G `worksheet_response` row.

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
