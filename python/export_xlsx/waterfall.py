from __future__ import annotations

from io import BytesIO
from typing import Any

from xlsxwriter import Workbook

COLOR_POSITIVE = "#5A9E4A"
COLOR_NEGATIVE = "#C44B4B"
COLOR_TOTAL = "#8A8A8A"

LABEL_FONT = {"size": 10}


def _format_signed(value: float) -> str:
    if value > 0:
        return f"+{value:.1f}"
    return f"{value:.1f}"


def _series_labels(values: list[float], *, signed: bool) -> list[dict[str, Any] | None]:
    """見える棒だけラベルを出し、0 のセグメントは非表示にする。"""
    labels: list[dict[str, Any] | None] = []
    for value in values:
        if value == 0:
            labels.append({"delete": True})
            continue
        text = _format_signed(value) if signed else f"{value:.1f}"
        labels.append({"value": text, "font": LABEL_FONT})
    return labels


def _compute_waterfall_bars(
    categories: list[str],
    values: list[float],
) -> tuple[list[str], list[float], list[float], list[float], list[float]]:
    """
    積上 column による waterfall 近似用に、ベース・増加・減少・合計系列へ分解する。
    categories 末尾は「期末」、values 末尾は期末の累計値。
    """
    if not categories:
        return [], [], [], [], []

    if len(categories) == 1:
        return [categories[0]], [0.0], [0.0], [0.0], [float(values[0] if values else 0)]

    display_categories = list(categories)
    bases: list[float] = []
    positives: list[float] = []
    negatives: list[float] = []
    totals: list[float] = []

    running = 0.0
    flow_count = len(categories) - 1
    for index in range(flow_count):
        amount = float(values[index] if index < len(values) else 0)
        if index == 0:
            bases.append(0.0)
            positives.append(0.0)
            negatives.append(0.0)
            totals.append(amount)
            running = amount
            continue

        if amount >= 0:
            bases.append(running)
            positives.append(amount)
            negatives.append(0.0)
            totals.append(0.0)
            running += amount
        else:
            running += amount
            bases.append(running)
            positives.append(0.0)
            negatives.append(abs(amount))
            totals.append(0.0)

    end_total = float(values[-1] if values else running)
    bases.append(0.0)
    positives.append(0.0)
    negatives.append(0.0)
    totals.append(end_total)

    return display_categories, bases, positives, negatives, totals


def build_waterfall_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ③シェア流出入（ウォーターフォール）。
    xlsxwriter に waterfall 型はないため、積上 column（不可視ベース + 増減 + 合計）で近似する。
    """
    meta = payload.get("meta") or {}
    categories: list[str] = [str(c) for c in list(payload.get("categories") or [])]
    raw_values: list[float] = [float(v) for v in list(payload.get("values") or [])]
    title = str(meta.get("title") or "シェア流出入")
    y_unit = str(meta.get("yUnit") or "(%)")

    display_categories, bases, positives, negatives, totals = _compute_waterfall_bars(
        categories,
        raw_values,
    )

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("シェア流出入")
    sheet_name = "シェア流出入"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.0"})

    worksheet.write("A1", "・③シェア流出入", bold)
    worksheet.set_column("A:A", 14)
    worksheet.set_column("B:F", 11)

    table_header_row = 4
    worksheet.write_row(
        table_header_row,
        0,
        ["カテゴリ", "増減", "ベース", "増加", "減少", "合計"],
        header,
    )

    data_start = table_header_row + 1
    for index, category in enumerate(display_categories):
        row = data_start + index
        if len(categories) == 1:
            delta = raw_values[0] if raw_values else 0.0
        elif index == 0:
            delta = raw_values[0] if raw_values else 0.0
        elif index == len(display_categories) - 1:
            delta = raw_values[-1] if raw_values else 0.0
        else:
            delta = raw_values[index] if index < len(raw_values) else 0.0

        worksheet.write(row, 0, category)
        worksheet.write_number(row, 1, delta, number)
        worksheet.write_number(row, 2, bases[index], number)
        worksheet.write_number(row, 3, positives[index], number)
        worksheet.write_number(row, 4, negatives[index], number)
        worksheet.write_number(row, 5, totals[index], number)

    if not display_categories:
        workbook.close()
        return bio.getvalue()

    data_end = data_start + len(display_categories) - 1
    category_range = [sheet_name, data_start, 0, data_end, 0]

    chart = workbook.add_chart({"type": "column", "subtype": "stacked"})
    chart.add_series(
        {
            "name": "ベース",
            "categories": category_range,
            "values": [sheet_name, data_start, 2, data_end, 2],
            "fill": {"none": True},
            "border": {"none": True},
            "gap": 50,
        }
    )
    chart.add_series(
        {
            "name": "増加",
            "categories": category_range,
            "values": [sheet_name, data_start, 3, data_end, 3],
            "fill": {"color": COLOR_POSITIVE},
            "data_labels": {
                "position": "outside_end",
                "custom": _series_labels(positives, signed=True),
            },
        }
    )
    chart.add_series(
        {
            "name": "減少",
            "categories": category_range,
            "values": [sheet_name, data_start, 4, data_end, 4],
            "fill": {"color": COLOR_NEGATIVE},
            "data_labels": {
                "position": "outside_end",
                "custom": _series_labels(
                    [-value for value in negatives],
                    signed=True,
                ),
            },
        }
    )
    chart.add_series(
        {
            "name": "合計",
            "categories": category_range,
            "values": [sheet_name, data_start, 5, data_end, 5],
            "fill": {"color": COLOR_TOTAL},
            "data_labels": {
                "position": "outside_end",
                "custom": _series_labels(totals, signed=False),
            },
        }
    )

    chart.set_title({"name": title})
    chart.set_y_axis({"name": y_unit, "major_gridlines": {"visible": True}})
    chart.set_x_axis(
        {
            "num_font": {"rotation": -90, "size": 9},
            "interval_unit": 1,
        }
    )
    chart.set_legend({"position": "bottom"})
    chart.set_size({"width": 720, "height": 420})
    worksheet.insert_chart("H5", chart)

    workbook.close()
    return bio.getvalue()
