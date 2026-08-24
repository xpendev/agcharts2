/**
 * ⑤競合へのインパクト。
 * GET /api/competitive-impact?size=n （size = 競合ブランド数 1〜50）
 */

export const SIZE_MIN = 1
export const SIZE_MAX = 50
export const SIZE_DEFAULT = 7

export type CompetitiveImpactRow = {
  label: string
  outflow: number
  inflow: number
}

export type CompetitiveImpactSample = {
  size: number
  meta: {
    title: string
    subtitle: string
    xUnit: string
  }
  rows: CompetitiveImpactRow[]
}

export function clampSize(size: number): number {
  return Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.floor(size)))
}

export async function fetchCompetitiveImpact(
  size: number,
): Promise<CompetitiveImpactSample> {
  const n = clampSize(size)
  const response = await fetch(`/api/competitive-impact?size=${n}`)
  if (!response.ok) {
    throw new Error(
      `競合インパクトデータの取得に失敗しました（HTTP ${response.status}）。`,
    )
  }
  return (await response.json()) as CompetitiveImpactSample
}
