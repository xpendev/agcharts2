import type { EdgeSingular } from 'cytoscape'

/** 件数から線幅を求める（極少〜極多でおおよそ 1〜8） */
function edgeWidthFromValue(value: number, hoverBoost = 0): number {
  const magnitude = Math.sqrt(Math.abs(value))
  const base = (hoverBoost > 0 ? 1.4 : 0.9) + magnitude / 6
  const cap = hoverBoost > 0 ? 9 : 8
  return Math.min(cap, base)
}

/** Cytoscape グラフ本体の見た目定義（ノード／エッジ） */
export const cytoscapeStyles = [
  {
    // --- 通常ノード ---
    selector: 'node',
    style: {
      shape: 'ellipse' as const,
      width: 168,
      height: 64,
      'background-color': '#3d7fa8',
      'border-width': 1,
      'border-color': '#9fd0ef',
      label: 'data(label)',
      color: '#ffffff',
      'text-wrap': 'wrap' as const,
      'text-valign': 'center' as const,
      'text-halign': 'center' as const,
      'font-size': '11px',
      'text-max-width': '150px',
    },
  },
  {
    // 圏外矢印の外側端点（透明。エッジの接続先としてだけ使う）
    selector: 'node.external-ghost',
    style: {
      width: 1,
      height: 1,
      opacity: 0,
      label: '',
      events: 'no' as const,
    },
  },
  {
    selector: 'node.hover',
    style: {
      'border-width': 2,
      'border-color': '#c5e6f8',
      'background-color': '#4f96bd',
    },
  },
  {
    // --- 通常の遷移線 ---
    selector: 'edge',
    style: {
      width: (ele: EdgeSingular) =>
        edgeWidthFromValue(Number(ele.data('value'))),
      'line-color': '#5b9fd4',
      'target-arrow-color': '#5b9fd4',
      'target-arrow-shape': 'triangle' as const,
      'curve-style': 'bezier' as const,
      label: 'data(label)',
      color: '#e8eef3',
      'font-size': '11px',
      'text-background-color': '#1a1f24',
      'text-background-opacity': 0.7,
      'text-background-padding': '2px',
    },
  },
  {
    // Scratch の圏外矢印に近い見た目
    selector: 'edge.external',
    style: {
      width: 1.4,
      'line-color': '#7eb6de',
      'target-arrow-color': '#7eb6de',
      'target-arrow-shape': 'triangle' as const,
      'curve-style': 'straight' as const,
      label: 'data(label)',
      color: '#d7e6f2',
      'font-size': '11px',
      'text-background-color': '#1a1f24',
      'text-background-opacity': 0.7,
      'text-background-padding': '2px',
    },
  },
  {
    selector: 'edge.hover',
    style: {
      'line-color': '#9fd0ef',
      'target-arrow-color': '#9fd0ef',
      width: (ele: EdgeSingular) =>
        edgeWidthFromValue(Number(ele.data('value')), 1),
    },
  },
  {
    selector: 'edge.external.hover',
    style: {
      width: 2.2,
      'line-color': '#9fd0ef',
      'target-arrow-color': '#9fd0ef',
    },
  },
  {
    // 表示最小値未満の遷移線（非表示ではなくグレー）
    selector: 'edge.muted',
    style: {
      'line-color': '#6a737a',
      'target-arrow-color': '#6a737a',
      color: '#9aa3ab',
      opacity: 0.55,
    },
  },
  {
    selector: 'edge.muted.hover',
    style: {
      'line-color': '#8a939b',
      'target-arrow-color': '#8a939b',
      opacity: 0.75,
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 2,
      'border-color': '#c5e6f8',
    },
  },
]
