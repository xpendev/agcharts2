/**
 * ⑦ブランドクロス — bubble-with-categories 実験用。
 * GET /api/volume-matrix のデータを category 軸 bubble 用に渡す。
 */

import {
  fetchVolumeMatrix,
  MATRIX_SIZE_DEFAULT,
  MATRIX_SIZE_MAX,
  MATRIX_SIZE_MIN,
} from '../volumeMatrixAgCharts/volumeMatrixData'

export { MATRIX_SIZE_DEFAULT, MATRIX_SIZE_MAX, MATRIX_SIZE_MIN }

/** category 軸 bubble 用の1点 */
export type BubbleCategoryPoint = {
  /** 過去購入（Y・カテゴリ） */
  past: string
  /** 現在購入（X・カテゴリ） */
  current: string
  /** 行方向 %（バブルサイズ） */
  value: number
  /** バブル内表示（対角は '-'） */
  label: string
  /** 行ごとの塗り色 */
  fill: string
  /** ブランド行の対角（同一ブランド）は非表示 */
  hideBubble: boolean
}

export type BubbleCategorySample = {
  note: string
  /** X軸カテゴリ順（現在購入） */
  columns: string[]
  /** Y軸カテゴリ順（過去購入） */
  rows: string[]
  points: BubbleCategoryPoint[]
}

export async function fetchBubbleCategorySample(
  matrixSize: number,
): Promise<BubbleCategorySample> {
  const sample = await fetchVolumeMatrix(matrixSize)
  return {
    note: sample.meta.note,
    columns: sample.columns,
    rows: sample.rows,
    points: sample.cells.map((cell) => ({
      past: cell.past,
      current: cell.current,
      value: cell.value,
      label: cell.label,
      fill: cell.fill,
      hideBubble: cell.hideBubble,
    })),
  }
}
