/**
 * ①新規・継続・脱落率。
 * GET /api/buyer-dropout?size=n
 * size = 期間数（1〜50）
 */

export const SIZE_MIN = 1
export const SIZE_MAX = 50
export const SIZE_DEFAULT = 3

export type BuyerDropoutSample = {
  size: number
  meta: {
    topTitle: string
    bottomTitle: string
    yUnit: string
    series: {
      base: string
      mid: string
      top: string
    }
  }
  stacked: Array<{
    period: string
    base: number
    mid: number
    top: number
  }>
  dropout: Array<{
    period: string
    value: number
  }>
}

export function clampSize(size: number): number {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.floor(size)))
}

export async function fetchBuyerDropout(
  size: number,
): Promise<BuyerDropoutSample> {
  const n = clampSize(size)
  const response = await fetch(`/api/buyer-dropout?size=${n}`)
  if (!response.ok) {
    throw new Error(
      `購入者・脱落データの取得に失敗しました（HTTP ${response.status}）。`,
    )
  }
  return (await response.json()) as BuyerDropoutSample
}
