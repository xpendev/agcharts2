from __future__ import annotations

from io import BytesIO
from typing import Any

from xlsxwriter import Workbook


def build_brand_composition_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ②新規・継続 構成比。
    上部に仮テキスト、その下にデータ表 + Clustered（多段カテゴリ）× 積上 column グラフ。
    多段カテゴリ: https://xlsxwriter.readthedocs.io/example_chart_clustered.html
    """
    meta = payload.get("meta") or {}
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    series_meta = meta.get("series") or {}
    title = str(meta.get("title") or "人数構成比")
    y_title = str(meta.get("yTitle") or "人数構成比 (%)")
    name_repeat = str(series_meta.get("repeat") or "継続リピート")
    name_switch = str(series_meta.get("switchIn") or "トライアル(スイッチイン)")
    name_entry = str(series_meta.get("entry") or "トライアル(カテゴリエントリ)")

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("構成比")

    bold = workbook.add_format({"bold": True, "font_size": 14})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.0"})

    # --- テキスト（仮置き） ---
    worksheet.write("A1", f"・②新規・継続 構成比 / {title}", bold)
    worksheet.set_column("A:A", 18)
    worksheet.set_column("B:B", 12)
    worksheet.set_column("C:E", 14)

    # --- データ表（チャート参照用） ---
    # 行: ブランド（グループ先頭のみ表示） / 期間 / 3系列
    table_header_row = 4  # 1-based Excel row later; 0-based index 4
    worksheet.write_row(
        table_header_row,
        0,
        ["ブランド", "期間", name_repeat, name_switch, name_entry],
        header,
    )

    data_start = table_header_row + 1
    prev_brand = None
    for i, row in enumerate(rows):
        brand = str(row.get("brand") or "")
        period = str(row.get("period") or "")
        # Clustered 用: 同一ブランドの2行目以降はブランド列を空にする
        brand_cell = brand if brand != prev_brand else ""
        prev_brand = brand
        r = data_start + i
        worksheet.write(r, 0, brand_cell)
        worksheet.write(r, 1, period)
        worksheet.write_number(r, 2, float(row.get("repeat") or 0), number)
        worksheet.write_number(r, 3, float(row.get("switchIn") or 0), number)
        worksheet.write_number(r, 4, float(row.get("entry") or 0), number)

    if not rows:
        workbook.close()
        return bio.getvalue()

    data_end = data_start + len(rows) - 1
    sheet_name = "構成比"

    # Clustered（2D categories）+ stacked（データはすでに行合計≒100%）
    chart = workbook.add_chart({"type": "column", "subtype": "stacked"})
    categories = [sheet_name, data_start, 0, data_end, 1]
    chart.add_series(
        {
            "name": name_repeat,
            "categories": categories,
            "values": [sheet_name, data_start, 2, data_end, 2],
            "fill": {"color": "#8A8A8A"},
        }
    )
    chart.add_series(
        {
            "name": name_switch,
            "categories": categories,
            "values": [sheet_name, data_start, 3, data_end, 3],
            "fill": {"color": "#5A9E4A"},
        }
    )
    chart.add_series(
        {
            "name": name_entry,
            "categories": categories,
            "values": [sheet_name, data_start, 4, data_end, 4],
            "fill": {"color": "#B8D96A"},
        }
    )
    chart.set_title({"name": title})
    chart.set_y_axis({"name": y_title, "min": 0, "max": 100})
    chart.set_legend({"position": "bottom"})
    chart.set_size({"width": 720, "height": 420})
    chart.set_style(10)

    # テキストの下（表の右）にグラフを配置
    worksheet.insert_chart("G5", chart)

    workbook.close()
    return bio.getvalue()
