from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPORT_FILE_PREFIX: dict[str, str] = {
    "brand-composition": "brand-composition",
    "buyer-dropout": "buyer-dropout",
    "brand-diverging": "brand-diverging",
    "competitive-impact": "competitive-impact",
    "purchase-in-out": "purchase-in-out",
    "volume-matrix": "volume-matrix",
}

SIZE_MIN = 1
SIZE_MAX = 50


def clamp_size(size: int) -> int:
    return max(SIZE_MIN, min(SIZE_MAX, int(size)))


def load_report_payload(data_dir: Path, report: str, size: int) -> dict[str, Any]:
    prefix = REPORT_FILE_PREFIX.get(report)
    if prefix is None:
        raise KeyError(f"未対応の帳票: {report}")
    n = clamp_size(size)
    path = data_dir / f"{prefix}-{n}.json"
    if not path.is_file():
        raise FileNotFoundError(f"データファイルがありません: {path}")
    return json.loads(path.read_text(encoding="utf-8"))
