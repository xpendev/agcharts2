from __future__ import annotations

from io import BytesIO
from typing import Any

from xlsxwriter import Workbook

# ①と同様、表の右にグラフを縦分割配置
# チャート外形は ①（width 520 / height 320）に揃える
CHART_COL = 6  # G列
CHART_START_ROW = 5
CHART_WIDTH = 520
CHART_HEIGHT = 320
# チャート上端どうしの行間隔（①の F6 / F23 ≒ 17行）
ROWS_PER_CHART = 17


def _group_rows_by_brand(
    rows: list[dict[str, Any]],
) -> list[tuple[str, list[dict[str, Any]]]]:
    order: list[str] = []
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        brand = str(row.get("brand") or "")
        if brand not in grouped:
            grouped[brand] = []
            order.append(brand)
        grouped[brand].append(row)
    return [(brand, grouped[brand]) for brand in order]


def build_brand_composition_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ②新規・継続 構成比。
    ブランドごとに積上 column グラフを分割し、1段に1つ縦配置する。
    """
    meta = payload.get("meta") or {}
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    series_meta = meta.get("series") or {}
    title = str(meta.get("title") or "人数構成比")
    y_title = str(meta.get("yTitle") or "人数構成比 (%)")
    name_repeat = str(series_meta.get("repeat") or "リピート")
    name_switch = str(series_meta.get("switchIn") or "トライアル(スイッチイン)")
    name_entry = str(series_meta.get("entry") or "トライアル(カテゴリエントリ)")

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("構成比")
    sheet_name = "構成比"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.0"})

    worksheet.write("A1", f"・②新規・継続 構成比 / {title}", bold)
    worksheet.set_column("A:A", 18)
    worksheet.set_column("B:B", 12)
    worksheet.set_column("C:E", 14)

    table_header_row = 4
    worksheet.write_row(
        table_header_row,
        0,
        ["ブランド", "期間", name_repeat, name_switch, name_entry],
        header,
    )

    data_start = table_header_row + 1
    for i, row in enumerate(rows):
        r = data_start + i
        worksheet.write(r, 0, str(row.get("brand") or ""))
        worksheet.write(r, 1, str(row.get("period") or ""))
        worksheet.write_number(r, 2, float(row.get("repeat") or 0), number)
        worksheet.write_number(r, 3, float(row.get("switchIn") or 0), number)
        worksheet.write_number(r, 4, float(row.get("entry") or 0), number)

    if not rows:
        workbook.close()
        return bio.getvalue()

    # ブランドごとの行範囲（データは出現順・連続を前提）
    brand_ranges: list[tuple[str, int, int]] = []
    offset = 0
    for brand, brand_rows in _group_rows_by_brand(rows):
        start = data_start + offset
        end = start + len(brand_rows) - 1
        brand_ranges.append((brand, start, end))
        offset += len(brand_rows)

    for i, (brand, start, end) in enumerate(brand_ranges):
        chart = workbook.add_chart({"type": "column", "subtype": "stacked"})
        categories = [sheet_name, start, 1, end, 1]
        chart.add_series(
            {
                "name": name_repeat,
                "categories": categories,
                "values": [sheet_name, start, 2, end, 2],
                "fill": {"color": "#8A8A8A"},
            }
        )
        chart.add_series(
            {
                "name": name_switch,
                "categories": categories,
                "values": [sheet_name, start, 3, end, 3],
                "fill": {"color": "#5A9E4A"},
            }
        )
        chart.add_series(
            {
                "name": name_entry,
                "categories": categories,
                "values": [sheet_name, start, 4, end, 4],
                "fill": {"color": "#B8D96A"},
            }
        )
        chart.set_title({"name": brand})
        chart.set_x_axis({"interval_unit": 1, "interval_tick": 1})
        chart.set_y_axis({"name": y_title, "min": 0, "max": 100, "major_unit": 10})
        chart.set_legend({"position": "bottom"})
        chart.set_size({"width": CHART_WIDTH, "height": CHART_HEIGHT})
        chart.set_style(10)

        worksheet.insert_chart(
            CHART_START_ROW + i * ROWS_PER_CHART,
            CHART_COL,
            chart,
        )

    workbook.close()
    return bio.getvalue()
