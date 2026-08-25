# Excel 出力（Flask + xlsxwriter）

本番想定どおり **Flask API** が xlsx を生成し、Vite が `/api/xlsx/*` を Flask にプロキシします。

## セットアップ

```bash
npm run xlsx:install
```

## 起動

```bash
npm run dev
```

Vite（フロント）と Flask（`127.0.0.1:5001`）が同時に起動します。

## Flask 単体

```bash
cd python
python -m export_xlsx.app
```

`GET http://127.0.0.1:5001/api/xlsx/brand-composition?size=4`

## CLI（デバッグ用）

```bash
cd python
python -m export_xlsx brand-composition --size 4 --data-dir ../api/data -o ../tmp.xlsx
```
