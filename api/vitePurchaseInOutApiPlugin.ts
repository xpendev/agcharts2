import { createStaticJsonApiPlugin } from './createStaticJsonApiPlugin.ts'

/**
 * GET /api/purchase-in-out?size=n
 * → api/data/purchase-in-out-n.json
 */
export function purchaseInOutApiPlugin() {
  return createStaticJsonApiPlugin({
    name: 'purchase-in-out-api',
    pathname: '/api/purchase-in-out',
    filePrefix: 'purchase-in-out',
    min: 1,
    max: 50,
  })
}
