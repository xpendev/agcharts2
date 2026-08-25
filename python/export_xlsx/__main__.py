from __future__ import annotations

import argparse
import sys
from pathlib import Path

from export_xlsx.brand_composition import build_brand_composition_xlsx
from export_xlsx.data import load_report_payload


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="帳票 xlsx を生成する（xlsxwriter）")
    parser.add_argument(
        "report",
        choices=["brand-composition"],
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
    if args.report == "brand-composition":
        xlsx_bytes = build_brand_composition_xlsx(payload)
    else:
        raise SystemExit(f"未対応の帳票: {args.report}")

    if args.output is not None:
        args.output.write_bytes(xlsx_bytes)
    else:
        sys.stdout.buffer.write(xlsx_bytes)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
