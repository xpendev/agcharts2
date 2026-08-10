import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const NODE_COUNT_MIN = 2
const NODE_COUNT_MAX = 30

/**
 * 本番バックエンドを模した API。
 * GET /api/transition-network?count=8
 * → api/data/transition-network-8.json をそのまま返す
 */
export function transitionNetworkApiPlugin(): Plugin {
  return {
    name: 'transition-network-api',
    configureServer(server) {
      server.middlewares.use(apiHandler(server.config.root))
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiHandler(server.config.root))
    },
  }
}

function apiHandler(rootDir: string): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname !== '/api/transition-network') {
      next()
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end()
      return
    }

    const count = clampCount(url.searchParams.get('count'))
    const filePath = path.join(
      rootDir,
      'api/data',
      `transition-network-${count}.json`,
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

function clampCount(raw: string | null): number {
  const n = Number(raw ?? NODE_COUNT_MAX)
  if (!Number.isFinite(n)) return NODE_COUNT_MAX
  return Math.min(NODE_COUNT_MAX, Math.max(NODE_COUNT_MIN, Math.floor(n)))
}
