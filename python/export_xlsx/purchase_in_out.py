from __future__ import annotations

from io import BytesIO
from math import ceil
from typing import Any, Literal

from xlsxwriter import Workbook
from xlsxwriter.worksheet import Worksheet

from export_xlsx.purchase_in_out_summary_png import render_purchase_in_out_summary_png

PurchaseInOutSummaryStyle = Literal["png", "objects"]

COLOR_OUTFLOW = "#C44B4B"
COLOR_INFLOW = "#5A9E4A"
COLOR_RETAIN = "#A8B4C0"
PREV_PERIOD = "直近・1ヶ月"
CURR_PERIOD = "当月・11月"
MAIN_CHART_WIDTH = 720
SUMMARY_IMAGE_ANCHOR = "E3"
SUMMARY_CHART_GAP_PX = 6
SUMMARY_IMAGE_X_SCALE = 1.0
SUMMARY_IMAGE_Y_SCALE = 1.0
OBJECTS_MAIN_CHART_ANCHOR = "E15"


def normalize_summary_style(raw: str | None) -> PurchaseInOutSummaryStyle:
    if raw in ("objects", "object", "native", "excel"):
        return "objects"
    return "png"


def _format_bar_label(value: float) -> str:
    abs_value = abs(value)
    if abs_value < 0.01:
        return f"{abs_value:.3f}"
    return f"{abs_value:.2f}"


def _series_labels(
    values: list[float], *, color: str = "#FFFFFF"
) -> list[dict[str, Any]]:
    return [
        {
            "value": _format_bar_label(value),
            "font": {"size": 9, "color": color},
        }
        for value in values
    ]


def _kpi_box_options(*, width: int = 110, height: int = 52) -> dict[str, Any]:
    return {
        "width": width,
        "height": height,
        "font": {"name": "Yu Gothic", "size": 18, "bold": True, "color": "#222222"},
        "align": {"vertical": "middle", "horizontal": "center"},
        "border": {"color": "#333333", "width": 1.25},
        "fill": {"color": "#FFFFFF"},
    }


def _insert_summary_png(worksheet: Worksheet, payload: dict[str, Any]) -> int:
    summary_png_bytes, _, summary_height = render_purchase_in_out_summary_png(
        payload,
        width=MAIN_CHART_WIDTH,
    )
    summary_png = BytesIO(summary_png_bytes)
    worksheet.insert_image(
        SUMMARY_IMAGE_ANCHOR,
        "purchase-in-out-summary.png",
        {
            "image_data": summary_png,
            "x_scale": SUMMARY_IMAGE_X_SCALE,
            "y_scale": SUMMARY_IMAGE_Y_SCALE,
        },
    )
    return int(summary_height * SUMMARY_IMAGE_Y_SCALE)


