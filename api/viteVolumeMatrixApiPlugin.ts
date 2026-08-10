import fs from 'node:fs'
import path from 'node:path'
import type { Connect, Plugin } from 'vite'

const MATRIX_SIZE_MIN = 1
const MATRIX_SIZE_MAX = 7

/**
 * 本番バックエンドを模した API。
 * GET /api/volume-matrix?size=3
 * → api/data/volume-matrix-3.json をそのまま返す
 */
export function volumeMatrixApiPlugin(): Plugin {
  return {
    name: 'volume-matrix-api',
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
    if (url.pathname !== '/api/volume-matrix') {
      next()
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end()
      return
    }

    const size = clampSize(url.searchParams.get('size'))
    const filePath = path.join(
      rootDir,
      'api/data',
      `volume-matrix-${size}.json`,
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

function clampSize(raw: string | null): number {
  const n = Number(raw ?? MATRIX_SIZE_MAX)
  if (!Number.isFinite(n)) return MATRIX_SIZE_MAX
  return Math.min(MATRIX_SIZE_MAX, Math.max(MATRIX_SIZE_MIN, Math.floor(n)))
}
