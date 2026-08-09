import type { LichessGame } from '../types/lichess'

export interface CacheMeta {
  username: string
  gameCount: number
  latestCreatedAt: number | null
  fullSyncUntil: number | null
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
  needsMore: boolean
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
      `API error (${response.status}): empty response. Check Vercel env vars and function logs.`,
    )
  }

  let payload: T & { error?: string }
  try {
    payload = JSON.parse(text) as T & { error?: string }
  } catch {
    const preview = text.replace(/\s+/g, ' ').slice(0, 160)
    throw new Error(`API error (${response.status}): ${preview}`)
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

export async function syncUntilComplete(options: {
  force?: boolean
  skipIfFresh?: boolean
  onProgress?: (response: ApiPlayersResponse) => void
} = {}): Promise<ApiPlayersResponse> {
  let force = options.force ?? false
  let skipIfFresh = options.skipIfFresh ?? !force
  let response: ApiPlayersResponse | null = null

  do {
    response = await syncPlayersFromApi({ force, skipIfFresh })
    options.onProgress?.(response)
    force = false
    skipIfFresh = false
  } while (response.players.some((player) => player.sync?.needsMore))

  return response!
}
