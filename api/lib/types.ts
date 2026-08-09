export interface LichessGame {
  id: string
  rated: boolean
  variant: string
  speed: string
  perf: string
  status: string
  createdAt: number
  lastMoveAt: number
  winner?: 'white' | 'black'
  opening?: { eco: string; name: string; ply: number }
  pgn?: string
  players: {
    white: { user?: { name: string; id?: string }; rating?: number; ratingDiff?: number }
    black: { user?: { name: string; id?: string }; rating?: number; ratingDiff?: number }
  }
}

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

export interface PlayerConfig {
  id: 'player1' | 'player2'
  label: string
  username: string
  token: string
}

export interface PlayerSyncResponse {
  id: 'player1' | 'player2'
  label: string
  username: string
  games: LichessGame[]
  sync?: SyncResult
  error?: string
}
