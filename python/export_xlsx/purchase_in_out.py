from __future__ import annotations

from io import BytesIO
from math import ceil
from typing import Any

from xlsxwriter import Workbook

COLOR_OUTFLOW = "#C44B4B"
COLOR_INFLOW = "#5A9E4A"
MAIN_CHART_WIDTH = 720


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


def build_purchase_in_out_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ④シェア流出・流入比較。
    左: 数表 / 右: 流出・流入の積上横棒（xlsxwriter ネイティブチャート）。
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

    table_header_row = 3
    worksheet.write_row(
        table_header_row,
        0,
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
        worksheet.write(r, 0, label)
        worksheet.write_number(r, 1, outflow_neg, number)
        worksheet.write_number(r, 2, inflow, number)

    if not chart_rows:
        workbook.close()
        return bio.getvalue()

    data_end = data_start + len(chart_rows) - 1
    categories = [sheet_name, data_start, 0, data_end, 0]

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
            "values": [sheet_name, data_start, 1, data_end, 1],
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
            "values": [sheet_name, data_start, 2, data_end, 2],
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
    worksheet.insert_chart("E4", chart)

    workbook.close()
    return bio.getvalue()
