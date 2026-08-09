import {
  assertServerEnv,
  getGamesHandler,
  syncHandler,
  type SyncRequestBody,
} from './shared'

export const config = {
  maxDuration: 10,
}

type ApiRequest = { method?: string; body?: unknown }
type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => ApiResponse
}

function readBody(req: ApiRequest): SyncRequestBody {
  const body = req.body
  if (body && typeof body === 'object') return body as SyncRequestBody
  if (typeof body === 'string' && body.trim()) {
    return JSON.parse(body) as SyncRequestBody
  }
  return {}
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    assertServerEnv()
    const result = await syncHandler(readBody(req))
    return res.status(200).json(result)
  } catch (err) {
    console.error('sync error', err)
    const message = err instanceof Error ? err.message : 'Sync failed'
    return res.status(500).json({ error: message })
  }
}
