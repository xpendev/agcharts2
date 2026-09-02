from __future__ import annotations

from io import BytesIO
from math import floor, log10
from typing import Any, Literal

from PIL import Image, ImageDraw, ImageFont

CHART_WIDTH = 800
CHART_HEIGHT = 480
PLOT_INSET = {"left": 56, "right": 20, "top": 52, "bottom": 72}

COLOR_POSITIVE = "#5a9e4a"
COLOR_POSITIVE_STROKE = "#3d6e32"
COLOR_NEGATIVE = "#c44b4b"
COLOR_NEGATIVE_STROKE = "#8a2f2f"
COLOR_TOTAL = "#8a8a8a"
COLOR_TOTAL_STROKE = "#555555"
COLOR_AXIS = "#333333"
COLOR_GRID = "#e0e0e0"
COLOR_TITLE = "#222222"
BACKGROUND = "#ffffff"

BarKind = Literal["start", "positive", "negative", "total"]

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


def _hex_to_rgb(color: str) -> tuple[int, int, int]:
    value = color.lstrip("#")
    if len(value) != 6:
        return (136, 136, 136)
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def _format_bar_label(kind: BarKind, display: float) -> str:
    if kind in ("start", "total"):
        return f"{abs(display):.1f}"
    if display > 0:
        return f"+{display:.1f}"
    return f"{display:.1f}"


def _bar_style(kind: BarKind) -> tuple[str, str]:
    if kind == "positive":
        return COLOR_POSITIVE, COLOR_POSITIVE_STROKE
    if kind == "negative":
        return COLOR_NEGATIVE, COLOR_NEGATIVE_STROKE
    return COLOR_TOTAL, COLOR_TOTAL_STROKE


def _build_bars(categories: list[str], values: list[float]) -> list[dict[str, Any]]:
    if not categories or not values:
        return []

    if len(categories) == 1:
        amount = float(values[0])
        return [
            {
                "label": categories[0],
                "bottom": 0.0,
                "top": amount,
                "level": amount,
                "display": amount,
                "kind": "start",
            }
        ]

    bars: list[dict[str, Any]] = []
    running = float(values[0])
    bars.append(
        {
            "label": categories[0],
            "bottom": 0.0,
            "top": running,
            "level": running,
            "display": running,
            "kind": "start",
        }
    )

    for index in range(1, len(categories) - 1):
        delta = float(values[index])
        bottom = running
        running += delta
        top = running
        bars.append(
            {
                "label": categories[index],
                "bottom": min(bottom, top),
                "top": max(bottom, top),
                "level": running,
                "display": delta,
                "kind": "positive" if delta >= 0 else "negative",
            }
        )

    total = float(values[-1])
    bars.append(
        {
            "label": categories[-1],
            "bottom": min(0.0, total),
            "top": max(0.0, total),
            "level": total,
            "display": total,
            "kind": "total",
        }
    )
    return bars


def _nice_ticks(y_min: float, y_max: float, *, count: int = 6) -> list[float]:
    if y_max <= y_min:
        return [y_min, y_max]
    span = y_max - y_min
    raw_step = span / max(count - 1, 1)
    if raw_step <= 0:
        return [y_min, y_max]
    step = 10 ** floor(log10(raw_step))
    normalized = raw_step / step
    if normalized <= 1:
        step *= 1
    elif normalized <= 2:
        step *= 2
    elif normalized <= 5:
        step *= 5
    else:
        step *= 10
    start = floor(y_min / step) * step
    ticks: list[float] = []
    value = start
    while value <= y_max + step * 0.001:
        if value >= y_min - step * 0.001:
            ticks.append(round(value, 10))
        value += step
    return ticks or [y_min, y_max]


