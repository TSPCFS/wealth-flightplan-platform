"""Authored copy for the recommendation engine.

Strings live here so tests can assert against them and the engine stays
pure routing/selection logic.
"""

from __future__ import annotations

from typing import Literal, TypedDict

ActionSource = Literal[
    "first_step",
    "high_priority_gap",
    "missing_worksheet",
    "stale_review",
    "stage_gap",
    "backfill",
]
ActionPriority = Literal["high", "medium", "low"]


class Action(TypedDict):
    priority: ActionPriority
    title: str
    reason: str
    action_url: str
    estimated_time_minutes: int
    source: ActionSource


# ---------------------------------------------------------------------------
# Rule 1: first step (no assessment yet)
# ---------------------------------------------------------------------------

FIRST_STEP_ACTION: Action = {
    "priority": "high",
    "title": "Take the 5-Question Quick Assessment",
    "reason": "Establish your starting wealth stage so the platform can tailor every next step.",
    "action_url": "/assessments/5q",
    "estimated_time_minutes": 2,
    "source": "first_step",
}


# ---------------------------------------------------------------------------
# Rule 2: critical GAP test items
# ---------------------------------------------------------------------------

GAP_CRITICAL_ACTIONS: dict[str, Action] = {
    "q1": {
        "priority": "high",
        "title": "Draft or update your will",
        "reason": "Critical gap from your latest GAP Test. Get the will signed within 30 days.",
        "action_url": "/worksheets/APP-F",
        "estimated_time_minutes": 45,
        "source": "high_priority_gap",
    },
    "q4": {
        "priority": "high",
        "title": "Build a 3–6 month emergency fund",
        "reason": "Critical gap from your latest GAP Test. Household needs a buffer before investing aggressively.",
        "action_url": "/examples/WE-3",
        "estimated_time_minutes": 15,
        "source": "high_priority_gap",
    },
    "q5": {
        "priority": "high",
        "title": "Review life cover (10–15× annual income)",
        "reason": "Critical gap from your latest GAP Test. Re-quote with at least two providers.",
        "action_url": "/worksheets/APP-C",
        "estimated_time_minutes": 30,
        "source": "high_priority_gap",
    },
    "q6": {
        "priority": "high",
        "title": "Put income protection in place",
        "reason": "Critical gap from your latest GAP Test. Monthly benefit should cover ≥75% of salary.",
        "action_url": "/worksheets/APP-C",
        "estimated_time_minutes": 30,
        "source": "high_priority_gap",
    },
}


# ---------------------------------------------------------------------------
# Rule 3: stage baseline worksheets
# ---------------------------------------------------------------------------

STAGE_BASELINE_WORKSHEETS: dict[str, list[str]] = {
    "Foundation": ["APP-A"],
    "Momentum": ["APP-D", "APP-C"],
    "Freedom": ["APP-B"],
    "Independence": ["APP-F"],
    "Abundance": ["APP-F"],
}

# Title + reason per worksheet (matches the seed in phase4_worksheets.py).
BASELINE_DETAILS: dict[str, dict[str, str | int]] = {
    "APP-A": {
        "title": "Complete the Zero-Based Budget (Appendix A)",
        "reason": "Stage baseline: your monthly numbers anchor everything downstream.",
        "action_url": "/worksheets/APP-A",
        "estimated_time_minutes": 30,
    },
    "APP-B": {
        "title": "Complete the Net Worth Statement (Appendix B)",
        "reason": "Stage baseline: the four-numbers dashboard for Step 3.",
        "action_url": "/worksheets/APP-B",
        "estimated_time_minutes": 45,
    },
    "APP-C": {
        "title": "Run the Risk Cover Review (Appendix C)",
        "reason": "Stage baseline: audit the four cover pillars annually.",
        "action_url": "/worksheets/APP-C",
        "estimated_time_minutes": 30,
    },
    "APP-D": {
        "title": "Fill in the Debt Disclosure Worksheet (Appendix D)",
        "reason": "Stage baseline: every account on one page unlocks the elimination plan.",
        "action_url": "/worksheets/APP-D",
        "estimated_time_minutes": 30,
    },
    "APP-F": {
        "title": "Fill in the attooh! Life File (Appendix F)",
        "reason": "Stage baseline: the document your family needs if something happens.",
        "action_url": "/worksheets/APP-F",
        "estimated_time_minutes": 90,
    },
}


