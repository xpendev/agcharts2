/**
 * 曼荼羅チャートの型と API 取得（AG Charts Chord）。
 *
 * ノード／エッジ本体は本番バックエンド想定の
 * GET /api/transition-network?count=n から取得する。
 * Chord はカテゴリ間の遷移のみ扱い、圏外流入／流出は含めない。
 */

/** カテゴリ1件（Chord のノード）。before/after は購入量 */
export type AgChartsNetworkNode = {
  id: string
  label: string
  /** 前期の購入量（画面座標や相対値ではない） */
  before: number
  /** 当期の購入量 */
  after: number
}

/** カテゴリ間の遷移1本 */
export type AgChartsNetworkEdge = {
  from: string
  to: string
  value: number
}

/** ノード数の下限 */
export const NODE_COUNT_MIN = 2
/** スパイク確認用の上限（均等 Chord） */
export const NODE_COUNT_MAX = 30

type ApiNetworkResponse = {
  nodes: Array<AgChartsNetworkNode & { external?: number }>
  edges: AgChartsNetworkEdge[]
}

/**
 * バックエンド想定 API から曼荼羅チャートを取得する。
 * count は表示ノード数（2〜30）。圏外フィールドは破棄する。
 */
export async function fetchAgChartsNetwork(count: number): Promise<{
  nodes: AgChartsNetworkNode[]
  edges: AgChartsNetworkEdge[]
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
  const payload = (await response.json()) as ApiNetworkResponse
  return {
    nodes: payload.nodes.map(({ id, label, before, after }) => ({
      id,
      label,
      before,
      after,
    })),
    edges: payload.edges,
  }
}
