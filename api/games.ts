import type { VercelRequest, VercelResponse } from '@vercel/node'
import { assertServerEnv, getGamesHandler } from './lib/handlers'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    assertServerEnv()
    const result = await getGamesHandler()
    return res.status(200).json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load games'
    return res.status(500).json({ error: message })
  }
}