def render_waterfall_png(
    payload: dict[str, Any],
    *,
    width: int = CHART_WIDTH,
    height: int = CHART_HEIGHT,
) -> tuple[bytes, int, int]:
    """③シェア流出入（ウォーターフォール）を Pillow で描画し PNG バイト列を返す。"""
    meta = payload.get("meta") or {}
    categories = [str(category) for category in (payload.get("categories") or [])]
    values = [float(value) for value in (payload.get("values") or [])]

    image_width = width
    image_height = height
    title = str(meta.get("title") or "流出入差(金額)")
    y_unit = str(meta.get("yUnit") or "(%)")

    bars = _build_bars(categories, values)
    if not bars:
        image = Image.new("RGB", (image_width, 120), BACKGROUND)
        draw = ImageDraw.Draw(image)
        draw.text((12, 48), "データがありません", fill=COLOR_AXIS)
        out = BytesIO()
        image.save(out, format="PNG")
        return out.getvalue(), image_width, 120

    plot_left = PLOT_INSET["left"]
    plot_top = PLOT_INSET["top"]
    plot_right = image_width - PLOT_INSET["right"]
    plot_bottom = image_height - PLOT_INSET["bottom"]
    plot_width = plot_right - plot_left
    plot_height = plot_bottom - plot_top

    y_min = min(0.0, min(bar["bottom"] for bar in bars))
    y_max = max(bar["top"] for bar in bars)
    pad = max(2.0, (y_max - y_min) * 0.08)
    y_min -= pad
    y_max += pad
    y_span = max(y_max - y_min, 1.0)

    def y_to_px(value: float) -> float:
        ratio = (value - y_min) / y_span
        return plot_bottom - ratio * plot_height

    title_font = _load_font(16, bold=True)
    axis_font = _load_font(11)
    label_font = _load_font(11, bold=True)
    tick_font = _load_font(11)

    image = Image.new("RGB", (image_width, image_height), BACKGROUND)
    draw = ImageDraw.Draw(image)

    draw.text((12, 12), title, font=title_font, fill=COLOR_TITLE)

    ticks = _nice_ticks(y_min, y_max)
    for tick in ticks:
        y = y_to_px(tick)
        draw.line((plot_left, y, plot_right, y), fill=COLOR_GRID, width=1)
        tick_text = f"{tick:.0f}" if abs(tick - round(tick)) < 0.01 else f"{tick:.1f}"
        bbox = draw.textbbox((0, 0), tick_text, font=tick_font)
        draw.text(
            (plot_left - bbox[2] + bbox[0] - 8, y - (bbox[3] - bbox[1]) / 2),
            tick_text,
            font=tick_font,
            fill=COLOR_AXIS,
        )

    axis_label = y_unit
    bbox = draw.textbbox((0, 0), axis_label, font=axis_font)
    draw.text(
        (12, plot_top + plot_height / 2 - (bbox[3] - bbox[1]) / 2),
        axis_label,
        font=axis_font,
        fill=COLOR_AXIS,
    )

    draw.line((plot_left, plot_top, plot_left, plot_bottom), fill=COLOR_AXIS, width=1)
    draw.line((plot_left, plot_bottom, plot_right, plot_bottom), fill=COLOR_AXIS, width=1)

    bar_count = len(bars)
    slot_width = plot_width / bar_count
    bar_width = slot_width * 0.62

    previous_level: float | None = None
    for index, bar in enumerate(bars):
        center_x = plot_left + (index + 0.5) * slot_width
        bottom_px = y_to_px(bar["bottom"])
        top_px = y_to_px(bar["top"])
        left = center_x - bar_width / 2
        right = center_x + bar_width / 2
        fill, stroke = _bar_style(bar["kind"])
        if previous_level is not None and bar["kind"] != "start":
            connector_y = y_to_px(previous_level)
            prev_center = plot_left + (index - 0.5) * slot_width
            prev_right = prev_center + bar_width / 2
            draw.line(
                (prev_right, connector_y, left, connector_y),
                fill=_hex_to_rgb(COLOR_AXIS),
                width=1,
            )
        draw.rectangle(
            (left, min(top_px, bottom_px), right, max(top_px, bottom_px)),
            fill=_hex_to_rgb(fill),
            outline=_hex_to_rgb(stroke),
            width=1,
        )

        previous_level = float(bar["level"])

        label = _format_bar_label(bar["kind"], bar["display"])
        if bar["kind"] == "negative":
            label_y = max(top_px, bottom_px) + 10
        else:
            label_y = min(top_px, bottom_px) - 8
        _draw_centered_text(draw, label, center_x, label_y, label_font, COLOR_AXIS)
        _draw_rotated_text(
            image,
            str(bar["label"]),
            center_x,
            plot_bottom + 34,
            axis_font,
            COLOR_AXIS,
        )

    out = BytesIO()
    image.save(out, format="PNG")
    return out.getvalue(), image_width, image_height
