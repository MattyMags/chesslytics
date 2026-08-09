import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { loadEnv } from 'vite'
import { assertServerEnv, getGamesHandler, syncHandler } from './api/lib/handlers'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export function apiDevPlugin(): Plugin {
  return {
    name: 'chesslytics-api-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) {
          process.env[key] = value
        }
      }

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (!url?.startsWith('/api/')) return next()

        try {
          if (url === '/api/games' && req.method === 'GET') {
            assertServerEnv()
            const result = await getGamesHandler()
            sendJson(res, 200, result)
            return
          }

          if (url === '/api/sync' && req.method === 'POST') {
            assertServerEnv()
            const raw = await readBody(req)
            const body = raw ? JSON.parse(raw) : {}
            const result = await syncHandler(body)
            sendJson(res, 200, result)
            return
          }

          sendJson(res, 404, { error: `Unknown API route: ${url}` })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'API error'
          sendJson(res, 500, { error: message })
        }
      })
    },
  }
}
