from __future__ import annotations

from io import BytesIO
from typing import Any

from PIL import Image, ImageDraw, ImageFont

PREV_PERIOD = "直近・1ヶ月"
CURR_PERIOD = "当月・11月"

COLOR_OUTFLOW = "#c44b4b"
COLOR_INFLOW = "#5a9e4a"
COLOR_ARROW = "#8e8e8e"
COLOR_TEXT = "#111111"
COLOR_MUTED = "#555555"
COLOR_BRAND = "#222222"
COLOR_BORDER = "#cfd4d9"
COLOR_BOX_BORDER = "#777777"
COLOR_TRACK_BORDER = "#b8b8b8"
COLOR_MID_BG = "#f2f2f2"
COLOR_MID_BORDER = "#cccccc"

SUMMARY_GAP = 14
KPI_GAP = 14
PAIR_GAP = 12
KPI_PADDING_BOTTOM = 12
BOX_PAD_X = 18
BOX_PAD_Y = 8
BOX_MIN_WIDTH = 88
BOX_RADIUS = 10
ARROW_WIDTH = 52
ARROW_HEIGHT = 18
FLOW_SIDE_GAP = 8
FLOW_TITLE_MARGIN_BOTTOM = 6
RETAIN_CAP_ROW = 12
FLOW_ROW_HEIGHT = 34

SUMMARY_IMAGE_WIDTH = 720

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


def _text_width(
    draw: ImageDraw.ImageDraw,
    text: str,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
) -> int:
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]


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


def _draw_arrow(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    width: float,
    height: float,
) -> None:
    draw.polygon(
        [
            (x, y + height * 0.28),
            (x + width * 0.68, y + height * 0.28),
            (x + width * 0.68, y),
            (x + width, y + height * 0.5),
            (x + width * 0.68, y + height),
            (x + width * 0.68, y + height * 0.72),
            (x, y + height * 0.72),
        ],
        fill=COLOR_ARROW,
    )


def _draw_kpi_box(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    width: float,
    height: float,
    caption: str,
    value: str,
    caption_font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    value_font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
) -> None:
    draw.rounded_rectangle(
        (x, y, x + width, y + height),
        radius=BOX_RADIUS,
        fill="#ffffff",
        outline=COLOR_BOX_BORDER,
        width=1,
    )
    center_x = x + width / 2
    _draw_centered_text(
        draw,
        caption,
        center_x,
        y + BOX_PAD_Y + 7,
        caption_font,
        COLOR_MUTED,
    )
    _draw_centered_text(
        draw,
        value,
        center_x,
        y + height - BOX_PAD_Y - 11,
        value_font,
        COLOR_TEXT,
    )


