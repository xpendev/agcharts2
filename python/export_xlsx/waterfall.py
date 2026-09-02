from __future__ import annotations

from io import BytesIO
from typing import Any

from xlsxwriter import Workbook

from export_xlsx.waterfall_png import render_waterfall_png

WATERFALL_SHEET_TITLE = "③シェア流出入"


def build_waterfall_xlsx(payload: dict[str, Any]) -> bytes:
    """③シェア流出入。ウォーターフォールを PNG で描画し Excel に貼り付け。"""
    png_bytes, _, _ = render_waterfall_png(payload)

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("シェア流出入")

    bold = workbook.add_format({"bold": True, "font_size": 14})
    worksheet.write("A1", WATERFALL_SHEET_TITLE, bold)
    worksheet.insert_image(
        "A3",
        "waterfall.png",
        {"image_data": BytesIO(png_bytes)},
    )

    workbook.close()
    return bio.getvalue()
