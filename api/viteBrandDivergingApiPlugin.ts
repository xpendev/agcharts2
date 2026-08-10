import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/** ブランド数 = size（1〜7） */
export function brandDivergingApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'brand-diverging-api',
    pathname: '/api/brand-diverging',
    filePrefix: 'brand-diverging',
    min: 1,
    max: 7,
  })
}
