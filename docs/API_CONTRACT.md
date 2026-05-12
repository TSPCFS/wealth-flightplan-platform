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
