/**
 * 人数構成比。
 * GET /api/brand-composition?size=n
 * size = ブランド数（1〜8）
 */

export const SIZE_MIN = 1
export const SIZE_MAX = 8
export const SIZE_DEFAULT = 4

export type BrandCompositionRow = {
  brand: string
  period: string
  repeat: number
  switchIn: number
  entry: number
}

export type BrandCompositionSample = {
  size: number
  meta: {
    title: string
    yTitle: string
    series: {
      repeat: string
      switchIn: string
      entry: string
    }
  }
  rows: BrandCompositionRow[]
}

export type BrandGroup = {
  brand: string
  rows: BrandCompositionRow[]
}

export function clampSize(size: number): number {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.floor(size)))
}

/** rows をブランド出現順にグループ化 */
export function groupRowsByBrand(
  rows: BrandCompositionRow[],
): BrandGroup[] {
  const order: string[] = []
  const map = new Map<string, BrandCompositionRow[]>()
  for (const row of rows) {
    if (!map.has(row.brand)) {
      map.set(row.brand, [])
      order.push(row.brand)
    }
    map.get(row.brand)!.push(row)
  }
  return order.map((brand) => ({ brand, rows: map.get(brand)! }))
}

export async function fetchBrandComposition(
  size: number,
): Promise<BrandCompositionSample> {
  const n = clampSize(size)
  const response = await fetch(`/api/brand-composition?size=${n}`)
  if (!response.ok) {
    throw new Error(`構成比データの取得に失敗しました（HTTP ${response.status}）。`)
  }
  return (await response.json()) as BrandCompositionSample
}
