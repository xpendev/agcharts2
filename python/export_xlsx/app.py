from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, Response, jsonify, request

from export_xlsx.brand_composition import build_brand_composition_xlsx
from export_xlsx.brand_diverging import build_brand_diverging_xlsx
from export_xlsx.buyer_dropout import build_buyer_dropout_xlsx
from export_xlsx.competitive_impact import build_competitive_impact_xlsx
from export_xlsx.data import SIZE_MIN, clamp_size, load_report_payload
from export_xlsx.purchase_in_out import build_purchase_in_out_xlsx
from export_xlsx.volume_matrix import (
    build_volume_matrix_png_xlsx,
    build_volume_matrix_xlsx,
    normalize_cell_style,
)
from export_xlsx.waterfall import build_waterfall_xlsx

DEFAULT_PORT = 5001


def create_app(data_dir: Path | None = None) -> Flask:
    app = Flask(__name__)
    resolved_data_dir = data_dir or _default_data_dir()

    @app.get("/api/xlsx/<report>")
    def export_xlsx_get(report: str) -> Response | tuple[Response, int]:
        if report in ("waterfall",):
            return jsonify(
                {
                    "error": "waterfall は POST で PNG を送ってください。",
                }
            ), 405
        return _export_from_json(report, resolved_data_dir)

    @app.post("/api/xlsx/<report>")
    def export_xlsx_post(report: str) -> Response | tuple[Response, int]:
        size_raw = request.args.get("size", SIZE_MIN)
        try:
            size = clamp_size(int(size_raw))
        except (TypeError, ValueError):
            return jsonify({"error": "size は整数で指定してください。"}), 400

        png_bytes = _read_png_body()
        if png_bytes is None:
            return jsonify({"error": "PNG 本体を送ってください。"}), 400

        try:
            if report == "waterfall":
                xlsx_bytes = build_waterfall_xlsx(png_bytes)
                file_name = f"{report}-{size}.xlsx"
            elif report == "volume-matrix":
                cell_style = normalize_cell_style(request.args.get("cellStyle"))
                if cell_style != "png":
                    return jsonify(
                        {
                            "error": "volume-matrix の PNG 貼付は cellStyle=png で POST してください。",
                        }
                    ), 400
                xlsx_bytes = build_volume_matrix_png_xlsx(png_bytes)
                file_name = f"{report}-{size}-png.xlsx"
            else:
                return jsonify(
                    {"error": f"POST（PNG）未対応の帳票: {report}"}
                ), 404
        except Exception as error:  # noqa: BLE001 — API 境界で返却
            return jsonify({"error": str(error)}), 500

        return _xlsx_response(xlsx_bytes, file_name)

    @app.get("/health")
    def health() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    return app


def _export_from_json(
    report: str, data_dir: Path
) -> Response | tuple[Response, int]:
    size_raw = request.args.get("size", SIZE_MIN)
    try:
        size = clamp_size(int(size_raw))
    except (TypeError, ValueError):
        return jsonify({"error": "size は整数で指定してください。"}), 400

    try:
        payload = load_report_payload(data_dir, report, size)
    except KeyError as error:
        return jsonify({"error": str(error)}), 404
    except FileNotFoundError as error:
        return jsonify({"error": str(error)}), 404

    try:
        if report == "brand-composition":
            xlsx_bytes = build_brand_composition_xlsx(payload)
            file_name = f"{report}-{size}.xlsx"
        elif report == "buyer-dropout":
            xlsx_bytes = build_buyer_dropout_xlsx(payload)
            file_name = f"{report}-{size}.xlsx"
        elif report == "brand-diverging":
            xlsx_bytes = build_brand_diverging_xlsx(payload)
            file_name = f"{report}-{size}.xlsx"
        elif report == "purchase-in-out":
            xlsx_bytes = build_purchase_in_out_xlsx(payload)
            file_name = f"{report}-{size}.xlsx"
        elif report == "competitive-impact":
            xlsx_bytes = build_competitive_impact_xlsx(payload)
            file_name = f"{report}-{size}.xlsx"
        elif report == "volume-matrix":
            cell_style = normalize_cell_style(request.args.get("cellStyle"))
            if cell_style == "png":
                return jsonify(
                    {
                        "error": "volume-matrix の png は POST で PNG を送ってください。",
                    }
                ), 405
            xlsx_bytes = build_volume_matrix_xlsx(
                payload,
                cell_style=cell_style,
            )
            file_name = f"{report}-{size}-{cell_style}.xlsx"
        else:
            return jsonify({"error": f"未対応の帳票: {report}"}), 404
    except Exception as error:  # noqa: BLE001 — API 境界で返却
        return jsonify({"error": str(error)}), 500

    return _xlsx_response(xlsx_bytes, file_name)


def _read_png_body() -> bytes | None:
    uploaded = request.files.get("png") or request.files.get("file")
    if uploaded is not None:
        data = uploaded.read()
        return data or None
    if request.content_type and "image/png" in request.content_type:
        data = request.get_data(cache=False)
        return data or None
    data = request.get_data(cache=False)
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return data
    return None


def _xlsx_response(xlsx_bytes: bytes, file_name: str) -> Response:
    return Response(
        xlsx_bytes,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )


def _default_data_dir() -> Path:
    env = os.environ.get("XLSX_DATA_DIR")
    if env:
        return Path(env)
    return Path(__file__).resolve().parents[2] / "api" / "data"


# CLI: python -m export_xlsx.app
if __name__ == "__main__":
    port = int(os.environ.get("XLSX_FLASK_PORT", DEFAULT_PORT))
    create_app().run(host="127.0.0.1", port=port, debug=True)
