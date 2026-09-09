from __future__ import annotations

from export_xlsx.png_xlsx import build_png_only_xlsx


def build_waterfall_xlsx(png_bytes: bytes) -> bytes:
    """③シェア流出入。受け取った PNG を Excel に貼付するだけ。"""
    return build_png_only_xlsx(
        png_bytes,
        sheet_name="シェア流出入",
        image_filename="waterfall.png",
    )
