from __future__ import annotations

from io import BytesIO

from xlsxwriter import Workbook


def build_png_only_xlsx(
    png_bytes: bytes,
    *,
    sheet_name: str,
    image_filename: str,
) -> bytes:
    """受け取った PNG をシートに貼るだけの xlsx を返す（セル書き込みなし）。"""
    if not png_bytes:
        raise ValueError("PNG が空です。")

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet(sheet_name)
    worksheet.insert_image(
        "A1",
        image_filename,
        {"image_data": BytesIO(png_bytes)},
    )
    workbook.close()
    return bio.getvalue()
