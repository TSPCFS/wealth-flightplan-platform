"""Integration tests for /content/* endpoints + seed idempotence.

The seed is executed inside an autouse fixture so every test in this module
gets a fully populated content_metadata table. Tests assert on the contract-
shaped responses; calculator math is covered separately in test_calculator.py.
"""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import func, select

from app.db.database import get_session_factory
from app.db.models import ContentMetadata, ExampleInteraction
from tests.conftest import authed_session, bearer, seed_phase3_content


@pytest_asyncio.fixture(autouse=True)
async def _seed_content(db_engine):
    """Populate content_metadata before each test in this module."""
    await seed_phase3_content()


# ---------- Seed -------------------------------------------------------------


@pytest.mark.asyncio
async def test_seed_is_idempotent_across_repeated_runs() -> None:
    factory = get_session_factory()
    async with factory() as s:
        before = (await s.execute(select(func.count()).select_from(ContentMetadata))).scalar_one()
    # Re-run the seed; counts must not change.
    await seed_phase3_content()
    async with factory() as s:
        after = (await s.execute(select(func.count()).select_from(ContentMetadata))).scalar_one()
    assert before == after
    # And we expect at least 7 steps + 13 examples + 15 case studies = 35.
    assert before >= 35


@pytest.mark.asyncio
async def test_seed_creates_each_content_type_in_expected_counts() -> None:
    factory = get_session_factory()
    async with factory() as s:
        steps = (
            await s.execute(
                select(func.count())
                .select_from(ContentMetadata)
                .where(ContentMetadata.content_type == "step")
            )
        ).scalar_one()
        examples = (
            await s.execute(
                select(func.count())
                .select_from(ContentMetadata)
                .where(ContentMetadata.content_type == "example")
            )
        ).scalar_one()
        case_studies = (
            await s.execute(
                select(func.count())
                .select_from(ContentMetadata)
                .where(ContentMetadata.content_type == "case_study")
            )
        ).scalar_one()
    assert steps == 7
    assert examples == 13
    assert case_studies == 15


# ---------- /content/framework ----------------------------------------------


@pytest.mark.asyncio
async def test_framework_returns_seven_ordered_steps(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "fw@example.com")
    r = await client.get("/content/framework", headers=bearer(access))
    assert r.status_code == 200, r.text
    body = r.json()
    step_numbers = [s["step_number"] for s in body["steps"]]
    assert step_numbers == ["1", "2", "3", "4a", "4b", "5", "6"]
    # Spot-check a few authored fields.
    step1 = body["steps"][0]
    assert step1["title"] == "Financial GPS"
    assert step1["subtitle"]
    assert step1["time_estimate_minutes"] > 0
    assert isinstance(step1["stage_relevance"], list)


@pytest.mark.asyncio
async def test_framework_requires_auth(client: AsyncClient) -> None:
    r = await client.get("/content/framework")
    assert r.status_code == 401


# ---------- /content/steps/{n} ----------------------------------------------


