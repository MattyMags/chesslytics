import { assertServerEnv, getGamesHandler } from './shared'

export const config = {
  maxDuration: 10,
}

type ApiRequest = { method?: string }
type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => ApiResponse
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    assertServerEnv()
    const result = await getGamesHandler()
    return res.status(200).json(result)
  } catch (err) {
    console.error('games error', err)
    const message = err instanceof Error ? err.message : 'Failed to load games'
    return res.status(500).json({ error: message })
  }
}
