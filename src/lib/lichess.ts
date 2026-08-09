import type { LichessGame } from '../types/lichess'

export interface CacheMeta {
  username: string
  gameCount: number
  latestCreatedAt: number | null
  lastSyncedAt: number
}

export interface SyncResult {
  games: LichessGame[]
  meta: CacheMeta
  cachedCount: number
  fetchedCount: number
  newCount: number
  fullRefresh: boolean
  skipped: boolean
}

export interface PlayerSyncResponse {
  id: 'player1' | 'player2'
  label: string
  username: string
  games: LichessGame[]
  sync?: SyncResult
  error?: string
}

export interface ApiPlayersResponse {
  players: PlayerSyncResponse[]
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const text = await response.text()

  if (!text.trim()) {
    throw new Error(
      response.ok
        ? 'API returned an empty response'
        : `API error (${response.status}): empty response — is the server running?`,
    )
  }

  let payload: T & { error?: string }
  try {
    payload = JSON.parse(text) as T & { error?: string }
  } catch {
    throw new Error(
      `API returned invalid JSON (${response.status}). You may be hitting the frontend instead of /api routes.`,
    )
  }

  if (!response.ok) {
    throw new Error(payload.error ?? response.statusText)
  }

  return payload
}

export async function loadGamesFromApi(): Promise<ApiPlayersResponse> {
  const response = await fetch('/api/games')
  return parseApiResponse<ApiPlayersResponse>(response)
}

export async function syncPlayersFromApi(options: {
  force?: boolean
  skipIfFresh?: boolean
} = {}): Promise<ApiPlayersResponse> {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  })
  return parseApiResponse<ApiPlayersResponse>(response)
}
