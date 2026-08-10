import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/** ブランド数 = size（1〜8） */
export function brandCompositionApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'brand-composition-api',
    pathname: '/api/brand-composition',
    filePrefix: 'brand-composition',
    min: 1,
    max: 8,
  })
}
