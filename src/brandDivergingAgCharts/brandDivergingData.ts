/**
 * ⑥流出入差ランキング。
 * GET /api/brand-diverging?size=n
 * size = ブランド数（1〜50）
 */

export const SIZE_MIN = 1
export const SIZE_MAX = 50
export const SIZE_DEFAULT = 7

export type BrandDivergingRow = { label: string; value: number }

export type BrandDivergingSample = {
  size: number
  meta: { title: string }
  rows: BrandDivergingRow[]
}

export function clampSize(size: number): number {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.floor(size)))
}

export async function fetchBrandDiverging(
  size: number,
): Promise<BrandDivergingSample> {
  const n = clampSize(size)
  const response = await fetch(`/api/brand-diverging?size=${n}`)
  if (!response.ok) {
    throw new Error(
      `発散棒データの取得に失敗しました（HTTP ${response.status}）。`,
    )
  }
  return (await response.json()) as BrandDivergingSample
}
