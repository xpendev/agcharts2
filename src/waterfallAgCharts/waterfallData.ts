/** GET /api/waterfall?size=n （size = 棒の数 1〜50） */

export const SIZE_MIN = 1
export const SIZE_MAX = 50
export const SIZE_DEFAULT = 3

export type WaterfallSample = {
  size: number
  meta: {
    title: string
    yUnit: string
    fromPeriod?: string
    toPeriod?: string
  }
  categories: string[]
  values: number[]
}

export function clampSize(size: number): number {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.floor(size)))
}

export async function fetchWaterfall(size: number): Promise<WaterfallSample> {
  const n = clampSize(size)
  const response = await fetch(`/api/waterfall?size=${n}`)
  if (!response.ok) {
    throw new Error(`ウォーターフォールの取得に失敗しました（HTTP ${response.status}）。`)
  }
  return (await response.json()) as WaterfallSample
}