@pytest.mark.asyncio
async def test_get_step_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "step@example.com")
    r = await client.get("/content/steps/4a", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["step_number"] == "4a"
    assert "Risk Cover" in body["title"]
    assert "body_markdown" in body  # optional but present in seed


@pytest.mark.asyncio
async def test_get_step_unknown_number_returns_404(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "step-404@example.com")
    r = await client.get("/content/steps/99", headers=bearer(access))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


# ---------- /content/examples list ------------------------------------------


@pytest.mark.asyncio
async def test_examples_list_total_matches_seed(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ex-list@example.com")
    r = await client.get("/content/examples", headers=bearer(access))
    body = r.json()
    assert r.status_code == 200
    assert body["total"] == 13
    # Sorted WE-1, WE-2, ..., WE-13.
    codes = [e["example_code"] for e in body["examples"]]
    assert codes == [f"WE-{i}" for i in range(1, 14)]


@pytest.mark.asyncio
async def test_examples_filter_by_step_number(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ex-step@example.com")
    r = await client.get("/content/examples?step_number=6", headers=bearer(access))
    body = r.json()
    # Step 6 examples: WE-2, WE-3, WE-4, WE-5, WE-6, WE-10, WE-11
    codes = sorted(e["example_code"] for e in body["examples"])
    assert "WE-3" in codes
    assert "WE-4" in codes
    assert "WE-5" in codes
    assert "WE-11" in codes
    # Step-5 examples should not appear.
    assert "WE-1" not in codes


@pytest.mark.asyncio
async def test_examples_filter_by_calculator_type(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ex-calc@example.com")
    r = await client.get(
        "/content/examples?calculator_type=compound_interest",
        headers=bearer(access),
    )
    body = r.json()
    assert all(e["calculator_type"] == "compound_interest" for e in body["examples"])
    assert body["total"] >= 5


@pytest.mark.asyncio
async def test_examples_filter_has_calculator_false_includes_we2(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "ex-nocalc@example.com")
    r = await client.get("/content/examples?has_calculator=false", headers=bearer(access))
    codes = [e["example_code"] for e in r.json()["examples"]]
    assert "WE-2" in codes
    assert "WE-9" in codes
    assert "WE-10" in codes
    assert "WE-13" in codes
    assert "WE-3" not in codes


@pytest.mark.asyncio
async def test_examples_filter_by_stage(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ex-stage@example.com")
    r = await client.get("/content/examples?stage=Independence", headers=bearer(access))
    body = r.json()
    # Only WE-6 and WE-13 list Independence in stage_relevance per the seed.
    codes = [e["example_code"] for e in body["examples"]]
    assert "WE-6" in codes
    assert "WE-13" in codes


@pytest.mark.asyncio
async def test_examples_free_text_search(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ex-q@example.com")
    r = await client.get("/content/examples?q=compound", headers=bearer(access))
    body = r.json()
    assert body["total"] >= 1


# ---------- /content/examples/{code} ----------------------------------------


@pytest.mark.asyncio
async def test_get_example_detail_returns_calculator_config(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "ex-detail@example.com")
    r = await client.get("/content/examples/WE-3", headers=bearer(access))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["example_code"] == "WE-3"
    assert body["calculator_type"] == "compound_interest"
    assert body["calculator_config"] is not None
    inputs = body["calculator_config"]["inputs"]
    assert any(i["name"] == "monthly_contribution" for i in inputs)
    monthly = next(i for i in inputs if i["name"] == "monthly_contribution")
    assert monthly["default"] == 5000
    assert "{monthly_contribution}" in body["calculator_config"]["interpretation_template"]


@pytest.mark.asyncio
async def test_get_example_without_calculator_omits_config(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "ex-nocfg@example.com")
    r = await client.get("/content/examples/WE-2", headers=bearer(access))
    body = r.json()
    assert body["calculator_type"] is None
    assert body["calculator_config"] is None


@pytest.mark.asyncio
async def test_get_example_unknown_code_returns_404(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "ex-404@example.com")
    r = await client.get("/content/examples/WE-999", headers=bearer(access))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


# ---------- POST /content/examples/{code}/calculate -------------------------


@pytest.mark.asyncio
async def test_calculate_compound_interest_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-ci@example.com")
    r = await client.post(
        "/content/examples/WE-3/calculate",
        json={
            "monthly_contribution": 5000,
            "initial_amount": 0,
            "years": 25,
            "annual_rate_pct": 10,
            "withdrawal_rate_pct": 4,
        },
        headers=bearer(access),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["example_code"] == "WE-3"
    assert body["calculator_type"] == "compound_interest"
    # Standard monthly compounding ≈ R6.63M
    assert 6_500_000 <= body["outputs"]["final_amount"] <= 6_750_000
    # interpretation has been substituted
    assert "5,000" in body["interpretation"]
    assert "{monthly_contribution}" not in body["interpretation"]


@pytest.mark.asyncio
async def test_calculate_budget_allocator_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-budget@example.com")
    r = await client.post(
        "/content/examples/WE-7/calculate",
        json={"income_monthly": 45000, "needs": 32000, "wants": 3500, "invest": 9500},
        headers=bearer(access),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outputs"]["status"] == "balanced"
    assert body["outputs"]["needs_pct"] > 70


@pytest.mark.asyncio
async def test_calculate_net_worth_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-nw@example.com")
    r = await client.post(
        "/content/examples/WE-8/calculate",
        json={
            "lifestyle_assets": [{"name": "Home", "value": 4500000}],
            "income_generating_assets": [{"name": "RA", "value": 1200000}],
            "liabilities": [{"name": "Bond", "value": 3100000}],
        },
        headers=bearer(access),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outputs"]["net_worth"] == 2_600_000
    assert 46 <= body["outputs"]["income_generating_pct_of_net_worth"] <= 47


@pytest.mark.asyncio
async def test_calculate_debt_analysis_happy_path(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-debt@example.com")
    r = await client.post(
        "/content/examples/WE-1/calculate",
        json={
            "debts": [
                {
                    "name": "CC",
                    "balance": 30000,
                    "annual_rate_pct": 24,
                    "minimum_payment": 1500,
                }
            ],
            "surplus_available": 0,
            "method": "avalanche",
        },
        headers=bearer(access),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["outputs"]["total_debt"] == 30_000.0
    assert body["outputs"]["debt_free_months"] is not None


@pytest.mark.asyncio
async def test_calculate_validation_error_bubbles_up(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-bad@example.com")
    r = await client.post(
        "/content/examples/WE-3/calculate",
        json={
            "monthly_contribution": -100,  # ge=0 violated
            "years": 25,
            "annual_rate_pct": 10,
        },
        headers=bearer(access),
    )
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "monthly_contribution" in body["error"]["details"]


@pytest.mark.asyncio
async def test_calculate_on_null_calculator_returns_404(client: AsyncClient) -> None:
    """WE-2 is descriptive only — has no calculator."""
    access, _ = await authed_session(client, "calc-null@example.com")
    r = await client.post("/content/examples/WE-2/calculate", json={}, headers=bearer(access))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_calculate_unknown_example_returns_404(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-unknown@example.com")
    r = await client.post("/content/examples/WE-999/calculate", json={}, headers=bearer(access))
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_calculate_requires_auth(client: AsyncClient) -> None:
    r = await client.post(
        "/content/examples/WE-3/calculate",
        json={"monthly_contribution": 5000, "years": 25, "annual_rate_pct": 10},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_calculate_persists_example_interaction(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "calc-persist@example.com")
    r = await client.post(
        "/content/examples/WE-3/calculate",
        json={"monthly_contribution": 5000, "years": 25, "annual_rate_pct": 10},
        headers=bearer(access),
    )
    assert r.status_code == 200

    factory = get_session_factory()
    async with factory() as s:
        rows = (
            (
                await s.execute(
                    select(ExampleInteraction).where(ExampleInteraction.example_code == "WE-3")
                )
            )
            .scalars()
            .all()
        )
    assert len(rows) == 1
    row = rows[0]
    assert row.example_title == "R5k/month for 25 years"
    assert row.input_parameters["monthly_contribution"] == 5000
    assert "final_amount" in row.calculated_output


# ---------- /content/case-studies -------------------------------------------


@pytest.mark.asyncio
async def test_case_studies_list_returns_all_fifteen(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "cs-list@example.com")
    r = await client.get("/content/case-studies", headers=bearer(access))
    body = r.json()
    assert r.status_code == 200
    assert body["total"] == 15
    codes = [c["study_code"] for c in body["case_studies"]]
    assert codes == sorted(codes)  # ascending CS-001, CS-002, ...
    assert codes[0] == "CS-001"


@pytest.mark.asyncio
async def test_case_studies_filter_by_step_number(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "cs-step@example.com")
    r = await client.get("/content/case-studies?step_number=6", headers=bearer(access))
    codes = [c["study_code"] for c in r.json()["case_studies"]]
    # Step-6 case studies: CS-008, CS-009, CS-010, CS-011, CS-012, CS-013, CS-014, CS-015
    assert "CS-008" in codes
    assert "CS-013" in codes
    # CS-001 is Step-1 only
    assert "CS-001" not in codes


@pytest.mark.asyncio
async def test_get_case_study_detail(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "cs-detail@example.com")
    r = await client.get("/content/case-studies/CS-001", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["study_code"] == "CS-001"
    assert body["name"] == "Susan & Johan"
    assert body["age_band"] == "Multiple"
    assert body["income_monthly"] == 85_000
    assert body["situation"]
    assert body["learning"]


@pytest.mark.asyncio
async def test_get_case_study_unknown_returns_404(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "cs-404@example.com")
    r = await client.get("/content/case-studies/CS-999", headers=bearer(access))
    assert r.status_code == 404


# ---------- Decimal regression (carryover from Phase 2) ---------------------


@pytest.mark.asyncio
async def test_profile_household_income_is_json_number_not_string(
    client: AsyncClient,
) -> None:
    """Phase 2 carryover fix: Decimal columns must serialize as JSON numbers."""
    access, _ = await authed_session(client, "decimal@example.com")
    # The default register payload sets household_income_monthly_after_tax=50000.
    r = await client.get("/users/profile", headers=bearer(access))
    body = r.json()
    value = body["household_income_monthly_after_tax"]
    assert isinstance(value, int | float), type(value)
    assert value == 50000
