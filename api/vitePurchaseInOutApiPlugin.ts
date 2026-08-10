import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/**
 * GET /api/purchase-in-out?size=3
 * → api/data/purchase-in-out-3.json
 */
export function purchaseInOutApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'purchase-in-out-api',
    pathname: '/api/purchase-in-out',
    filePrefix: 'purchase-in-out',
  })
}
