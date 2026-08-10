/** スクラッチ SVG の見た目定数（ノード／エッジ／マーカー） */
export const scratchStyles = {
  // --- キャンバス ---
  canvasBg: '#1a1f24',

  // --- 矢じり ---
  arrowMarkerFill: '#5b9fd4',
  arrowExtMarkerFill: '#7eb6de',
  arrowMarkerMutedFill: '#6a737a',

  // --- ノード ---
  nodeGradient: {
    start: '#6eb0d8',
    end: '#3d7fa8',
  },
  nodeGradientHover: {
    start: '#8bc4e4',
    end: '#4f96bd',
  },
  nodeStroke: '#9fd0ef',
  nodeStrokeHover: '#c5e6f8',
  nodeTitleFill: '#fff',
  nodeBodyFill: '#f2f7fb',
  nodeDeltaFill: '#d4e8f6',

  // --- 遷移線（通常／グレー） ---
  edgeStroke: '#5b9fd4',
  edgeStrokeHover: '#9fd0ef',
  edgeStrokeMuted: '#6a737a',
  edgeStrokeMutedHover: '#8a939b',
  edgeLabelFill: '#e8eef3',
  edgeLabelFillMuted: '#9aa3ab',

  // --- 圏外矢印 ---
  externalStroke: '#7eb6de',
  externalStrokeMuted: '#6a737a',
  externalLabelFill: '#d7e6f2',
  externalLabelFillMuted: '#9aa3ab',
} as const
