import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/** 競合ブランド数 = size（1〜50） */
export function competitiveImpactApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'competitive-impact-api',
    pathname: '/api/competitive-impact',
    filePrefix: 'competitive-impact',
    min: 1,
    max: 50,
  })
}
