"""Worksheet export: PDF (ReportLab) + CSV.

The PDF dispatcher renders a per-worksheet template using the schema as the
layout source (so future worksheets get a sensible default rendering without
custom code). CSV is a flat key/value file with leaf paths in
``response_data`` + ``calculated_values``.
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.datetimes import to_utc_z
from app.db.models import User, WorksheetResponse

DISCLAIMER = "Illustrative. Not financial advice. Verify with a qualified advisor."

_STATUS_COLOURS: dict[str, colors.Color] = {
    "on_track": colors.HexColor("#1f7a3a"),
    "needs_attention": colors.HexColor("#d09e2a"),
    "critical": colors.HexColor("#a8332f"),
    "balanced": colors.HexColor("#1f7a3a"),
    "deficit": colors.HexColor("#a8332f"),
    "surplus": colors.HexColor("#1f7a3a"),
}


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def _fmt_value(value: Any, fmt: str | None) -> str:
    if value is None or value == "":
        return "–"
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if fmt == "currency":
        try:
            return f"R{float(value):,.2f}"
        except (TypeError, ValueError):
            return str(value)
    if fmt == "percent":
        try:
            return f"{float(value):.1f}%"
        except (TypeError, ValueError):
            return str(value)
    if fmt == "integer":
        try:
            return f"{int(round(float(value))):,}"
        except (TypeError, ValueError):
            return str(value)
    if isinstance(value, float):
        return f"{value:,.2f}"
    return str(value)


def _field_format(field_spec: dict[str, Any]) -> str | None:
    return field_spec.get("format")


def _label_for(field_spec: dict[str, Any]) -> str:
    return field_spec.get("label", field_spec.get("name", ""))


# ---------------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------------


def _build_pdf_header(
    styles, worksheet_title: str, user: User, submitted_at: datetime
) -> list[Any]:
    title_style = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontSize=18,
        spaceAfter=4 * mm,
    )
    sub_style = ParagraphStyle(
        "Sub",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#555555"),
        spaceAfter=6 * mm,
    )
    full_name = f"{user.first_name} {user.last_name}".strip()
    sub = (
        f"Prepared for: <b>{full_name}</b> &nbsp;·&nbsp; "
        f"Email: {user.email} &nbsp;·&nbsp; "
        f"Submitted: {submitted_at.strftime('%Y-%m-%d %H:%M UTC')}"
    )
    return [
        Paragraph(f"Wealth FlightPlan™ | {worksheet_title}", title_style),
        Paragraph(sub, sub_style),
    ]


def _scalar_section_block(section: dict[str, Any], data: dict[str, Any], styles) -> list[Any]:
    rows = [["Field", "Value"]]
    for field in section.get("fields", []):
        rows.append(
            [
                _label_for(field),
                _fmt_value(data.get(field["name"]), _field_format(field)),
            ]
        )
    table = Table(rows, colWidths=[80 * mm, 90 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return [
        Paragraph(f"<b>{section.get('label', section['name'])}</b>", styles["Heading3"]),
        table,
        Spacer(1, 4 * mm),
    ]


def _array_section_block(
    section: dict[str, Any], rows_data: list[dict[str, Any]], styles
) -> list[Any]:
    item_schema = section.get("item_schema", [])
    headers = [_label_for(c) for c in item_schema]
    rows: list[list[str]] = [headers]
    if not rows_data:
        rows.append(["(no entries)"] + [""] * (len(headers) - 1))
    for r in rows_data:
        if not isinstance(r, dict):
            continue
        rows.append([_fmt_value(r.get(c["name"]), _field_format(c)) for c in item_schema])
    table = Table(rows, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f0f0f0")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return [
        Paragraph(f"<b>{section.get('label', section['name'])}</b>", styles["Heading3"]),
        table,
        Spacer(1, 4 * mm),
    ]


def _calculated_values_block(calc: dict[str, Any] | None, styles) -> list[Any]:
    if not calc:
        return []
    rows: list[list[str]] = [["Metric", "Value"]]
    output_formats = {
        "total_income": "currency",
        "total_needs": "currency",
        "total_wants": "currency",
        "total_invest": "currency",
        "total_allocated": "currency",
        "surplus_deficit": "currency",
        "needs_pct": "percent",
        "wants_pct": "percent",
        "invest_pct": "percent",
        "total_lifestyle_assets": "currency",
        "total_income_generating_assets": "currency",
        "total_assets": "currency",
        "total_liabilities": "currency",
        "net_worth": "currency",
        "income_generating_pct_of_net_worth": "percent",
        "total_debt": "currency",
        "total_monthly_minimums": "currency",
        "weighted_average_rate_pct": "percent",
    }
    for k, v in calc.items():
        if isinstance(v, list | dict):
            continue
        rows.append([k, _fmt_value(v, output_formats.get(k))])
    table = Table(rows, colWidths=[80 * mm, 90 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f7a3a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cccccc")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return [
        Paragraph("<b>Calculated values</b>", styles["Heading3"]),
        table,
        Spacer(1, 4 * mm),
    ]


def _feedback_block(feedback: dict[str, Any] | None, styles) -> list[Any]:
    if not feedback:
        return []
    status = feedback.get("status", "needs_attention")
    color = _STATUS_COLOURS.get(status, colors.HexColor("#555555"))
    status_style = ParagraphStyle(
        "FB",
        parent=styles["Normal"],
        textColor=color,
        fontSize=11,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "FBBody",
        parent=styles["Normal"],
        fontSize=10,
        spaceAfter=2 * mm,
    )
    out: list[Any] = [
        Paragraph(f"Status: {status.upper()}", status_style),
        Paragraph(feedback.get("message", ""), body_style),
    ]
    for rec in feedback.get("recommendations", []):
        out.append(Paragraph(f"• {rec}", body_style))
    out.append(Spacer(1, 4 * mm))
    return out


def render_pdf(
    *,
    worksheet_row: WorksheetResponse,
    schema: dict[str, Any],
    user: User,
) -> bytes:
    """Render the worksheet to PDF bytes."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=14 * mm,
        title=schema.get("title", "Worksheet"),
        author="Wealth FlightPlan",
    )
    styles = getSampleStyleSheet()
    story: list[Any] = []
    story.extend(_build_pdf_header(styles, schema.get("title", ""), user, worksheet_row.created_at))

    response = worksheet_row.response_data or {}
    for section in schema.get("sections", []):
        sname = section["name"]
        if section.get("type") == "array":
            rows = response.get(sname) or []
            story.extend(_array_section_block(section, rows, styles))
        else:
            data = response.get(sname) or {}
            story.extend(_scalar_section_block(section, data, styles))

    story.extend(_calculated_values_block(worksheet_row.calculated_values, styles))
    story.extend(_feedback_block(worksheet_row.feedback, styles))

    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.HexColor("#888888"),
    )
    story.append(Paragraph(DISCLAIMER, disclaimer_style))

    doc.build(story)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------


