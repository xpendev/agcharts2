from __future__ import annotations

from io import BytesIO
from typing import Any, Literal

from xlsxwriter import Workbook

from export_xlsx.volume_matrix_png import render_volume_matrix_png

VolumeMatrixCellStyle = Literal["icon-set", "data-bar", "png"]

# 添付 Excel「書式ルールの編集」相当: 5段階の円アイコン（5_quarters）
_ICON_THRESHOLDS: tuple[tuple[str, str, float], ...] = (
    (">=", "number", 80),
    (">=", "number", 60),
    (">=", "number", 40),
    (">=", "number", 20),
)

# データバー: 最小0・最大100・単色塗りつぶし・枠線なし
_DATA_BAR_COLOR = "#4472C4"


def normalize_cell_style(raw: str | None) -> VolumeMatrixCellStyle:
    if raw in ("data-bar", "data_bar", "databar"):
        return "data-bar"
    if raw in ("png", "image"):
        return "png"
    return "icon-set"


CATEGORY_USER_ID = "category-user"


VOLUME_MATRIX_SHEET_TITLE = "⑦ブランドクロス"
VOLUME_MATRIX_PERIOD_LABEL = "併売26/05-26/07"
# D3 = 0-index (row 2, col 3)
_PERIOD_LABEL_ROW = 2
_PERIOD_LABEL_COL = 3


def build_volume_matrix_xlsx(
    payload: dict[str, Any],
    *,
    cell_style: VolumeMatrixCellStyle = "icon-set",
) -> bytes:
    """
    ⑦ブランドクロス。
    icon-set / data-bar: (N+1)×N 表＋条件付き書式。
    png: チャート相当の PNG をシートに貼り付け。
    """
    if cell_style == "png":
        return _build_volume_matrix_png_xlsx(payload)

    columns: list[dict[str, Any]] = list(payload.get("columns") or [])
    rows: list[dict[str, Any]] = list(payload.get("rows") or [])
    cells: list[dict[str, Any]] = list(payload.get("cells") or [])

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
    period_label = workbook.add_format(
        {
            "bold": True,
            "font_size": 11,
            "align": "center",
            "valign": "vcenter",
        }
    )
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

    worksheet.write("A1", VOLUME_MATRIX_SHEET_TITLE, bold)
    worksheet.set_column("A:A", 16)

    col_count = len(columns)
    if col_count:
        worksheet.set_column(1, col_count, 11)

    # 行3: D3 のみ期間ラベル / 行4: 列見出し / 行5〜: データ
    header_row = 4
    data_start_row = 5

    worksheet.write(
        _PERIOD_LABEL_ROW,
        _PERIOD_LABEL_COL,
        VOLUME_MATRIX_PERIOD_LABEL,
        period_label,
    )

    for j, column in enumerate(columns):
        worksheet.write(
            header_row,
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
            is_diagonal = row_id == col_id and row_id != CATEGORY_USER_ID
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


def _build_volume_matrix_png_xlsx(payload: dict[str, Any]) -> bytes:
    meta = payload.get("meta") or {}
    note = str(meta.get("note") or "")

    png_bytes, _, _ = render_volume_matrix_png(payload)

    bio = BytesIO()
    workbook = Workbook(bio, {"in_memory": True})
    worksheet = workbook.add_worksheet("ブランドクロス")

    bold = workbook.add_format({"bold": True, "font_size": 14})
    note_format = workbook.add_format({"font_size": 10, "font_color": "#555555"})

    worksheet.write("A1", VOLUME_MATRIX_SHEET_TITLE, bold)
    if note:
        worksheet.write("A2", note, note_format)

    worksheet.insert_image(
        "A4",
        "volume-matrix.png",
        {"image_data": BytesIO(png_bytes)},
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
