import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/** 期間数 = size（1〜50） */
export function buyerDropoutApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'buyer-dropout-api',
    pathname: '/api/buyer-dropout',
    filePrefix: 'buyer-dropout',
    min: 1,
    max: 50,
  })
}