def _flatten(prefix: str, value: Any, out: list[tuple[str, str]]) -> None:
    if isinstance(value, dict):
        for k, v in value.items():
            sub = f"{prefix}.{k}" if prefix else str(k)
            _flatten(sub, v, out)
    elif isinstance(value, list):
        # Lists serialize as a single JSON-string value (keeps CSV flat).
        out.append((prefix, json.dumps(value, ensure_ascii=False)))
    else:
        out.append((prefix, "" if value is None else str(value)))


def render_csv(*, worksheet_row: WorksheetResponse, schema: dict[str, Any]) -> bytes:
    rows: list[tuple[str, str]] = []
    rows.append(("worksheet_code", worksheet_row.worksheet_code))
    rows.append(("worksheet_title", schema.get("title", "")))
    rows.append(("created_at", to_utc_z(worksheet_row.created_at)))
    rows.append(("completion_percentage", str(worksheet_row.completion_percentage)))
    _flatten("response_data", worksheet_row.response_data or {}, rows)
    _flatten("calculated_values", worksheet_row.calculated_values or {}, rows)
    _flatten("feedback", worksheet_row.feedback or {}, rows)

    buf = io.StringIO()
    writer = csv.writer(buf, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["key", "value"])
    writer.writerows(rows)
    return buf.getvalue().encode("utf-8")


__all__ = ["DISCLAIMER", "render_csv", "render_pdf"]
