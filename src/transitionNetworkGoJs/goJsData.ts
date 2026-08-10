/**
 * 曼荼羅チャートの型と API 取得。
 *
 * ノード／エッジ本体は本番バックエンド想定の
 * GET /api/transition-network?count=n から取得する。
 */

/** カテゴリ1件＝グラフ上の楕円ノード1個 */
export type GoJsNetworkNode = {
  id: string
  label: string
  /** 前期の購入量（画面座標や相対値ではない） */
  before: number
  /** 当期の購入量 */
  after: number
  /** 圏外との純増減（正=流入、負=流出） */
  external: number
}

/** カテゴリ間の遷移1本＝有向矢印1本 */
export type GoJsNetworkEdge = {
  from: string
  to: string
  value: number
  /**
   * true のとき線をグレー表示（スライダーしきい値より優先）。
   * false のとき常に通常色。未指定時は表示最小値しきい値で判定。
   */
  muted?: boolean
}

/** ノード数の下限 */
export const NODE_COUNT_MIN = 2
/** 試し表示用の上限（Cytoscape / Scratch と同じ） */
export const NODE_COUNT_MAX = 30

/** しきい値未満（または muted 指定）ならグレー表示対象 */
export function isGrayEdge(edge: GoJsNetworkEdge, edgeMinAbs: number): boolean {
  if (edge.muted === true) return true
  if (edge.muted === false) return false
  return Math.abs(edge.value) < edgeMinAbs
}

/**
 * バックエンド想定 API から曼荼羅チャートを取得する。
 * count は表示ノード数（2〜30）。
 */
export async function fetchGoJsNetwork(count: number): Promise<{
  nodes: GoJsNetworkNode[]
  edges: GoJsNetworkEdge[]
}> {
  const n = Math.min(
    NODE_COUNT_MAX,
    Math.max(NODE_COUNT_MIN, Math.floor(count)),
  )
  const response = await fetch(`/api/transition-network?count=${n}`)
  if (!response.ok) {
    throw new Error(
      `曼荼羅チャートの取得に失敗しました（HTTP ${response.status}）。`,
    )
  }
  return (await response.json()) as {
    nodes: GoJsNetworkNode[]
    edges: GoJsNetworkEdge[]
  }
}