def _insert_summary_objects(
    worksheet: Worksheet,
    workbook: Workbook,
    payload: dict[str, Any],
    sheet_name: str,
) -> None:
    meta = payload.get("meta") or {}
    summary = payload.get("summary") or {}
    title = str(meta.get("title") or "流出入（金額）")
    brand_label = str(meta.get("brandLabel") or "ブランド")

    prev_pct = float(summary.get("previousPercent") or 0)
    curr_pct = float(summary.get("currentPercent") or 0)
    outflow_pct = abs(float(summary.get("outflowPercent") or 0))
    retained_pct = abs(float(summary.get("retainedPercent") or 0))
    inflow_pct = abs(float(summary.get("inflowPercent") or 0))

    section = workbook.add_format({"bold": True, "font_size": 11})
    section_center = workbook.add_format(
        {"bold": True, "font_size": 11, "align": "center", "valign": "vcenter"}
    )
    caption = workbook.add_format({"font_size": 9, "font_color": "#555555"})
    retain_caption = workbook.add_format(
        {
            "font_size": 9,
            "font_color": "#555555",
            "align": "center",
            "valign": "vcenter",
        }
    )
    side = workbook.add_format({"font_size": 10, "bold": True})
    band_out = workbook.add_format(
        {
            "bg_color": COLOR_OUTFLOW,
            "font_color": "#FFFFFF",
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "border": 1,
            "border_color": "#333333",
        }
    )
    band_mid = workbook.add_format(
        {
            "bg_color": COLOR_RETAIN,
            "font_color": "#FFFFFF",
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "border": 1,
            "border_color": "#333333",
        }
    )
    band_in = workbook.add_format(
        {
            "bg_color": COLOR_INFLOW,
            "font_color": "#FFFFFF",
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "border": 1,
            "border_color": "#333333",
        }
    )

    worksheet.write("E3", brand_label, section)
    worksheet.write("F3", PREV_PERIOD, caption)
    worksheet.write("I3", CURR_PERIOD, caption)
    worksheet.insert_textbox("F4", f"{prev_pct:.1f}%", _kpi_box_options())
    worksheet.insert_textbox(
        "H4",
        "→",
        {
            "width": 36,
            "height": 52,
            "x_offset": 8,
            "font": {"size": 22, "bold": True, "color": "#888888"},
            "align": {"vertical": "middle", "horizontal": "center"},
            "line": {"none": True},
            "fill": {"none": True},
        },
    )
    worksheet.insert_textbox("I4", f"{curr_pct:.1f}%", _kpi_box_options())

    worksheet.merge_range("E7:K7", title, section_center)
    worksheet.merge_range("H8:I8", "維持", retain_caption)
    worksheet.write("E10", "流出", side)
    worksheet.write("L10", "流入", side)
    worksheet.merge_range("F10:G10", f"-{outflow_pct:.1f}%", band_out)
    worksheet.merge_range("H10:I10", f"{retained_pct:.1f}%", band_mid)
    worksheet.merge_range("J10:K10", f"+{inflow_pct:.1f}%", band_in)

    worksheet.write("AA1", "帯")
    worksheet.write_number("AB1", outflow_pct)
    worksheet.write_number("AC1", retained_pct)
    worksheet.write_number("AD1", inflow_pct)
    worksheet.write("AB2", "流出")
    worksheet.write("AC2", "維持")
    worksheet.write("AD2", "流入")
    worksheet.set_column("AA:AD", None, None, {"hidden": True})

    band_chart = workbook.add_chart({"type": "bar", "subtype": "percent_stacked"})
    band_categories = [sheet_name, 0, 26, 0, 26]
    for name, col, color in (
        ("流出", 27, COLOR_OUTFLOW),
        ("維持", 28, COLOR_RETAIN),
        ("流入", 29, COLOR_INFLOW),
    ):
        band_chart.add_series(
            {
                "name": name,
                "categories": band_categories,
                "values": [sheet_name, 0, col, 0, col],
                "fill": {"color": color},
                "border": {"color": "#333333"},
                "data_labels": {
                    "value": True,
                    "position": "center",
                    "num_format": '0.0"%"',
                    "font": {"size": 10, "color": "#FFFFFF", "bold": True},
                },
            }
        )
    band_chart.set_legend({"position": "none"})
    band_chart.set_title({"none": True})
    band_chart.set_y_axis({"visible": False})
    band_chart.set_x_axis(
        {
            "visible": False,
            "major_gridlines": {"visible": False},
        }
    )
    band_chart.set_chartarea({"border": {"none": True}, "fill": {"none": True}})
    band_chart.set_plotarea({"border": {"none": True}, "fill": {"none": True}})
    band_chart.set_size({"width": 420, "height": 70})
    worksheet.insert_chart("F12", band_chart)


