"""WE-7 parity check: APP-A submission and /content/examples/WE-7/calculate
must return identical core calculated_values."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import (
    authed_session,
    bearer,
    seed_phase3_content,
    seed_phase4_worksheets,
)


@pytest.mark.asyncio
async def test_app_a_matches_we7_calculator(client: AsyncClient, db_engine) -> None:
    await seed_phase3_content()
    await seed_phase4_worksheets()
    access, _ = await authed_session(client, "parity@example.com")

    # WE-7 default inputs.
    we7 = await client.post(
        "/content/examples/WE-7/calculate",
        json={
            "income_monthly": 45_000,
            "needs": 32_000,
            "wants": 3_500,
            "invest": 9_500,
        },
        headers=bearer(access),
    )
    assert we7.status_code == 200
    we7_out = we7.json()["outputs"]

    # APP-A submission with the same totals broken into fields that sum back to the WE-7 inputs.
    app_a = await client.post(
        "/worksheets/APP-A/submit",
        json={
            "response_data": {
                "income": {"salary_1": 45_000},
                "needs": {
                    "bond": 11_000,
                    "utilities": 2_800,
                    "groceries": 6_500,
                    "transport": 3_900,
                    "medical": 3_500,
                    "insurance": 1_600,
                    "school": 0,
                    "family": 0,
                    "debt_minimums": 2_700,
                },
                "wants": {
                    "dining": 1_500,
                    "entertainment": 1_000,
                    "travel": 0,
                    "personal": 500,
                    "gifts": 500,
                    "other_wants": 0,
                },
                "invest": {
                    "emergency_fund": 1_500,
                    "ra": 4_000,
                    "tfsa": 3_000,
                    "discretionary": 1_000,
                    "bucket_3": 0,
                    "extra_debt": 0,
                },
            }
        },
        headers=bearer(access),
    )
    assert app_a.status_code == 201
    app_a_calc = app_a.json()["calculated_values"]

    # Core fields must match within rounding.
    for key in (
        "total_income",
        "needs_pct",
        "wants_pct",
        "invest_pct",
        "surplus_deficit",
        "status",
    ):
        assert app_a_calc[key] == we7_out[key], (key, app_a_calc[key], we7_out[key])
