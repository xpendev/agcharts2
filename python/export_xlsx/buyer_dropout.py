from __future__ import annotations

from io import BytesIO
from typing import Any

from xlsxwriter import Workbook


def build_buyer_dropout_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ①新規・継続・脱落率。
    上段: 積上 column、下段: 負値 column の Excel ネイティブグラフを2つ配置。
    """
    meta = payload.get("meta") or {}
    stacked: list[dict[str, Any]] = list(payload.get("stacked") or [])
    dropout: list[dict[str, Any]] = list(payload.get("dropout") or [])
    series_meta = meta.get("series") or {}
    top_title = str(meta.get("topTitle") or "購入者の割合")
    bottom_title = str(meta.get("bottomTitle") or "脱落者の割合")
    y_unit = str(meta.get("yUnit") or "(%)")
    name_base = str(series_meta.get("base") or "継続")
    name_mid = str(series_meta.get("mid") or "トライアル")
    name_top = str(series_meta.get("top") or "その他")
    size = int(payload.get("size") or 0)

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("新規・継続・脱落率")
    sheet_name = "新規・継続・脱落率"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    section = workbook.add_format({"bold": True, "font_size": 11})
    text = workbook.add_format({"font_size": 10, "text_wrap": True})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.0"})

    worksheet.write("A1", "・①新規・継続・脱落率", bold)
    worksheet.write(
        "A2",
        "（仮）上段=積上 column、下段=負値 column の Excel ネイティブグラフ2枚。"
        f" 期間数={size}。",
        text,
    )
    worksheet.set_row(1, 28)
    worksheet.set_column("A:A", 12)
    worksheet.set_column("B:D", 12)

    # --- 上段データ ---
    top_header_row = 4
    worksheet.write(top_header_row, 0, top_title, section)
    table_header_row = top_header_row + 1
    worksheet.write_row(
        table_header_row,
        0,
        ["期間", name_base, name_mid, name_top],
        header,
    )

    top_data_start = table_header_row + 1
    for i, row in enumerate(stacked):
        r = top_data_start + i
        worksheet.write(r, 0, str(row.get("period") or ""))
        worksheet.write_number(r, 1, float(row.get("base") or 0), number)
        worksheet.write_number(r, 2, float(row.get("mid") or 0), number)
        worksheet.write_number(r, 3, float(row.get("top") or 0), number)

    top_data_end = top_data_start + max(len(stacked), 1) - 1

    # --- 下段データ ---
    bottom_section_row = top_data_end + 3
    worksheet.write(bottom_section_row, 0, bottom_title, section)
    bottom_header_row = bottom_section_row + 1
    worksheet.write_row(bottom_header_row, 0, ["期間", "脱落率"], header)

    bottom_data_start = bottom_header_row + 1
    for i, row in enumerate(dropout):
        r = bottom_data_start + i
        worksheet.write(r, 0, str(row.get("period") or ""))
        worksheet.write_number(r, 1, float(row.get("value") or 0), number)

    bottom_data_end = bottom_data_start + max(len(dropout), 1) - 1

    if stacked:
        chart_top = workbook.add_chart({"type": "column", "subtype": "stacked"})
        categories = [sheet_name, top_data_start, 0, top_data_end, 0]
        chart_top.add_series(
            {
                "name": name_base,
                "categories": categories,
                "values": [sheet_name, top_data_start, 1, top_data_end, 1],
                "fill": {"color": "#6A6358"},
            }
        )
        chart_top.add_series(
            {
                "name": name_mid,
                "categories": categories,
                "values": [sheet_name, top_data_start, 2, top_data_end, 2],
                "fill": {"color": "#2F7A3A"},
            }
        )
        chart_top.add_series(
            {
                "name": name_top,
                "categories": categories,
                "values": [sheet_name, top_data_start, 3, top_data_end, 3],
                "fill": {"color": "#8FBF5A"},
            }
        )
        chart_top.set_title({"name": top_title})
        chart_top.set_y_axis({"name": y_unit, "min": 0, "max": 50})
        chart_top.set_legend({"position": "bottom"})
        chart_top.set_size({"width": 520, "height": 280})
        worksheet.insert_chart("F6", chart_top)

    if dropout:
        chart_bottom = workbook.add_chart({"type": "column"})
        categories = [sheet_name, bottom_data_start, 0, bottom_data_end, 0]
        chart_bottom.add_series(
            {
                "name": bottom_title,
                "categories": categories,
                "values": [sheet_name, bottom_data_start, 1, bottom_data_end, 1],
                "fill": {"color": "#C44B4B"},
            }
        )
        chart_bottom.set_title({"name": bottom_title})
        chart_bottom.set_y_axis({"name": y_unit, "min": -9, "max": 0})
        chart_bottom.set_legend({"position": "none"})
        chart_bottom.set_size({"width": 520, "height": 240})
        # 下段表の右隣（1-based 行番号）
        worksheet.insert_chart(f"F{bottom_header_row + 2}", chart_bottom)

    workbook.close()
    return bio.getvalue()
