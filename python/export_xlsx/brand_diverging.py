from __future__ import annotations

from io import BytesIO
from typing import Any

from xlsxwriter import Workbook


def build_brand_diverging_xlsx(payload: dict[str, Any]) -> bytes:
    """
    ⑥流出入差ランキング。
    符号付き横棒（bar）を Excel ネイティブグラフで出力する。
    正負で色分けするため、正値列・負値列の2系列に分ける。
    ④⑤と同様、reverse 軸は使わずデータ行を逆順にしてブランド1を上にする。
    """
    meta = payload.get("meta") or {}
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    title = str(meta.get("title") or "ブランド")

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("流出入差")
    sheet_name = "流出入差"

    bold = workbook.add_format({"bold": True, "font_size": 14})
    header = workbook.add_format({"bold": True, "bg_color": "#F2F2F2"})
    number = workbook.add_format({"num_format": "0.0"})

    worksheet.write("A1", "・⑥流出入差ランキング", bold)
    worksheet.set_column("A:A", 14)
    worksheet.set_column("B:C", 12)

    table_header_row = 4
    worksheet.write_row(
        table_header_row,
        0,
        ["ブランド", "流出入差(+)", "流出入差(-)"],
        header,
    )

    data_start = table_header_row + 1
    values: list[float] = []
    # Excel 既定（minMax）では先頭行が下・末尾行が上。reverse 軸の代わりに逆順で書く。
    chart_rows = list(reversed(rows))
    for i, row in enumerate(chart_rows):
        label = str(row.get("label") or "")
        value = float(row.get("value") or 0)
        values.append(value)
        r = data_start + i
        worksheet.write(r, 0, label)
        if value >= 0:
            worksheet.write_number(r, 1, value, number)
            worksheet.write_blank(r, 2, None)
        else:
            worksheet.write_blank(r, 1, None)
            worksheet.write_number(r, 2, value, number)

    if not chart_rows:
        workbook.close()
        return bio.getvalue()

    data_end = data_start + len(chart_rows) - 1
    categories = [sheet_name, data_start, 0, data_end, 0]

    chart = workbook.add_chart({"type": "bar"})
    chart.add_series(
        {
            "name": "流出入差(+)",
            "categories": categories,
            "values": [sheet_name, data_start, 1, data_end, 1],
            "fill": {"color": "#4A7DB8"},
        }
    )
    chart.add_series(
        {
            "name": "流出入差(-)",
            "categories": categories,
            "values": [sheet_name, data_start, 2, data_end, 2],
            "fill": {"color": "#C44B4B"},
        }
    )
    chart.set_title({"name": title})
    if values:
        abs_max = max(abs(v) for v in values)
        margin = abs_max * 0.1 if abs_max > 0 else 1
        val_min = -(abs_max + margin)
        val_max = abs_max + margin
        # bar では set_x_axis=値軸（横）、set_y_axis=カテゴリ軸（縦・左）。
        # 棒は 0 交差（autoZero）のまま正負で左右に伸ばす。
        # ラベル位置は crossing ではなく label_position=low で左端に固定する。
        chart.set_x_axis({"min": val_min, "max": val_max})
        chart.set_y_axis(
            {
                "label_position": "low",
                "label_align": "left",
                "interval_unit": 1,
                "interval_tick": 1,
            }
        )
        # プロット領域を右へずらし、左側にラベル用の余白を確保する。
        chart.set_plotarea(
            {
                "layout": {
                    "x": 0.12,
                    "y": 0.06,
                    "width": 0.86,
                    "height": 0.88,
                }
            }
        )
    chart.set_legend({"position": "none"})
    chart.set_size({"width": 640, "height": max(320, len(chart_rows) * 28 + 80)})
    worksheet.insert_chart("E5", chart)

    workbook.close()
    return bio.getvalue()
