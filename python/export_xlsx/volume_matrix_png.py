from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image, ImageDraw, ImageFont

CATEGORY_USER_ID = "category-user"
CATEGORY_USER_COLOR = "#e07070"
BRAND_ROW_COLORS = (
    "#8fbf5a",
    "#2f7a3a",
    "#d4c45a",
    "#d8b89a",
    "#a85a28",
    "#6aa8d8",
    "#2a4a8a",
)

PLOT_INSET = {"left": 95, "right": 24, "top": 100, "bottom": 16}
SIZE_DOMAIN_MAX = 55.0
BUBBLE_CELL_FILL_RATIO = 0.88
BUBBLE_MIN_MAX = 8
TITLE_COLOR = "#222222"
AXIS_LABEL = "#333333"
GRID = "#b0b0b0"
BACKGROUND = "#ffffff"
VOLUME_MATRIX_TITLE = "⑦ブランドクロス"

_FONT_CANDIDATES: tuple[tuple[str, ...], ...] = (
    (
        "C:/Windows/Fonts/YuGothB.ttc",
        "C:/Windows/Fonts/meiryob.ttc",
        "C:/Windows/Fonts/segoeuib.ttf",
    ),
    (
        "C:/Windows/Fonts/YuGothM.ttc",
        "C:/Windows/Fonts/meiryo.ttc",
        "C:/Windows/Fonts/segoeui.ttf",
    ),
)


def _load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = _FONT_CANDIDATES[0] if bold else _FONT_CANDIDATES[1]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _hex_to_rgb(color: str) -> tuple[int, int, int]:
    value = color.lstrip("#")
    if len(value) != 6:
        return (136, 136, 136)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def _row_fill(past_id: str, row_index: int) -> str:
    if past_id == CATEGORY_USER_ID:
        return CATEGORY_USER_COLOR
    brand_index = max(0, row_index - 1)
    return BRAND_ROW_COLORS[brand_index % len(BRAND_ROW_COLORS)]


def _draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    center_x: float,
    center_y: float,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    draw.text(
        (center_x - width / 2, center_y - height / 2),
        text,
        font=font,
        fill=fill,
    )


def _draw_rotated_text(
    image: Image.Image,
    text: str,
    center_x: float,
    center_y: float,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
) -> None:
    measure = ImageDraw.Draw(image)
    bbox = measure.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    pad = 4
    layer = Image.new("RGBA", (text_w + pad * 2, text_h + pad * 2), (255, 255, 255, 0))
    layer_draw = ImageDraw.Draw(layer)
    layer_draw.text((pad - bbox[0], pad - bbox[1]), text, font=font, fill=fill)
    rotated = layer.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)
    image.paste(
        rotated,
        (int(center_x - rotated.width / 2), int(center_y - rotated.height / 2)),
        rotated,
    )


