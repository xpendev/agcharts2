import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

type StaticJsonApiOptions = {
  /** Vite プラグイン名 */
  name: string
  /** 例: /api/purchase-in-out */
  pathname: string
  /** 例: purchase-in-out → purchase-in-out-3.json */
  filePrefix: string
  min?: number
  max?: number
}

/**
 * api/data/{filePrefix}-{n}.json をそのまま返す共通 API。
 * GET {pathname}?size=n
 */
export function createStaticJsonApiPlugin(
  options: StaticJsonApiOptions,
): Plugin {
  const min = options.min ?? 1
  const max = options.max ?? 7

  return {
    name: options.name,
    configureServer(server) {
      server.middlewares.use(apiHandler(server.config.root))
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiHandler(server.config.root))
    },
  }

  function apiHandler(rootDir: string): Connect.NextHandleFunction {
    return (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      if (url.pathname !== options.pathname) {
        next()
        return
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        res.end()
        return
      }

      const size = clampSize(url.searchParams.get('size'), min, max)
      const filePath = path.join(
        rootDir,
        'api/data',
        `${options.filePrefix}-${size}.json`,
      )
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404
        res.end()
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      if (req.method === 'HEAD') {
        res.end()
        return
      }
      res.end(fs.readFileSync(filePath, 'utf8'))
    }
  }
}

function clampSize(raw: string | null, min: number, max: number): number {
  const n = Number(raw ?? max)
  if (!Number.isFinite(n)) return max
  return Math.min(max, Math.max(min, Math.floor(n)))
}
