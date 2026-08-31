from __future__ import annotations

import argparse
import sys
from pathlib import Path

from export_xlsx.brand_composition import build_brand_composition_xlsx
from export_xlsx.brand_diverging import build_brand_diverging_xlsx
from export_xlsx.buyer_dropout import build_buyer_dropout_xlsx
from export_xlsx.competitive_impact import build_competitive_impact_xlsx
from export_xlsx.data import load_report_payload
from export_xlsx.purchase_in_out import (
    build_purchase_in_out_xlsx,
    normalize_summary_style,
)
from export_xlsx.volume_matrix import build_volume_matrix_xlsx, normalize_cell_style

BUILDERS = {
    "brand-composition": build_brand_composition_xlsx,
    "brand-diverging": build_brand_diverging_xlsx,
    "buyer-dropout": build_buyer_dropout_xlsx,
    "competitive-impact": build_competitive_impact_xlsx,
    "purchase-in-out": build_purchase_in_out_xlsx,
    "volume-matrix": build_volume_matrix_xlsx,
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="帳票 xlsx を生成する（xlsxwriter）")
    parser.add_argument(
        "report",
        choices=sorted(BUILDERS.keys()),
        help="帳票キー",
    )
    parser.add_argument("--size", type=int, required=True, help="データ size パラメータ")
    parser.add_argument(
        "--data-dir",
        type=Path,
        required=True,
        help="api/data ディレクトリ",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="出力パス（省略時は stdout にバイナリ出力）",
    )
    parser.add_argument(
        "--cell-style",
        choices=("icon-set", "data-bar"),
        default="icon-set",
        help="volume-matrix の条件付き書式（icon-set / data-bar）",
    )
    parser.add_argument(
        "--summary-style",
        choices=("png", "objects"),
        default="png",
        help="purchase-in-out の上段（png / objects）",
    )
    args = parser.parse_args(argv)

    payload = load_report_payload(args.data_dir, args.report, args.size)
    if args.report == "volume-matrix":
        xlsx_bytes = build_volume_matrix_xlsx(
            payload,
            cell_style=normalize_cell_style(args.cell_style),
        )
    elif args.report == "purchase-in-out":
        xlsx_bytes = build_purchase_in_out_xlsx(
            payload,
            summary_style=normalize_summary_style(args.summary_style),
        )
    else:
        builder = BUILDERS.get(args.report)
        if builder is None:
            raise SystemExit(f"未対応の帳票: {args.report}")
        xlsx_bytes = builder(payload)

    if args.output is not None:
        args.output.write_bytes(xlsx_bytes)
    else:
        sys.stdout.buffer.write(xlsx_bytes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
