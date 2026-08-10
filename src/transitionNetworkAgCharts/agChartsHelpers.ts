import {
  NODE_COUNT_MAX,
  NODE_COUNT_MIN,
  type AgChartsNetworkEdge,
  type AgChartsNetworkNode,
} from './agChartsData'

/** 流入/流出線の表示最小値スライダー初期値 */
export const EDGE_MIN_DEFAULT = 50
/** 流入/流出線の表示最小値スライダー上限 */
export const EDGE_MIN_MAX = 1000

/** 数値を日本ロケールのカンマ区切りにする */
export function formatInt(n: number): string {
  return n.toLocaleString('ja-JP')
}

/**
 * しきい値未満の遷移を除外する。
 * （AG Charts Chord はグレー個別制御が難しいため非表示）
 */
export function filterAgChartsEdges(
  edges: AgChartsNetworkEdge[],
  edgeMinAbs: number,
): AgChartsNetworkEdge[] {
  return edges.filter((edge) => Math.abs(edge.value) >= edgeMinAbs)
}

/**
 * Chord 用データ行へ変換する。
 * - size: 見た目を均等にするための固定値（1）
 * - value: 実際の件数（ツールチップ表示用）
 */
export function toChordRows(
  edges: AgChartsNetworkEdge[],
  nodes: AgChartsNetworkNode[],
): { from: string; to: string; size: number; value: number }[] {
  const labelById = new Map(nodes.map((node) => [node.id, node.label]))
  const VISUAL_SIZE_EQUAL = 1

  return edges.map((edge) => {
    const fromLabel = labelById.get(edge.from) ?? edge.from
    const toLabel = labelById.get(edge.to) ?? edge.to
    return {
      from: fromLabel,
      to: toLabel,
      size: VISUAL_SIZE_EQUAL,
      value: Math.abs(edge.value),
    }
  })
}

/** ノード数スライダーの min / max */
export const NODE_SLIDER = {
  min: NODE_COUNT_MIN,
  max: NODE_COUNT_MAX,
} as const
