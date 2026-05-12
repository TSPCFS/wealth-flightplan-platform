"""Pure-function tests for the recommendation engine.

Each rule is exercised in isolation via the in-memory ``_make_signals`` /
``_fake_assessment`` helpers — no DB needed.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.services import recommendations as rec


def _now() -> datetime:
    return datetime(2026, 5, 12, tzinfo=UTC)


# ---------------------------------------------------------------------------
# Rule 1 — first step
# ---------------------------------------------------------------------------


def test_rule_first_step_fires_when_no_assessment_yet() -> None:
    actions = rec.compose_actions(rec._make_signals(), now=_now())
    assert len(actions) == 1
    assert actions[0]["source"] == "first_step"
    assert "5-Question" in actions[0]["title"]


def test_rule_first_step_short_circuits_other_rules() -> None:
    """Even with a stale APP-C, missing baseline, etc — first_step wins
    if there's no assessment."""
    signals = rec._make_signals(
        latest_app_c_at=_now() - timedelta(days=400),
        submitted_codes={"APP-A"},
        current_focus_step="3",
    )
    actions = rec.compose_actions(signals, now=_now())
    assert [a["source"] for a in actions] == ["first_step"]


# ---------------------------------------------------------------------------
# Rule 2 — critical gap items
# ---------------------------------------------------------------------------


def test_rule_critical_gaps_fires_only_for_no_answers_on_q1_q4_q5_q6() -> None:
    gap = rec._fake_assessment(
        assessment_type="gap_test",
        stage="meaningful_gaps",
        created_at=_now() - timedelta(days=10),
        responses={
            "q1": "no",  # will → critical
            "q2": "no",  # surplus accuracy → NOT critical
            "q3": "partially",
            "q4": "no",  # emergency fund → critical
            "q5": "yes",
            "q6": "yes",
            "q7": "no",  # short-term insurance → NOT critical
            "q8": "yes",
            "q9": "yes",
            "q10": "yes",
            "q11": "yes",
            "q12": "yes",
        },
    )
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q", stage="Momentum", created_at=_now()
            ),
            latest_gap_test=gap,
        ),
        now=_now(),
    )
    sources = [a["source"] for a in actions]
    assert sources == ["high_priority_gap", "high_priority_gap"]
    titles = sorted(a["title"] for a in actions)
    assert any("will" in t.lower() for t in titles)
    assert any("emergency" in t.lower() for t in titles)


def test_rule_critical_gaps_ignored_when_gap_test_older_than_90_days() -> None:
    gap = rec._fake_assessment(
        assessment_type="gap_test",
        stage="wide_gaps",
        created_at=_now() - timedelta(days=120),
        responses={f"q{i}": "no" for i in range(1, 13)},
    )
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="5q",
                stage="Foundation",
                created_at=_now(),
            ),
            latest_gap_test=gap,
        ),
        now=_now(),
    )
    # Falls through to rules 3-6.
    assert "high_priority_gap" not in {a["source"] for a in actions}


def test_rule_critical_gaps_short_circuits_when_within_90_days() -> None:
    gap = rec._fake_assessment(
        assessment_type="gap_test",
        stage="wide_gaps",
        created_at=_now() - timedelta(days=5),
        responses={"q1": "no", **{f"q{i}": "yes" for i in range(2, 13)}},
    )
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Momentum",
                created_at=_now(),
            ),
            latest_gap_test=gap,
        ),
        now=_now(),
    )
    assert [a["source"] for a in actions] == ["high_priority_gap"]


# ---------------------------------------------------------------------------
# Rule 3 — missing baseline worksheet
# ---------------------------------------------------------------------------


def test_rule_missing_worksheet_for_foundation_recommends_app_a() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="5q",
                stage="Foundation",
                created_at=_now(),
            ),
        ),
        now=_now(),
    )
    high = [a for a in actions if a["source"] == "missing_worksheet"]
    assert len(high) == 1
    assert high[0]["action_url"] == "/worksheets/APP-A"


def test_rule_missing_worksheet_skipped_when_already_submitted() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="5q",
                stage="Foundation",
                created_at=_now(),
            ),
            submitted_codes={"APP-A"},
        ),
        now=_now(),
    )
    assert all(a["source"] != "missing_worksheet" for a in actions)


