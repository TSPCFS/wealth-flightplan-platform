"""Authored content for stage descriptions and GAP recommendations.

Single source of truth so tests can assert against these strings directly.
"""

from __future__ import annotations

# ---------------------------------------------------------------------------
# Stage band tables: keep aligned with docs/API_CONTRACT.md
# ---------------------------------------------------------------------------

STAGES_5Q: tuple[tuple[int, int, str], ...] = (
    (5, 8, "Foundation"),
    (9, 12, "Momentum"),
    (13, 16, "Freedom"),
    (17, 20, "Independence"),
)

STAGES_10Q: tuple[tuple[int, int, str], ...] = (
    (10, 16, "Foundation"),
    (17, 23, "Momentum"),
    (24, 30, "Freedom"),
    (31, 36, "Independence"),
    (37, 40, "Abundance"),
)

GAP_BANDS: tuple[tuple[int, int, str], ...] = (
    (0, 12, "wide_gaps"),
    (13, 19, "meaningful_gaps"),
    (20, 24, "solid_plan"),
)


# ---------------------------------------------------------------------------
# Stage details: description + income_runway label
# ---------------------------------------------------------------------------

STAGE_DESCRIPTIONS: dict[str, str] = {
    "Foundation": ("The starting line. Establishing baseline numbers and building a buffer."),
    "Momentum": "The foundation is in. Moving in the right direction.",
    "Freedom": "Mostly debt-free; consistently investing 20%+ of income.",
    "Independence": ("Passive income covers lifestyle; bond is the only remaining debt."),
    "Abundance": ("Passive income exceeds lifestyle; focus on legacy and generational wealth."),
}

STAGE_INCOME_RUNWAY: dict[str, str] = {
    "Foundation": "less than 1 month",
    "Momentum": "1-3 months",
    "Freedom": "3-12 months",
    "Independence": "indefinite from passive income",
    "Abundance": "indefinite (passive >> lifestyle)",
}


# ---------------------------------------------------------------------------
# Stage recommendations (3-5 bullets each)
# ---------------------------------------------------------------------------

STAGE_RECOMMENDATIONS: dict[str, tuple[str, ...]] = {
    "Foundation": (
        "Complete the Zero-Based Budget worksheet (Appendix A).",
        "Fill in the Debt Disclosure worksheet (Appendix D): every account, balance, and rate.",
        "Build a R1,000 starter buffer, then grow it to 1 month of essential expenses.",
        "Schedule your first Monthly Money Conversation (Appendix E).",
        "Take the full 10-question assessment for a sharper stage placement.",
    ),
    "Momentum": (
        "Take the GAP Test to pinpoint your top three gaps.",
        "Review insurance cover end-to-end (Appendix C: Risk Cover Review).",
        "Start or expand a TFSA: direct R3,000/month per adult.",
        "Complete the Net Worth Statement (Appendix B) to baseline your assets.",
        "Build emergency fund toward 3-6 months of household expenses.",
    ),
    "Freedom": (
        "Refresh the Net Worth Statement (Appendix B), at least annually.",
        "Optimise Section 11F retirement contributions toward the 27.5% / R350k cap.",
        "Establish a Bucket 3 Dream Fund in a separately-named account.",
        "Run an annual cover review (Appendix C) with quotes from 2+ providers.",
        "Consider next layer: rental property or offshore allocation.",
    ),
    "Independence": (
        "Book your annual advisor review of cover + investments.",
        "Finalise estate planning + the attooh! Life File (Appendix F).",
        "Optimise tax structures: trust, offshore allocation, business stake.",
        "Model years-to-Abundance based on current passive income trajectory.",
    ),
    "Abundance": (
        "Build out generational wealth and succession planning.",
        "Formalise a charitable giving structure (foundation, donor-advised fund).",
        "Bring the next generation into the annual Money Conversation.",
        "Review trust + offshore structures with your advisor each year.",
    ),
}


# ---------------------------------------------------------------------------
# GAP Test: question titles + per-question recommendations
# ---------------------------------------------------------------------------

GAP_QUESTION_TITLES: dict[str, str] = {
    "q1": "Current Will",
    "q2": "Monthly Surplus Accuracy",
    "q3": "Monthly Money Conversation",
    "q4": "Emergency Fund",
    "q5": "Life Cover",
    "q6": "Income Protection",
    "q7": "Short-Term Insurance Review",
    "q8": "TFSA Optimisation",
    "q9": "Retirement (Section 11F)",
    "q10": "Bucket 3 Dream Fund",
    "q11": "Business Owner Cover",
    "q12": "Annual Advisor Review",
}


# Recommendation when a GAP question is answered "no".
GAP_RECOMMENDATIONS_NO: dict[str, str] = {
    "q1": "Draft or update your will; have it signed and witnessed within 30 days.",
    "q2": "Tighten budget tracking: aim to know your surplus within R5,000 each month.",
    "q3": "Schedule a 30-minute Monthly Money Conversation with your partner this week (Appendix E).",
    "q4": "Build 3-6 months of household expenses in an access bond or money market account.",
    "q5": "Review life cover: target 10-15x annual income plus debt clearance.",
    "q6": "Put income protection in place: monthly benefit >=75% of salary.",
    "q7": "Review short-term insurance: get 2+ quotes; cost target 1.5-2.5% of gross household income.",
    "q8": "Direct R3,000/month per adult into TFSAs to max the R36k annual cap.",
    "q9": "Increase retirement contributions toward the 27.5% Section 11F cap (capped R350k/yr).",
    "q10": "Open a separately-named account for Bucket 3 dream goals (5-10yr horizon).",
    "q11": "If you own a business: arrange key-person + buy-and-sell cover with a qualified broker.",
    "q12": "Book an annual cover review with a financial advisor: full Appendix C audit.",
}


# Softened wording when the answer is "partially": same target, but framed
# as a tightening exercise rather than a fresh start.
GAP_RECOMMENDATIONS_PARTIALLY: dict[str, str] = {
    "q1": "Refresh your will: review beneficiaries and re-sign within the next 3 months.",
    "q2": "Sharpen surplus tracking until you can predict it within R5,000 each month.",
    "q3": "Lock the Monthly Money Conversation into a calendar slot you both keep.",
    "q4": "Top up the emergency fund until it covers 3-6 months of household expenses.",
    "q5": "Re-quote life cover and confirm it matches 10-15x annual income plus debt clearance.",
    "q6": "Verify income protection covers >=75% of salary and remains in force.",
    "q7": "Re-quote short-term insurance with 2+ providers within the next 90 days.",
    "q8": "Step TFSA contributions up to R3,000/month per adult to reach the R36k cap.",
    "q9": "Increase Section 11F contributions toward the 27.5% cap (R350k/yr).",
    "q10": "Move Bucket 3 dream-fund balances into a separately-named account.",
    "q11": "Refresh business cover (key-person + buy-and-sell) with your broker this year.",
    "q12": "Confirm the next annual cover review with your advisor (Appendix C audit).",
}


__all__ = [
    "GAP_BANDS",
    "GAP_QUESTION_TITLES",
    "GAP_RECOMMENDATIONS_NO",
    "GAP_RECOMMENDATIONS_PARTIALLY",
    "STAGES_10Q",
    "STAGES_5Q",
    "STAGE_DESCRIPTIONS",
    "STAGE_INCOME_RUNWAY",
    "STAGE_RECOMMENDATIONS",
]
