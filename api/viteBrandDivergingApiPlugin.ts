import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/** ブランド数 = size（1〜50） */
export function brandDivergingApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'brand-diverging-api',
    pathname: '/api/brand-diverging',
    filePrefix: 'brand-diverging',
    min: 1,
    max: 50,
  })
}
