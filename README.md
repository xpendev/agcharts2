# 曼荼羅チャート検証スパイク

Vite + React + TypeScript で、曼荼羅チャートの実装方式を比較するサンプルです。

## 前提

- [Node.js](https://nodejs.org/) 18 以上（LTS 推奨）
- npm

## セットアップと実行

```bash
npm install
npm run dev
```

通常は [http://localhost:5173](http://localhost:5173) を開きます（`/` は実装選択のリンク一覧）。

| URL | 内容 |
| --- | --- |
| `/` | トップ（実装へのリンクのみ） |
| `/transition-network` | スクラッチ（React + SVG） |
| `/transition-network/cytoscape` | Cytoscape.js（無料） |
| `/transition-network/gojs` | GoJS（評価版・有償） |
| `/transition-network/agcharts` | AG Charts Chord（Enterprise） |
| `/api/transition-network?count=n` | 本番バックエンド想定のモック API（nodes / edges） |

モック API のデータは件数ごとの専用 JSON です（`api/data/transition-network-2.json` 〜 `transition-network-30.json`）。

詳細:

- 全体: [`docs/transition-network.md`](docs/transition-network.md)
- スクラッチ: [`docs/component-scratch.md`](docs/component-scratch.md)
- Cytoscape: [`docs/component-cytoscape.md`](docs/component-cytoscape.md)
- GoJS: [`docs/component-gojs.md`](docs/component-gojs.md)
- AG Charts: [`docs/component-agcharts.md`](docs/component-agcharts.md)

## その他のコマンド

| コマンド | 説明 |
| --- | --- |
| `npm run build` | 本番用ビルド |
| `npm run preview` | ビルド結果のプレビュー |

## 実装フォルダ

- スクラッチ（6 files）: [`src/transitionNetworkScratch/`](src/transitionNetworkScratch/)
- Cytoscape（4 files）: [`src/transitionNetworkCytoscape/`](src/transitionNetworkCytoscape/)
- GoJS（4 files）: [`src/transitionNetworkGoJs/`](src/transitionNetworkGoJs/)
- AG Charts Chord（4 files）: [`src/transitionNetworkAgCharts/`](src/transitionNetworkAgCharts/)

共通コンポーネントは使わず、実装ごとにフォルダを分離しています。UI は各 `*Page.tsx` に集約し、グラフ見た目は `*Styles.ts`（専用 CSS なし）です。

## 注意

- GoJS は評価版のためウォーターマークが出ることがあります。本番利用にはライセンスが必要です。
- AG Charts Chord は Enterprise 機能です。評価利用時はウォーターマークが出ることがあります。
