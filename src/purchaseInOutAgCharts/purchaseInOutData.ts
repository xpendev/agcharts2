/**
 * ④シェア流出・流入比較。
 * GET /api/purchase-in-out?size=n （size = ブランド数 1〜50）
 */

export const SIZE_MIN = 1
export const SIZE_MAX = 50
export const SIZE_DEFAULT = 7

export type PurchaseInOutRow = {
  label: string
  outflow: number
  inflow: number
}

export type PurchaseInOutSample = {
  size: number
  meta: {
    title: string
    brandLabel: string
  }
  summary: {
    previousPercent: number
    currentPercent: number
    outflowPercent: number
    retainedPercent: number
    inflowPercent: number
  }
  rows: PurchaseInOutRow[]
}

export function clampSize(size: number): number {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.floor(size)))
}

export async function fetchPurchaseInOut(
  size: number,
): Promise<PurchaseInOutSample> {
  const n = clampSize(size)
  const response = await fetch(`/api/purchase-in-out?size=${n}`)
  if (!response.ok) {
    throw new Error(`買出入データの取得に失敗しました（HTTP ${response.status}）。`)
  }
  return (await response.json()) as PurchaseInOutSample
}
