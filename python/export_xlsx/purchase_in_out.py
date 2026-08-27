from __future__ import annotations

from io import BytesIO
from math import ceil
from typing import Any

from xlsxwriter import Workbook

COLOR_OUTFLOW = "#C44B4B"
COLOR_INFLOW = "#5A9E4A"
PREV_PERIOD = "直近・1ヶ月"
CURR_PERIOD = "当月・11月"


def _format_bar_label(value: float) -> str:
    abs_value = abs(value)
    if abs_value < 0.01:
        return f"{abs_value:.3f}"
    return f"{abs_value:.2f}"


def _series_labels(values: list[float]) -> list[dict[str, Any]]:
    return [
        {
            "value": _format_bar_label(value),
            "font": {"size": 9, "color": "#FFFFFF"},
        }
        for value in values
    ]


def build_purchase_in_out_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ④シェア流出・流入比較。
    流出=負・流入=正の横棒を Excel ネイティブグラフで出力する。
    積上 bar（正負を 0 から左右に伸ばす）で同一帯に揃える。
    reverse は値軸が上に移りラベルがズレるため使わず、データ行を逆順にして
    ブランド1 を上に表示する。
    """
    meta = payload.get("meta") or {}
    summary = payload.get("summary") or {}
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    title = str(meta.get("title") or "買出入(実績)")
    brand_label = str(meta.get("brandLabel") or "ブランド")
    size = int(payload.get("size") or 0)

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("シェア流出流入")
    sheet_name = "シェア流出流入"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    section = workbook.add_format({"bold": True, "font_size": 11})
    text = workbook.add_format({"font_size": 10, "text_wrap": True})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.00"})
    percent1 = workbook.add_format({"num_format": "0.0"})

    worksheet.write("A1", "・④シェア流出・流入比較", bold)
    worksheet.write(
        "A2",
        "（仮）流出=赤（負）・流入=緑（正）の積上横棒 bar。"
        " データ行を逆順にしブランド1を上へ（reverse 軸はラベルずれのため不使用）。"
        f" ブランド数={size}。",
        text,
    )
    worksheet.set_row(1, 36)
    worksheet.set_column("A:A", 14)
    worksheet.set_column("B:C", 12)

    # --- KPI / サマリー（画面上段の近似） ---
    worksheet.write("A4", f"{brand_label}", section)
    worksheet.write("A5", PREV_PERIOD)
    worksheet.write_number("B5", float(summary.get("previousPercent") or 0), percent1)
    worksheet.write("C5", "%")
    worksheet.write("A6", CURR_PERIOD)
    worksheet.write_number("B6", float(summary.get("currentPercent") or 0), percent1)
    worksheet.write("C6", "%")

    worksheet.write("A8", title, section)
    worksheet.write("A9", "流出")
    worksheet.write_number("B9", float(summary.get("outflowPercent") or 0), percent1)
    worksheet.write("C9", "%")
    worksheet.write("A10", "継続")
    worksheet.write_number("B10", float(summary.get("retainedPercent") or 0), percent1)
    worksheet.write("C10", "%")
    worksheet.write("A11", "流入")
    worksheet.write_number("B11", float(summary.get("inflowPercent") or 0), percent1)
    worksheet.write("C11", "%")

    table_header_row = 13
    worksheet.write_row(
        table_header_row,
        0,
        ["ブランド", "流出", "流入"],
        header,
    )

    data_start = table_header_row + 1
    outflow_values: list[float] = []
    inflow_values: list[float] = []
    # Excel 既定（minMax）では先頭行が下・末尾行が上。reverse 軸の代わりに逆順で書く。
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

    # 積上 bar: 正負が同じカテゴリ帯の中心に揃い、ラベル高さズレを避けられる
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
    # bar: set_x_axis=値軸（横）、set_y_axis=カテゴリ軸（縦）
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
        }
    )
    chart.set_legend({"position": "bottom"})
    # タイトル／凡例／(%) はほぼ固定ピクセル相当。件数増で相対余白が膨らまないよう換算する。
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
    worksheet.insert_chart("E4", chart)

    workbook.close()
    return bio.getvalue()