def build_purchase_in_out_xlsx(
    payload: dict[str, Any],
    *,
    summary_style: PurchaseInOutSummaryStyle = "png",
) -> bytes:
    """
    ④シェア流出・流入比較。
    左: 数表 / 右: 上段（PNG または Excel オブジェクト）＋本グラフ。
    """
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("シェア流出流入")
    sheet_name = "シェア流出流入"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.00"})

    worksheet.write("A1", "・④シェア流出・流入比較", bold)
    worksheet.set_column("A:A", 14)
    worksheet.set_column("B:C", 10)
    worksheet.set_column("D:D", 3)
    worksheet.set_column("E:K", 11)
    worksheet.set_column("L:L", 8)

    table_header_row = 3
    table_col = 0
    worksheet.write_row(
        table_header_row,
        table_col,
        ["ブランド", "流出", "流入"],
        header,
    )

    data_start = table_header_row + 1
    outflow_values: list[float] = []
    inflow_values: list[float] = []
    chart_rows = list(reversed(rows))
    for i, row in enumerate(chart_rows):
        label = str(row.get("label") or "")
        outflow = float(row.get("outflow") or 0)
        inflow = float(row.get("inflow") or 0)
        outflow_neg = -outflow
        outflow_values.append(outflow_neg)
        inflow_values.append(inflow)
        r = data_start + i
        worksheet.write(r, table_col, label)
        worksheet.write_number(r, table_col + 1, outflow_neg, number)
        worksheet.write_number(r, table_col + 2, inflow, number)

    summary_display_height: int | None = None
    if summary_style == "objects":
        _insert_summary_objects(worksheet, workbook, payload, sheet_name)
    else:
        summary_display_height = _insert_summary_png(worksheet, payload)

    if not chart_rows:
        workbook.close()
        return bio.getvalue()

    data_end = data_start + len(chart_rows) - 1
    categories = [sheet_name, data_start, table_col, data_end, table_col]

    max_abs = max(
        0.5,
        max((abs(v) for v in outflow_values), default=0.0),
        max((abs(v) for v in inflow_values), default=0.0),
    )
    axis_max = ceil(max_abs * 2) / 2

    chart = workbook.add_chart({"type": "bar", "subtype": "stacked"})
    chart.add_series(
        {
            "name": "流出",
            "categories": categories,
            "values": [sheet_name, data_start, table_col + 1, data_end, table_col + 1],
            "fill": {"color": COLOR_OUTFLOW},
            "gap": 40,
            "data_labels": {
                "position": "inside_end",
                "custom": _series_labels(outflow_values),
            },
        }
    )
    chart.add_series(
        {
            "name": "流入",
            "categories": categories,
            "values": [sheet_name, data_start, table_col + 2, data_end, table_col + 2],
            "fill": {"color": COLOR_INFLOW},
            "data_labels": {
                "position": "inside_end",
                "custom": _series_labels(inflow_values),
            },
        }
    )
    chart.set_title({"none": True})
    chart.set_x_axis(
        {
            "name": "(%)",
            "min": -axis_max,
            "max": axis_max,
            "major_unit": 0.5,
        }
    )
    chart.set_y_axis(
        {
            "label_position": "low",
            "label_align": "left",
            "interval_unit": 1,
            "interval_tick": 1,
        }
    )
    chart.set_legend({"position": "top"})
    chart_height = max(400, len(chart_rows) * 28 + 140)
    top_margin = 80 / chart_height
    bottom_margin = 70 / chart_height
    chart.set_plotarea(
        {
            "layout": {
                "x": 0.14,
                "y": round(top_margin, 4),
                "width": 0.82,
                "height": round(max(0.5, 1.0 - top_margin - bottom_margin), 4),
            }
        }
    )
    chart.set_size({"width": MAIN_CHART_WIDTH, "height": chart_height})

    if summary_style == "objects":
        worksheet.insert_chart(OBJECTS_MAIN_CHART_ANCHOR, chart)
    else:
        worksheet.insert_chart(
            SUMMARY_IMAGE_ANCHOR,
            chart,
            {"y_offset": (summary_display_height or 0) + SUMMARY_CHART_GAP_PX},
        )

    workbook.close()
    return bio.getvalue()
