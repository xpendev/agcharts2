from __future__ import annotations

import argparse
import sys
from pathlib import Path

from export_xlsx.brand_composition import build_brand_composition_xlsx
from export_xlsx.brand_diverging import build_brand_diverging_xlsx
from export_xlsx.buyer_dropout import build_buyer_dropout_xlsx
from export_xlsx.data import load_report_payload
from export_xlsx.purchase_in_out import build_purchase_in_out_xlsx
from export_xlsx.waterfall import build_waterfall_xlsx

BUILDERS = {
    "brand-composition": build_brand_composition_xlsx,
    "brand-diverging": build_brand_diverging_xlsx,
    "buyer-dropout": build_buyer_dropout_xlsx,
    "purchase-in-out": build_purchase_in_out_xlsx,
    "waterfall": build_waterfall_xlsx,
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
    args = parser.parse_args(argv)

    payload = load_report_payload(args.data_dir, args.report, args.size)
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
