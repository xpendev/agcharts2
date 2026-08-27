from __future__ import annotations

from io import BytesIO
from math import ceil
from typing import Any

from xlsxwriter import Workbook

COLOR_OUTFLOW = "#C44B4B"
COLOR_INFLOW = "#5A9E4A"
COLOR_RETAIN = "#A8B4C0"
PREV_PERIOD = "直近・1ヶ月"
CURR_PERIOD = "当月・11月"


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


def build_purchase_in_out_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ④シェア流出・流入比較。
    左: 数表 / 右: KPI（textbox・帯）＋本グラフ。
    """
    meta = payload.get("meta") or {}
    summary = payload.get("summary") or {}
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    title = str(meta.get("title") or "買出入(実績)")
    brand_label = str(meta.get("brandLabel") or "ブランド")

    prev_pct = float(summary.get("previousPercent") or 0)
    curr_pct = float(summary.get("currentPercent") or 0)
    outflow_pct = abs(float(summary.get("outflowPercent") or 0))
    retained_pct = abs(float(summary.get("retainedPercent") or 0))
    inflow_pct = abs(float(summary.get("inflowPercent") or 0))

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("シェア流出流入")
    sheet_name = "シェア流出流入"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    section = workbook.add_format({"bold": True, "font_size": 11})
    caption = workbook.add_format({"font_size": 9, "font_color": "#555555"})
    side = workbook.add_format({"font_size": 10, "bold": True})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.00"})
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

    worksheet.write("A1", "・④シェア流出・流入比較", bold)
    worksheet.set_column("A:A", 14)
    worksheet.set_column("B:C", 10)
    worksheet.set_column("D:D", 3)
    worksheet.set_column("E:K", 11)
    worksheet.set_column("L:L", 8)

    # --- 左: 数表 ---
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

    # --- 右: from/to ％（textbox） ---
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

    # --- 右: パーセンテージ帯（セル + 小型チャート） ---
    worksheet.write("E7", title, section)
    worksheet.write("H7", "維持", caption)

    worksheet.write("E9", "流出", side)
    worksheet.write("L9", "流入", side)

    worksheet.merge_range("F9:G9", f"-{outflow_pct:.1f}%", band_out)
    worksheet.merge_range("H9:I9", f"{retained_pct:.1f}%", band_mid)
    worksheet.merge_range("J9:K9", f"+{inflow_pct:.1f}%", band_in)

    worksheet.write("AA1", "帯")
    worksheet.write_number("AB1", outflow_pct)
    worksheet.write_number("AC1", retained_pct)
    worksheet.write_number("AD1", inflow_pct)
    worksheet.write("AB2", "流出")
    worksheet.write("AC2", "維持")
    worksheet.write("AD2", "流入")
    worksheet.set_column("AA:AD", None, None, {"hidden": True})

    band_chart = workbook.add_chart({"type": "bar", "subtype": "percent_stacked"})
    # 隠列 AA:AD（0-index 26..29）
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
    worksheet.insert_chart("F11", band_chart)

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
    chart.set_title({"name": title})
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
    chart.set_legend({"position": "bottom"})
    chart_height = max(400, len(chart_rows) * 28 + 140)
    top_margin = 48 / chart_height
    bottom_margin = 100 / chart_height
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
    chart.set_size({"width": 720, "height": chart_height})
    # KPI／帯の直下・数表の右
    worksheet.insert_chart("E15", chart)

    workbook.close()
    return bio.getvalue()