def render_purchase_in_out_summary_png(
    payload: dict[str, Any],
    *,
    width: int = SUMMARY_IMAGE_WIDTH,
) -> tuple[bytes, int, int]:
    """④上段（from/to・帯）を PNG バイト列で返す（Web 版 Canvas 描画と同等レイアウト）。"""
    meta = payload.get("meta") or {}
    summary = payload.get("summary") or {}

    brand_label = str(meta.get("brandLabel") or "ブランド")
    title = str(meta.get("title") or "流出入（金額）")
    prev_value = f"{float(summary.get('previousPercent') or 0):.1f}%"
    curr_value = f"{float(summary.get('currentPercent') or 0):.1f}%"
    outflow_value = f"{float(summary.get('outflowPercent') or 0):.1f}%"
    retained_value = f"{float(summary.get('retainedPercent') or 0):.1f}%"
    inflow_value = f"+{float(summary.get('inflowPercent') or 0):.1f}%"

    measure_image = Image.new("RGB", (width, 10), "#ffffff")
    measure_draw = ImageDraw.Draw(measure_image)

    brand_font = _load_font(14, bold=True)
    side_font = _load_font(12, bold=True)
    caption_font = _load_font(11)
    value_font = _load_font(18, bold=True)
    title_font = _load_font(14, bold=True)
    band_font = _load_font(12, bold=True)

    brand_width = _text_width(measure_draw, brand_label, brand_font)
    box_width = max(
        BOX_MIN_WIDTH,
        _text_width(measure_draw, PREV_PERIOD, caption_font) + BOX_PAD_X * 2,
        _text_width(measure_draw, CURR_PERIOD, caption_font) + BOX_PAD_X * 2,
        _text_width(measure_draw, prev_value, value_font) + BOX_PAD_X * 2,
        _text_width(measure_draw, curr_value, value_font) + BOX_PAD_X * 2,
    )
    box_height = BOX_PAD_Y * 2 + 14 + 22
    pair_width = box_width * 2 + PAIR_GAP * 2 + ARROW_WIDTH
    kpi_width = brand_width + KPI_GAP + pair_width
    kpi_start_x = (width - kpi_width) / 2

    kpi_section_height = box_height + KPI_PADDING_BOTTOM + 1
    flow_title_y = kpi_section_height + SUMMARY_GAP + 10
    retain_cap_y = flow_title_y + 14
    flow_row_y = (
        retain_cap_y + RETAIN_CAP_ROW + FLOW_TITLE_MARGIN_BOTTOM + FLOW_ROW_HEIGHT / 2
    )
    height = int(
        kpi_section_height
        + SUMMARY_GAP
        + 14
        + RETAIN_CAP_ROW
        + FLOW_TITLE_MARGIN_BOTTOM
        + FLOW_ROW_HEIGHT
    )

    image = Image.new("RGB", (width, height), "#ffffff")
    draw = ImageDraw.Draw(image)

    kpi_center_y = box_height / 2
    pair_start_x = kpi_start_x + brand_width + KPI_GAP
    _draw_centered_text(
        draw,
        brand_label,
        kpi_start_x + brand_width / 2,
        kpi_center_y,
        brand_font,
        COLOR_BRAND,
    )
    _draw_kpi_box(
        draw,
        pair_start_x,
        0,
        box_width,
        box_height,
        PREV_PERIOD,
        prev_value,
        caption_font,
        value_font,
    )
    _draw_arrow(
        draw,
        pair_start_x + box_width + PAIR_GAP,
        kpi_center_y - ARROW_HEIGHT / 2,
        ARROW_WIDTH,
        ARROW_HEIGHT,
    )
    _draw_kpi_box(
        draw,
        pair_start_x + box_width + PAIR_GAP + ARROW_WIDTH + PAIR_GAP,
        0,
        box_width,
        box_height,
        CURR_PERIOD,
        curr_value,
        caption_font,
        value_font,
    )

    draw.line((0, kpi_section_height, width, kpi_section_height), fill=COLOR_BORDER, width=1)
    _draw_centered_text(draw, title, width / 2, flow_title_y, title_font, COLOR_TEXT)

    side_out_width = _text_width(measure_draw, "流出", side_font)
    side_in_width = _text_width(measure_draw, "流入", side_font)
    track_x = side_out_width + FLOW_SIDE_GAP * 2
    track_width = width - track_x - side_in_width - FLOW_SIDE_GAP * 2
    track_top = flow_row_y - FLOW_ROW_HEIGHT / 2
    segment_width = track_width / 3

    _draw_centered_text(
        draw,
        "流出",
        FLOW_SIDE_GAP + side_out_width / 2,
        flow_row_y,
        side_font,
        COLOR_OUTFLOW,
    )
    _draw_centered_text(
        draw,
        "流入",
        width - FLOW_SIDE_GAP - side_in_width / 2,
        flow_row_y,
        side_font,
        COLOR_INFLOW,
    )

    _draw_centered_text(
        draw,
        "維持",
        track_x + segment_width * 1.5,
        retain_cap_y,
        caption_font,
        COLOR_MUTED,
    )

    draw.rectangle(
        (track_x, track_top, track_x + track_width, track_top + FLOW_ROW_HEIGHT),
        outline=COLOR_TRACK_BORDER,
        width=1,
    )
    draw.rectangle(
        (track_x, track_top, track_x + segment_width, track_top + FLOW_ROW_HEIGHT),
        fill=COLOR_OUTFLOW,
    )
    draw.rectangle(
        (
            track_x + segment_width,
            track_top,
            track_x + segment_width * 2,
            track_top + FLOW_ROW_HEIGHT,
        ),
        fill=COLOR_MID_BG,
    )
    draw.line(
        (track_x + segment_width, track_top, track_x + segment_width, track_top + FLOW_ROW_HEIGHT),
        fill=COLOR_MID_BORDER,
        width=1,
    )
    draw.line(
        (
            track_x + segment_width * 2,
            track_top,
            track_x + segment_width * 2,
            track_top + FLOW_ROW_HEIGHT,
        ),
        fill=COLOR_MID_BORDER,
        width=1,
    )
    draw.rectangle(
        (
            track_x + segment_width * 2,
            track_top,
            track_x + track_width,
            track_top + FLOW_ROW_HEIGHT,
        ),
        fill=COLOR_INFLOW,
    )

    _draw_centered_text(
        draw,
        outflow_value,
        track_x + segment_width * 0.5,
        flow_row_y,
        band_font,
        COLOR_TEXT,
    )
    _draw_centered_text(
        draw,
        retained_value,
        track_x + segment_width * 1.5,
        flow_row_y,
        band_font,
        COLOR_TEXT,
    )
    _draw_centered_text(
        draw,
        inflow_value,
        track_x + segment_width * 2.5,
        flow_row_y,
        band_font,
        COLOR_TEXT,
    )

    buffer = BytesIO()
    image.save(buffer, format="PNG", dpi=(96, 96))
    return buffer.getvalue(), width, height
