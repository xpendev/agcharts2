/**
 * ボリューム付数表の型と API 取得。
 * GET /api/volume-matrix?size=n
 */

/** チャート用1セル（表示用に変換後） */
export type VolumeMatrixCell = {
  current: string
  past: string
  value: number
  label: string
  fill: string
}

/** マス数スライダー下限 */
export const MATRIX_SIZE_MIN = 1
/** マス数スライダー上限 */
export const MATRIX_SIZE_MAX = 7
/** マス数の初期値 */
export const MATRIX_SIZE_DEFAULT = 7

/** 行ごとの色（ブランド1〜7） */
const ROW_COLORS = [
  '#8fbf5a',
  '#2f7a3a',
  '#d4c45a',
  '#d8b89a',
  '#a85a28',
  '#6aa8d8',
  '#2a4a8a',
] as const

export function clampMatrixSize(size: number): number {
  return Math.min(
    MATRIX_SIZE_MAX,
    Math.max(MATRIX_SIZE_MIN, Math.floor(size)),
  )
}

/** API カテゴリ */
type ApiCategory = { id: string; label: string }

/** API セル */
type ApiCell = { pastId: string; currentId: string; value: number }

/** API レスポンス */
export type VolumeMatrixApiResponse = {
  meta: {
    title: string
    pastPeriodLabel: string
    currentPeriodLabel: string
    note: string
    unit: string
  }
  size: number
  columns: ApiCategory[]
  rows: ApiCategory[]
  cells: ApiCell[]
}

/** 画面用サンプル（API 変換後） */
export type VolumeMatrixSample = {
  size: number
  meta: VolumeMatrixApiResponse['meta']
  columns: string[]
  rows: string[]
  cells: VolumeMatrixCell[]
}

/** API 応答をチャート用に変換する */
export function toVolumeMatrixSample(
  payload: VolumeMatrixApiResponse,
): VolumeMatrixSample {
  const labelById = new Map<string, string>()
  const indexById = new Map<string, number>()
  payload.rows.forEach((row, index) => {
    labelById.set(row.id, row.label)
    indexById.set(row.id, index)
  })
  payload.columns.forEach((col) => {
    labelById.set(col.id, col.label)
  })

  const cells: VolumeMatrixCell[] = payload.cells.map((cell) => {
    const past = labelById.get(cell.pastId) ?? cell.pastId
    const current = labelById.get(cell.currentId) ?? cell.currentId
    const rowIndex = indexById.get(cell.pastId) ?? 0
    return {
      past,
      current,
      value: cell.value,
      label: cell.value.toFixed(1),
      fill: ROW_COLORS[rowIndex] ?? '#888888',
    }
  })

  return {
    size: payload.size,
    meta: payload.meta,
    columns: payload.columns.map((c) => c.label),
    rows: payload.rows.map((r) => r.label),
    cells,
  }
}

/**
 * バックエンド想定 API からボリューム付数表を取得する。
 * size はクライアント（スライダー）から指定する。
 */
export async function fetchVolumeMatrix(
  matrixSize: number,
): Promise<VolumeMatrixSample> {
  const size = clampMatrixSize(matrixSize)
  const response = await fetch(`/api/volume-matrix?size=${size}`)
  if (!response.ok) {
    throw new Error(
      `ボリューム付数表の取得に失敗しました（HTTP ${response.status}）。`,
    )
  }
  const payload = (await response.json()) as VolumeMatrixApiResponse
  return toVolumeMatrixSample(payload)
}
