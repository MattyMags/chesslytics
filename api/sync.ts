import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertServerEnv, syncHandler } from './lib/handlers'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    assertServerEnv()
    const result = await syncHandler((req.body ?? {}) as Parameters<typeof syncHandler>[0])
    return res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    return res.status(500).json({ error: message })
  }
}
