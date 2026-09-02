from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, Response, jsonify, request

from export_xlsx.brand_composition import build_brand_composition_xlsx
from export_xlsx.brand_diverging import build_brand_diverging_xlsx
from export_xlsx.buyer_dropout import build_buyer_dropout_xlsx
from export_xlsx.competitive_impact import build_competitive_impact_xlsx
from export_xlsx.purchase_in_out import (
    build_purchase_in_out_xlsx,
    normalize_summary_style,
)
from export_xlsx.volume_matrix import build_volume_matrix_xlsx, normalize_cell_style
from export_xlsx.waterfall import build_waterfall_xlsx
from export_xlsx.data import SIZE_MIN, clamp_size, load_report_payload

DEFAULT_PORT = 5001


def create_app(data_dir: Path | None = None) -> Flask:
    app = Flask(__name__)
    resolved_data_dir = data_dir or _default_data_dir()

    @app.get("/api/xlsx/<report>")
    def export_xlsx(report: str) -> Response | tuple[Response, int]:
        size_raw = request.args.get("size", SIZE_MIN)
        try:
            size = clamp_size(int(size_raw))
        except (TypeError, ValueError):
            return jsonify({"error": "size は整数で指定してください。"}), 400

        try:
            payload = load_report_payload(resolved_data_dir, report, size)
        except KeyError as error:
            return jsonify({"error": str(error)}), 404
        except FileNotFoundError as error:
            return jsonify({"error": str(error)}), 404

        try:
            if report == "brand-composition":
                xlsx_bytes = build_brand_composition_xlsx(payload)
            elif report == "buyer-dropout":
                xlsx_bytes = build_buyer_dropout_xlsx(payload)
            elif report == "brand-diverging":
                xlsx_bytes = build_brand_diverging_xlsx(payload)
            elif report == "purchase-in-out":
                summary_style = normalize_summary_style(
                    request.args.get("summaryStyle")
                )
                xlsx_bytes = build_purchase_in_out_xlsx(
                    payload,
                    summary_style=summary_style,
                )
                file_name = f"{report}-{size}-{summary_style}.xlsx"
            elif report == "competitive-impact":
                xlsx_bytes = build_competitive_impact_xlsx(payload)
            elif report == "volume-matrix":
                cell_style = normalize_cell_style(request.args.get("cellStyle"))
                xlsx_bytes = build_volume_matrix_xlsx(
                    payload,
                    cell_style=cell_style,
                )
                file_name = f"{report}-{size}-{cell_style}.xlsx"
            elif report == "waterfall":
                xlsx_bytes = build_waterfall_xlsx(payload)
            else:
                return jsonify({"error": f"未対応の帳票: {report}"}), 404
        except Exception as error:  # noqa: BLE001 — API 境界で返却
            return jsonify({"error": str(error)}), 500

        if report not in ("volume-matrix", "purchase-in-out"):
            file_name = f"{report}-{size}.xlsx"
        return Response(
            xlsx_bytes,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )

    @app.get("/health")
    def health() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    return app


def _default_data_dir() -> Path:
    env = os.environ.get("XLSX_DATA_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2] / "api" / "data"


# CLI: python -m export_xlsx.app
if __name__ == "__main__":
    port = int(os.environ.get("XLSX_FLASK_PORT", DEFAULT_PORT))
    create_app().run(host="127.0.0.1", port=port, debug=True)
