/**
 * 曼荼羅チャートの型と API 取得。
 *
 * ノード／エッジ本体は本番バックエンド想定の
 * GET /api/transition-network?count=n から取得する。
 */

/** カテゴリ1件＝グラフ上の楕円ノード1個 */
export type ScratchNode = {
  /** ノードの一意キー（エッジの from / to から参照される） */
  id: string
  /** 楕円内に表示するカテゴリ名 */
  label: string
  /** 前期の購入量（画面座標や相対値ではない） */
  before: number
  /** 当期の購入量（画面座標や相対値ではない） */
  after: number
  /** 圏外との純増減（正=流入、負=流出） */
  external: number
}

/** カテゴリ間の遷移1本＝グラフ上の有向矢印1本 */
export type ScratchEdge = {
  /** 遷移元ノードの id */
  from: string
  /** 遷移先ノードの id */
  to: string
  /** 遷移件数（矢印ラベル・線の太さの元になる） */
  value: number
}

/** ノード数入力の下限 */
export const NODE_COUNT_MIN = 2
/** ノード数入力の上限（試し表示用。Cytoscape / GoJS と同じ） */
export const NODE_COUNT_MAX = 30

/**
 * バックエンド想定 API から曼荼羅チャートを取得する。
 * count は表示ノード数（2〜30）。サーバ側で先頭 n 件と対応エッジに絞り込む。
 */
export async function fetchScratchNetwork(count: number): Promise<{
  nodes: ScratchNode[]
  edges: ScratchEdge[]
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
    nodes: ScratchNode[]
    edges: ScratchEdge[]
  }
}
