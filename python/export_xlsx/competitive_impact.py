from __future__ import annotations

from io import BytesIO
from math import ceil
from typing import Any

from xlsxwriter import Workbook

from export_xlsx.purchase_in_out import COLOR_INFLOW, COLOR_OUTFLOW, _series_labels


def build_competitive_impact_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ⑤競合へのインパクト。
    流出=負・流入=正の積上横棒 bar を Excel ネイティブグラフで出力する。
    ④と同様、reverse 軸は使わずデータ行を逆順にして表示順を揃える。
    """
    meta = payload.get("meta") or {}
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    title = str(meta.get("title") or "競合へのインパクト")
    x_unit = str(meta.get("xUnit") or "(%)")

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("競合インパクト")
    sheet_name = "競合インパクト"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.000"})

    worksheet.write("A1", "・⑤競合へのインパクト", bold)
    worksheet.set_column("A:A", 22)
    worksheet.set_column("B:C", 12)

    table_header_row = 4
    worksheet.write_row(
        table_header_row,
        0,
        ["競合ブランド", "流出", "流入"],
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
    axis_max = ceil(max_abs * 10) / 10
    major_unit = 0.1 if axis_max <= 1.0 else ceil(axis_max / 5 * 10) / 10

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
    chart.set_title({"name": title})
    chart.set_x_axis(
        {
            "name": x_unit,
            "min": -axis_max,
            "max": axis_max,
            "major_unit": major_unit,
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
    # タイトル／軸名はほぼ固定ピクセル相当。件数増で相対余白が膨らまないよう換算する。
    chart_height = max(360, len(chart_rows) * 28 + 100)
    top_margin = 80 / chart_height  # タイトル + 上凡例
    bottom_margin = 70 / chart_height
    chart.set_plotarea(
        {
            "layout": {
                "x": 0.18,
                "y": round(top_margin, 4),
                "width": 0.78,
                "height": round(max(0.5, 1.0 - top_margin - bottom_margin), 4),
            }
        }
    )
    chart.set_size({"width": 720, "height": chart_height})
    worksheet.insert_chart("E4", chart)

    workbook.close()
    return bio.getvalue()
