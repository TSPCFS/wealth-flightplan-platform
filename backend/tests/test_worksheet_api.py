"""Integration tests for /worksheets/* + PDF/CSV exports."""

from __future__ import annotations

import csv
import io

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import func, select

from app.db.database import get_session_factory
from app.db.models import WorksheetResponse
from tests.conftest import authed_session, bearer, seed_phase4_worksheets


@pytest_asyncio.fixture(autouse=True)
async def _seed_worksheets(db_engine):
    """Populate worksheet rows before each test in this module."""
    await seed_phase4_worksheets()


# ---------- Seed --------------------------------------------------------------


@pytest.mark.asyncio
async def test_seed_is_idempotent_across_repeated_runs() -> None:
    # Re-run; counts unchanged.
    first = await seed_phase4_worksheets()
    second = await seed_phase4_worksheets()
    assert first["worksheets"]["total"] == second["worksheets"]["total"] == 7
    assert second["worksheets"]["inserted"] == 0


# ---------- Catalogue + schema ------------------------------------------------


@pytest.mark.asyncio
async def test_list_worksheets_returns_seven_alphabetical(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-list@example.com")
    r = await client.get("/worksheets", headers=bearer(access))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 7
    codes = [w["worksheet_code"] for w in body["worksheets"]]
    assert codes == ["APP-A", "APP-B", "APP-C", "APP-D", "APP-E", "APP-F", "APP-G"]
    # has_calculator true for A/B/D/G (G uses assessment_10q)
    by_code = {w["worksheet_code"]: w for w in body["worksheets"]}
    assert by_code["APP-A"]["has_calculator"] is True
    assert by_code["APP-E"]["has_calculator"] is False


@pytest.mark.asyncio
async def test_get_worksheet_schema_app_a(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-schema@example.com")
    r = await client.get("/worksheets/APP-A", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["worksheet_code"] == "APP-A"
    assert len(body["sections"]) == 4
    section_names = [s["name"] for s in body["sections"]]
    assert section_names == ["income", "needs", "wants", "invest"]


@pytest.mark.asyncio
async def test_get_worksheet_schema_unknown_returns_404(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-404@example.com")
    r = await client.get("/worksheets/APP-Z", headers=bearer(access))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


# ---------- Draft idempotence -------------------------------------------------


@pytest.mark.asyncio
async def test_draft_two_saves_collapse_to_one_row(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-draft@example.com")
    r1 = await client.post(
        "/worksheets/APP-A/draft",
        json={"response_data": {"income": {"salary_1": 40_000}}},
        headers=bearer(access),
    )
    assert r1.status_code == 200, r1.text
    id1 = r1.json()["worksheet_id"]
    r2 = await client.post(
        "/worksheets/APP-A/draft",
        json={"response_data": {"income": {"salary_1": 45_000}}, "completion_percentage": 10},
        headers=bearer(access),
    )
    assert r2.status_code == 200
    body2 = r2.json()
    # Same worksheet_id — second draft overwrote the first.
    assert body2["worksheet_id"] == id1
    assert body2["is_draft"] is True
    assert body2["completion_percentage"] == 10

    factory = get_session_factory()
    async with factory() as s:
        cnt = (
            await s.execute(
                select(func.count())
                .select_from(WorksheetResponse)
                .where(WorksheetResponse.worksheet_code == "APP-A")
                .where(WorksheetResponse.is_draft.is_(True))
            )
        ).scalar_one()
    assert cnt == 1


# ---------- Submit ------------------------------------------------------------


@pytest.mark.asyncio
async def test_submit_app_a_returns_calculated_values_matching_we7(
    client: AsyncClient,
) -> None:
    access, _ = await authed_session(client, "wk-submit-a@example.com")
    payload = {
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
    }
    r = await client.post("/worksheets/APP-A/submit", json=payload, headers=bearer(access))
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["is_draft"] is False
    calc = body["calculated_values"]
    assert calc["total_income"] == 45_000
    assert calc["total_needs"] == 32_000
    assert calc["total_wants"] == 3_500
    assert calc["total_invest"] == 9_500
    assert calc["status"] == "balanced"
    # Feedback present
    assert body["feedback"]["status"] in ("on_track", "needs_attention", "critical")
    assert body["created_at"].endswith("Z")


@pytest.mark.asyncio
async def test_submit_deletes_matching_draft(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-submit-delete@example.com")
    # Save a draft first.
    await client.post(
        "/worksheets/APP-A/draft",
        json={"response_data": {"income": {"salary_1": 45_000}}},
        headers=bearer(access),
    )
    # Submit.
    submit_payload = {"response_data": {"income": {"salary_1": 45_000}, "needs": {"bond": 11_000}}}
    r = await client.post("/worksheets/APP-A/submit", json=submit_payload, headers=bearer(access))
    assert r.status_code == 201

    factory = get_session_factory()
    async with factory() as s:
        rows = list(
            (
                await s.execute(
                    select(WorksheetResponse).where(WorksheetResponse.worksheet_code == "APP-A")
                )
            ).scalars()
        )
    # Exactly one row, and it's the submission (not the draft).
    assert len(rows) == 1
    assert rows[0].is_draft is False


@pytest.mark.asyncio
async def test_submit_validation_error_on_bad_input(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-submit-bad@example.com")
    r = await client.post(
        "/worksheets/APP-D/submit",
        json={
            "response_data": {
                "debts": [
                    {
                        "creditor": "CC",
                        "balance": -10,  # min=0
                        "minimum_payment": 0,
                        "annual_rate_pct": 24,
                        "account_type": "credit_card",
                    }
                ]
            }
        },
        headers=bearer(access),
    )
    assert r.status_code == 400
    body = r.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert "debts[0].balance" in body["error"]["details"]


@pytest.mark.asyncio
async def test_submit_app_g_redirects_to_assessments_endpoint(client: AsyncClient) -> None:
    """APP-G must not write a worksheet row — it forwards to /assessments/10q."""
    access, _ = await authed_session(client, "wk-app-g@example.com")
    r = await client.post(
        "/worksheets/APP-G/submit",
        json={
            "response_data": {
                "responses": {f"q{i}": "a" for i in range(1, 11)},
            }
        },
        headers=bearer(access),
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "USE_ASSESSMENTS_ENDPOINT"


# ---------- /latest / /history ------------------------------------------------


@pytest.mark.asyncio
async def test_latest_returns_204_when_nothing_exists(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-empty@example.com")
    r = await client.get("/worksheets/APP-A/latest", headers=bearer(access))
    assert r.status_code == 204
    assert r.content == b""


@pytest.mark.asyncio
async def test_latest_returns_most_recent_submission(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-latest@example.com")
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": {"income": {"salary_1": 30_000}}},
        headers=bearer(access),
    )
    r = await client.get("/worksheets/APP-A/latest", headers=bearer(access))
    assert r.status_code == 200
    body = r.json()
    assert body["is_draft"] is False
    assert body["response_data"]["income"]["salary_1"] == 30_000


@pytest.mark.asyncio
async def test_history_excludes_drafts(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-hist@example.com")
    await client.post(
        "/worksheets/APP-A/draft",
        json={"response_data": {"income": {"salary_1": 1}}},
        headers=bearer(access),
    )
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": {"income": {"salary_1": 30_000}}},
        headers=bearer(access),
    )
    await client.post(
        "/worksheets/APP-A/submit",
        json={"response_data": {"income": {"salary_1": 45_000}}},
        headers=bearer(access),
    )
    r = await client.get("/worksheets/APP-A/history", headers=bearer(access))
    body = r.json()
    assert len(body["submissions"]) == 2
    assert all(s["created_at"].endswith("Z") for s in body["submissions"])
    # Summary keys come from the seed's summary_keys list (surplus_deficit, needs_pct, etc.)
    assert "surplus_deficit" in body["submissions"][0]["calculated_values_summary"]


# ---------- Exports -----------------------------------------------------------


async def _submit_app_b(client: AsyncClient, access: str) -> str:
    r = await client.post(
        "/worksheets/APP-B/submit",
        json={
            "response_data": {
                "lifestyle_assets": [{"name": "Home", "value": 4_500_000}],
                "income_generating_assets": [{"name": "RA", "value": 1_200_000}],
                "liabilities": [{"name": "Bond", "value": 3_100_000}],
            }
        },
        headers=bearer(access),
    )
    assert r.status_code == 201, r.text
    return r.json()["worksheet_id"]


@pytest.mark.asyncio
async def test_export_pdf_returns_pdf_bytes(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-pdf@example.com")
    wid = await _submit_app_b(client, access)
    r = await client.get(f"/worksheets/{wid}/export/pdf", headers=bearer(access))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/pdf")
    assert "attachment" in r.headers.get("content-disposition", "")
    body = r.content
    assert body.startswith(b"%PDF-")
    assert len(body) > 1000  # non-trivial PDF


@pytest.mark.asyncio
async def test_export_csv_returns_csv_with_calculated_values(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-csv@example.com")
    wid = await _submit_app_b(client, access)
    r = await client.get(f"/worksheets/{wid}/export/csv", headers=bearer(access))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    rows = list(csv.reader(io.StringIO(r.content.decode("utf-8"))))
    assert rows[0] == ["key", "value"]
    keys = [row[0] for row in rows[1:]]
    assert "worksheet_code" in keys
    assert any(k.startswith("calculated_values.") for k in keys)
    assert any(k == "calculated_values.net_worth" for k in keys)


@pytest.mark.asyncio
async def test_export_owner_only_returns_404_for_other_user(client: AsyncClient) -> None:
    access_a, _ = await authed_session(client, "wk-owner@example.com")
    wid = await _submit_app_b(client, access_a)
    access_b, _ = await authed_session(client, "wk-intruder@example.com")
    r = await client.get(f"/worksheets/{wid}/export/pdf", headers=bearer(access_b))
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_export_draft_rejected(client: AsyncClient) -> None:
    access, _ = await authed_session(client, "wk-draft-export@example.com")
    r1 = await client.post(
        "/worksheets/APP-A/draft",
        json={"response_data": {"income": {"salary_1": 30_000}}},
        headers=bearer(access),
    )
    wid = r1.json()["worksheet_id"]
    r2 = await client.get(f"/worksheets/{wid}/export/pdf", headers=bearer(access))
    assert r2.status_code == 400
    assert r2.json()["error"]["code"] == "DRAFT_NOT_EXPORTABLE"


# ---------- Auth --------------------------------------------------------------


@pytest.mark.asyncio
async def test_worksheets_require_auth(client: AsyncClient) -> None:
    r = await client.get("/worksheets")
    assert r.status_code == 401
    r = await client.get("/worksheets/APP-A")
    assert r.status_code == 401
    r = await client.post("/worksheets/APP-A/draft", json={"response_data": {}})
    assert r.status_code == 401
