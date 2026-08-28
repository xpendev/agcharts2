from __future__ import annotations

from io import BytesIO
from typing import Any, Literal

from xlsxwriter import Workbook

VolumeMatrixCellStyle = Literal["icon-set", "data-bar"]

# 添付 Excel「書式ルールの編集」相当: 5段階の円アイコン（5_quarters）
_ICON_THRESHOLDS: tuple[tuple[str, str, float], ...] = (
    (">=", "number", 80),
    (">=", "number", 60),
    (">=", "number", 40),
    (">=", "number", 20),
)

# データバー: 最小0・最大100・単色塗りつぶし・枠線なし
_DATA_BAR_COLOR = "#4472C4"

_CELL_STYLE_LABELS: dict[VolumeMatrixCellStyle, str] = {
    "icon-set": "条件付き書式（アイコンセット）",
    "data-bar": "条件付き書式（データバー）",
}


def normalize_cell_style(raw: str | None) -> VolumeMatrixCellStyle:
    if raw in ("data-bar", "data_bar", "databar"):
        return "data-bar"
    return "icon-set"


def build_volume_matrix_xlsx(
    payload: dict[str, Any],
    *,
    cell_style: VolumeMatrixCellStyle = "icon-set",
) -> bytes:
    """
    ⑦ブランドクロス。
    Bubble チャート非対応のため、N×N 表＋条件付き書式で近似する。
    cell_style: icon-set（5_quarters）または data-bar（0〜100）。
    """
    meta = payload.get("meta") or {}
    columns: list[dict[str, Any]] = list(payload.get("columns") or [])
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    cells: list[dict[str, Any]] = list(payload.get("cells") or [])

    title = str(meta.get("title") or "ボリューム付数表")
    note = str(meta.get("note") or "*数値：％（行）（人数ベース）")
    past_label = str(meta.get("pastPeriodLabel") or "過去購入")
    current_label = str(meta.get("currentPeriodLabel") or "現在購入")
    style_label = _CELL_STYLE_LABELS[cell_style]

    value_by_pair = {
        (str(cell.get("pastId") or ""), str(cell.get("currentId") or "")): float(
            cell.get("value") or 0
        )
        for cell in cells
    }

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("ブランドクロス")

    bold = workbook.add_format({"bold": True, "font_size": 14})
    caption = workbook.add_format({"font_size": 9, "font_color": "#555555"})
    axis_title = workbook.add_format({"bold": True, "font_size": 11})
    col_header = workbook.add_format(
        {
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "rotation": 270,
            "border": 1,
            "border_color": "#333333",
            "bg_color": "#F2F2F2",
        }
    )
    row_header = workbook.add_format(
        {
            "bold": True,
            "align": "right",
            "valign": "vcenter",
            "border": 1,
            "border_color": "#333333",
            "bg_color": "#F2F2F2",
        }
    )
    diag_format = workbook.add_format(
        {
            "align": "center",
            "valign": "vcenter",
            "font_color": "#888888",
            "border": 1,
            "border_color": "#CCCCCC",
            "bg_color": "#FFFFFF",
        }
    )
    value_format = workbook.add_format(
        {
            "align": "center",
            "valign": "vcenter",
            "num_format": "0.0",
            "border": 1,
            "border_color": "#333333",
        }
    )

    worksheet.write("A1", f"・⑦ブランドクロス / {title}", bold)
    worksheet.write(
        "A2",
        f"{note}（Excel 近似: {style_label}。Bubble チャート非対応）",
        caption,
    )
    worksheet.set_column("A:A", 16)

    col_count = len(columns)
    if col_count:
        worksheet.set_column(1, col_count, 11)

    corner_row = 3
    data_start_row = 4
    worksheet.write(corner_row, 0, past_label, axis_title)
    worksheet.write(corner_row, 1, current_label, axis_title)

    for j, column in enumerate(columns):
        worksheet.write(
            corner_row,
            j + 1,
            str(column.get("label") or ""),
            col_header,
        )

    data_end_row = data_start_row + len(rows) - 1 if rows else data_start_row
    data_end_col = col_count

    for i, row in enumerate(rows):
        excel_row = data_start_row + i
        row_id = str(row.get("id") or "")
        worksheet.set_row(excel_row, 28)
        worksheet.write(
            excel_row,
            0,
            str(row.get("label") or ""),
            row_header,
        )

        for j, column in enumerate(columns):
            col_id = str(column.get("id") or "")
            value = value_by_pair.get((row_id, col_id), 0.0)
            is_diagonal = row_id == col_id
            if is_diagonal:
                worksheet.write(excel_row, j + 1, "-", diag_format)
            else:
                worksheet.write_number(
                    excel_row,
                    j + 1,
                    value,
                    value_format,
                )

    if rows and col_count:
        _apply_cell_conditional_format(
            worksheet,
            data_start_row,
            1,
            data_end_row,
            data_end_col,
            cell_style,
        )

    workbook.close()
    return bio.getvalue()


def _apply_cell_conditional_format(
    worksheet: Any,
    first_row: int,
    first_col: int,
    last_row: int,
    last_col: int,
    cell_style: VolumeMatrixCellStyle,
) -> None:
    if cell_style == "data-bar":
        worksheet.conditional_format(
            first_row,
            first_col,
            last_row,
            last_col,
            {
                "type": "data_bar",
                "min_type": "num",
                "min_value": 0,
                "max_type": "num",
                "max_value": 100,
                "bar_color": _DATA_BAR_COLOR,
                "bar_solid": True,
                "bar_no_border": True,
                "data_bar_2010": True,
            },
        )
        return

    icon_icons = [
        {"criteria": criteria, "type": value_type, "value": threshold}
        for criteria, value_type, threshold in _ICON_THRESHOLDS
    ]
    worksheet.conditional_format(
        first_row,
        first_col,
        last_row,
        last_col,
        {
            "type": "icon_set",
            "icon_style": "5_quarters",
            "icons": icon_icons,
        },
    )