def test_rule_missing_worksheet_momentum_emits_both_baseline_codes() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Momentum",
                created_at=_now(),
            ),
        ),
        now=_now(),
    )
    missing = [a for a in actions if a["source"] == "missing_worksheet"]
    urls = sorted(a["action_url"] for a in missing)
    assert urls == ["/worksheets/APP-C", "/worksheets/APP-D"]


# ---------------------------------------------------------------------------
# Rule 4 — stale annual review
# ---------------------------------------------------------------------------


def test_rule_stale_review_fires_after_11_months() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Freedom",
                created_at=_now(),
            ),
            submitted_codes={"APP-B", "APP-C"},
            latest_app_b_at=_now() - timedelta(days=400),
            latest_app_c_at=_now() - timedelta(days=400),
        ),
        now=_now(),
    )
    stale = [a for a in actions if a["source"] == "stale_review"]
    assert len(stale) == 2
    urls = sorted(a["action_url"] for a in stale)
    assert urls == ["/worksheets/APP-B", "/worksheets/APP-C"]


def test_rule_stale_review_does_not_fire_within_11_months() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Freedom",
                created_at=_now(),
            ),
            submitted_codes={"APP-B", "APP-C"},
            latest_app_b_at=_now() - timedelta(days=60),
            latest_app_c_at=_now() - timedelta(days=60),
        ),
        now=_now(),
    )
    assert all(a["source"] != "stale_review" for a in actions)


# ---------------------------------------------------------------------------
# Rule 5 — stage-specific next-step content
# ---------------------------------------------------------------------------


def test_rule_stage_content_appears_for_freedom() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Freedom",
                created_at=_now(),
            ),
            submitted_codes={"APP-B"},
        ),
        now=_now(),
    )
    stage_actions = [a for a in actions if a["source"] == "stage_gap"]
    assert len(stage_actions) == 1
    assert "Step 6" in stage_actions[0]["title"]


# ---------------------------------------------------------------------------
# Rule 6 — backfill
# ---------------------------------------------------------------------------


def test_rule_backfill_uses_current_focus_step() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Freedom",
                created_at=_now(),
            ),
            submitted_codes={"APP-B"},
            current_focus_step="4a",
        ),
        now=_now(),
    )
    bf = [a for a in actions if a["source"] == "backfill"]
    assert len(bf) == 1
    assert "Step 4a" in bf[0]["title"]


def test_rule_backfill_defaults_to_step_1_when_no_focus() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="5q",
                stage="Foundation",
                created_at=_now(),
            ),
            submitted_codes={"APP-A"},
        ),
        now=_now(),
    )
    bf = [a for a in actions if a["source"] == "backfill"]
    assert len(bf) == 1
    assert "Step 1" in bf[0]["title"]


# ---------------------------------------------------------------------------
# Cap, ordering, dedupe
# ---------------------------------------------------------------------------


def test_actions_capped_at_five_and_ordered_by_priority() -> None:
    actions = rec.compose_actions(
        rec._make_signals(
            latest_assessment=rec._fake_assessment(
                assessment_type="10q",
                stage="Momentum",
                created_at=_now(),
            ),
            submitted_codes=set(),  # both APP-D + APP-C missing → 2 high-priority
            latest_app_b_at=_now() - timedelta(days=400),  # stale → medium
            latest_app_c_at=_now() - timedelta(days=400),  # stale → medium
            current_focus_step="3",
        ),
        now=_now(),
    )
    assert len(actions) <= rec.MAX_ACTIONS
    priorities = [a["priority"] for a in actions]
    assert priorities == sorted(priorities, key=lambda p: {"high": 0, "medium": 1, "low": 2}[p])
    # High priorities (missing worksheets) come before mediums (stale, stage_gap).
    high_actions = [a for a in actions if a["priority"] == "high"]
    assert all(a["source"] == "missing_worksheet" for a in high_actions)


def test_actions_dedupe_by_action_url() -> None:
    """If two rules nominate the same URL, only the first occurrence survives."""
    # Momentum: stage_gap suggests Step 4a; if user is focus_step=4a too,
    # backfill nominates /framework/steps/4a too — second copy dropped.
    signals = rec._make_signals(
        latest_assessment=rec._fake_assessment(
            assessment_type="10q", stage="Momentum", created_at=_now()
        ),
        submitted_codes={"APP-D", "APP-C"},  # no missing baseline
        current_focus_step="4a",
    )
    actions = rec.compose_actions(signals, now=_now())
    urls = [a["action_url"] for a in actions]
    assert len(urls) == len(set(urls))
