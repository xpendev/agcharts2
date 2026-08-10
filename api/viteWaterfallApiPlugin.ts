import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

export function waterfallApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'waterfall-api',
    pathname: '/api/waterfall',
    filePrefix: 'waterfall',
  })
}