def _draw_dashed_line(
    draw: ImageDraw.ImageDraw,
    start: tuple[float, float],
    end: tuple[float, float],
    *,
    dash: tuple[int, int] = (4, 3),
    fill: str = GRID,
    width: int = 1,
) -> None:
    x0, y0 = start
    x1, y1 = end
    length = ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5
    if length == 0:
        return
    dash_len, gap_len = dash
    step = dash_len + gap_len
    count = int(length // step) + 1
    for i in range(count):
        start_dist = i * step
        end_dist = min(start_dist + dash_len, length)
        if start_dist >= length:
            break
        sx = x0 + (x1 - x0) * start_dist / length
        sy = y0 + (y1 - y0) * start_dist / length
        ex = x0 + (x1 - x0) * end_dist / length
        ey = y0 + (y1 - y0) * end_dist / length
        draw.line((sx, sy, ex, ey), fill=fill, width=width)


def _bubble_diameter(value: float, cell_px: float, size_domain_max: float) -> float:
    cell_diameter = cell_px * BUBBLE_CELL_FILL_RATIO
    max_size = max(BUBBLE_MIN_MAX, cell_diameter)
    min_size = max(6.0, max_size * 0.28)
    if value <= 0 or size_domain_max <= 0:
        return min_size
    ratio = min(1.0, value / size_domain_max)
    return min_size + (max_size - min_size) * ratio


def _label_font_size(max_bubble: float) -> int:
    return max(8, min(24, round(max_bubble * 0.17)))


def render_volume_matrix_png(
    payload: dict[str, Any],
    *,
    width: int | None = None,
    height: int | None = None,
) -> tuple[bytes, int, int]:
    """⑦ブランドクロスを Pillow で描画し PNG バイト列を返す。"""
    meta = payload.get("meta") or {}
    columns: list[dict[str, Any]] = list(payload.get("columns") or [])
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    cells: list[dict[str, Any]] = list(payload.get("cells") or [])

    col_count = len(columns)
    row_count = len(rows)
    if col_count == 0 or row_count == 0:
        image = Image.new("RGB", (800, 120), BACKGROUND)
        draw = ImageDraw.Draw(image)
        draw.text((12, 48), "データがありません", fill=AXIS_LABEL)
        out = BytesIO()
        image.save(out, format="PNG")
        return out.getvalue(), 800, 120

    cell_px = max(36, min(72, 720 // max(col_count, row_count, 1)))
    plot_w = col_count * cell_px
    plot_h = row_count * cell_px
    image_w = width or max(800, PLOT_INSET["left"] + PLOT_INSET["right"] + plot_w)
    image_h = height or max(600, PLOT_INSET["top"] + PLOT_INSET["bottom"] + plot_h)
    plot_left = PLOT_INSET["left"]
    plot_top = PLOT_INSET["top"]
    plot_right = image_w - PLOT_INSET["right"]
    plot_bottom = image_h - PLOT_INSET["bottom"]
    plot_width = plot_right - plot_left
    plot_height = plot_bottom - plot_top
    cell_w = plot_width / col_count
    cell_h = plot_height / row_count

    value_by_pair = {
        (str(cell.get("pastId") or ""), str(cell.get("currentId") or "")): float(
            cell.get("value") or 0
        )
        for cell in cells
    }
    max_value = max(
        (
            value
            for (past_id, current_id), value in value_by_pair.items()
            if not (past_id == current_id and past_id != CATEGORY_USER_ID)
        ),
        default=0.0,
    )
    size_domain_max = max_value if max_value > 0 else SIZE_DOMAIN_MAX
    max_bubble = _bubble_diameter(max_value or size_domain_max, min(cell_w, cell_h), size_domain_max)
    label_font = _load_font(_label_font_size(max_bubble), bold=True)
    axis_font = _load_font(11)
    title_font = _load_font(16, bold=True)
    subtitle_font = _load_font(10)

    note = str(meta.get("note") or "")

    image = Image.new("RGB", (image_w, image_h), BACKGROUND)
    draw = ImageDraw.Draw(image)

    draw.text((12, 12), VOLUME_MATRIX_TITLE, font=title_font, fill=TITLE_COLOR)
    if note:
        draw.text((12, 36), note, font=subtitle_font, fill=AXIS_LABEL)

    draw.line(
        (plot_left, plot_top, plot_right, plot_top),
        fill="#222222",
        width=1,
    )
    draw.line(
        (plot_left, plot_top, plot_left, plot_bottom),
        fill="#222222",
        width=1,
    )

    for i in range(1, col_count):
        x = plot_left + i * cell_w
        _draw_dashed_line(draw, (x, plot_top), (x, plot_bottom))
    for i in range(1, row_count):
        y = plot_top + i * cell_h
        _draw_dashed_line(draw, (plot_left, y), (plot_right, y))

    for j, column in enumerate(columns):
        center_x = plot_left + (j + 0.5) * cell_w
        _draw_rotated_text(
            image,
            str(column.get("label") or ""),
            center_x,
            plot_top - 28,
            axis_font,
            AXIS_LABEL,
        )

    for i, row in enumerate(rows):
        center_y = plot_top + (i + 0.5) * cell_h
        row_label = str(row.get("label") or "")
        bbox = draw.textbbox((0, 0), row_label, font=axis_font)
        text_w = bbox[2] - bbox[0]
        draw.text(
            (plot_left - text_w - 8, center_y - (bbox[3] - bbox[1]) / 2),
            row_label,
            font=axis_font,
            fill=AXIS_LABEL,
        )

    for i, row in enumerate(rows):
        row_id = str(row.get("id") or "")
        fill_color = _row_fill(row_id, i)
        for j, column in enumerate(columns):
            col_id = str(column.get("id") or "")
            value = value_by_pair.get((row_id, col_id), 0.0)
            hide_bubble = row_id != CATEGORY_USER_ID and row_id == col_id
            center_x = plot_left + (j + 0.5) * cell_w
            center_y = plot_top + (i + 0.5) * cell_h
            if hide_bubble:
                _draw_centered_text(
                    draw,
                    "-",
                    center_x,
                    center_y,
                    label_font,
                    "#111111",
                )
                continue
            diameter = _bubble_diameter(value, min(cell_w, cell_h), size_domain_max)
            radius = diameter / 2
            rgb = _hex_to_rgb(fill_color)
            draw.ellipse(
                (
                    center_x - radius,
                    center_y - radius,
                    center_x + radius,
                    center_y + radius,
                ),
                fill=rgb,
                outline=_hex_to_rgb("#333333"),
                width=1,
            )
            label = f"{value:.1f}"
            _draw_centered_text(
                draw,
                label,
                center_x,
                center_y,
                label_font,
                "#111111",
            )

    out = BytesIO()
    image.save(out, format="PNG")
    return out.getvalue(), image_w, image_h