# ---------------------------------------------------------------------------
# Rule 4: stale annual review
# ---------------------------------------------------------------------------

STALE_REVIEW_ACTIONS: dict[str, Action] = {
    "APP-C": {
        "priority": "medium",
        "title": "Refresh your annual cover review (Appendix C)",
        "reason": "It's been more than 11 months since your last cover review. Re-quote with 2+ providers.",
        "action_url": "/worksheets/APP-C",
        "estimated_time_minutes": 30,
        "source": "stale_review",
    },
    "APP-B": {
        "priority": "medium",
        "title": "Refresh your Net Worth Statement (Appendix B)",
        "reason": "It's been more than 11 months since your last net worth update.",
        "action_url": "/worksheets/APP-B",
        "estimated_time_minutes": 45,
        "source": "stale_review",
    },
}


# ---------------------------------------------------------------------------
# Rule 5: stage-specific next-step content
# ---------------------------------------------------------------------------

STAGE_NEXT_STEP_ACTIONS: dict[str, list[Action]] = {
    "Foundation": [
        {
            "priority": "medium",
            "title": "Work through Step 2: Zero-Based Budget",
            "reason": "Foundation stage: every rand has a job before any other lever moves.",
            "action_url": "/framework/steps/2",
            "estimated_time_minutes": 90,
            "source": "stage_gap",
        }
    ],
    "Momentum": [
        {
            "priority": "medium",
            "title": "Take the GAP Test to map your top three gaps",
            "reason": "Momentum stage: the GAP Test pinpoints the highest-leverage cover and habit gaps.",
            "action_url": "/assessments/gap-test",
            "estimated_time_minutes": 5,
            "source": "stage_gap",
        },
        {
            "priority": "medium",
            "title": "Work through Step 4a: Risk Cover (Households)",
            "reason": "Momentum stage: lock the protective layer before scaling investments.",
            "action_url": "/framework/steps/4a",
            "estimated_time_minutes": 60,
            "source": "stage_gap",
        },
    ],
    "Freedom": [
        {
            "priority": "medium",
            "title": "Optimise Step 6: Investment",
            "reason": "Freedom stage: max TFSA + RA, model Bucket 3 with the compound calculator.",
            "action_url": "/framework/steps/6",
            "estimated_time_minutes": 60,
            "source": "stage_gap",
        }
    ],
    "Independence": [
        {
            "priority": "medium",
            "title": "Complete estate planning (Appendix F + advisor review)",
            "reason": "Independence stage: the next lever is generational, not personal.",
            "action_url": "/worksheets/APP-F",
            "estimated_time_minutes": 90,
            "source": "stage_gap",
        }
    ],
    "Abundance": [
        {
            "priority": "medium",
            "title": "Book annual advisor review for succession + tax structures",
            "reason": "Abundance stage: trust, offshore allocation, and succession planning carry the value.",
            "action_url": "/worksheets/APP-F",
            "estimated_time_minutes": 60,
            "source": "stage_gap",
        }
    ],
}


# ---------------------------------------------------------------------------
# Rule 6: backfill ("continue step N")
# ---------------------------------------------------------------------------

STEP_TITLES: dict[str, str] = {
    "1": "Financial GPS",
    "2": "Zero-Based Budget",
    "3": "Money Matrix",
    "4a": "Risk Cover: Households",
    "4b": "Risk Cover: Business Owners",
    "5": "Debt Optimisation",
    "6": "Investment",
}


def backfill_action(step_number: str) -> Action:
    title = STEP_TITLES.get(step_number, f"Step {step_number}")
    return {
        "priority": "low",
        "title": f"Continue Step {step_number}: {title}",
        "reason": "Keep momentum: this is your current focus step in the framework.",
        "action_url": f"/framework/steps/{step_number}",
        "estimated_time_minutes": 30,
        "source": "backfill",
    }


__all__ = [
    "Action",
    "ActionPriority",
    "ActionSource",
    "BASELINE_DETAILS",
    "FIRST_STEP_ACTION",
    "GAP_CRITICAL_ACTIONS",
    "STAGE_BASELINE_WORKSHEETS",
    "STAGE_NEXT_STEP_ACTIONS",
    "STALE_REVIEW_ACTIONS",
    "STEP_TITLES",
    "backfill_action",
]
