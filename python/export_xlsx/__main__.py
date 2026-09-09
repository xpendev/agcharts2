from __future__ import annotations

import argparse
import sys
from pathlib import Path

from export_xlsx.brand_composition import build_brand_composition_xlsx
from export_xlsx.brand_diverging import build_brand_diverging_xlsx
from export_xlsx.buyer_dropout import build_buyer_dropout_xlsx
from export_xlsx.competitive_impact import build_competitive_impact_xlsx
from export_xlsx.data import load_report_payload
from export_xlsx.purchase_in_out import build_purchase_in_out_xlsx
from export_xlsx.volume_matrix import (
    build_volume_matrix_png_xlsx,
    build_volume_matrix_xlsx,
    normalize_cell_style,
)
from export_xlsx.waterfall import build_waterfall_xlsx

BUILDERS = {
    "brand-composition": build_brand_composition_xlsx,
    "brand-diverging": build_brand_diverging_xlsx,
    "buyer-dropout": build_buyer_dropout_xlsx,
    "competitive-impact": build_competitive_impact_xlsx,
    "purchase-in-out": build_purchase_in_out_xlsx,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="帳票 xlsx を生成する（xlsxwriter）")
    parser.add_argument(
        "report",
        choices=sorted(
            [
                *BUILDERS.keys(),
                "volume-matrix",
                "waterfall",
            ]
        ),
        help="帳票キー",
    )
    parser.add_argument("--size", type=int, required=True, help="データ size パラメータ")
    parser.add_argument(
        "--data-dir",
        type=Path,
        help="api/data ディレクトリ（JSON 帳票用）",
    )
    parser.add_argument(
        "--png",
        type=Path,
        help="貼り付ける PNG（waterfall / volume-matrix png 用）",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="出力パス（省略時は stdout にバイナリ出力）",
    )
    parser.add_argument(
        "--cell-style",
        choices=("icon-set", "data-bar", "png"),
        default="icon-set",
        help="volume-matrix の出力形式（icon-set / data-bar / png）",
    )
    args = parser.parse_args(argv)

    if args.report == "waterfall":
        if args.png is None:
            raise SystemExit("waterfall は --png が必要です。")
        xlsx_bytes = build_waterfall_xlsx(args.png.read_bytes())
    elif args.report == "volume-matrix":
        cell_style = normalize_cell_style(args.cell_style)
        if cell_style == "png":
            if args.png is None:
                raise SystemExit("volume-matrix の png は --png が必要です。")
            xlsx_bytes = build_volume_matrix_png_xlsx(args.png.read_bytes())
        else:
            if args.data_dir is None:
                raise SystemExit("--data-dir が必要です。")
            payload = load_report_payload(args.data_dir, args.report, args.size)
            xlsx_bytes = build_volume_matrix_xlsx(
                payload,
                cell_style=cell_style,
            )
    else:
        if args.data_dir is None:
            raise SystemExit("--data-dir が必要です。")
        payload = load_report_payload(args.data_dir, args.report, args.size)
        builder = BUILDERS[args.report]
        xlsx_bytes = builder(payload)

    if args.output is not None:
        args.output.write_bytes(xlsx_bytes)
    else:
        sys.stdout.buffer.write(xlsx_bytes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
