import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Types ────────────────────────────────────────────────────────────────────

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

export interface SyncRequestBody {
  force?: boolean
  skipIfFresh?: boolean
}

export interface ApiPlayersResponse {
  players: PlayerSyncResponse[]
}

// ── Config ───────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 60 * 60 * 1000
const LICHESS_BATCH_SIZE = 100

let supabaseClient: SupabaseClient | null = null

function env(key: string): string {
  return process.env[key]?.trim() ?? ''
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

function normalizeUsername(username: string): string {
  return username.toLowerCase()
}

export function assertServerEnv(): void {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
}

function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  supabaseClient = createClient(normalizeSupabaseUrl(url), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return supabaseClient
}

function getServerPlayers(): PlayerConfig[] {
  return [
    {
      id: 'player1',
      label: env('PLAYER1_LABEL') || env('VITE_PLAYER1_LABEL') || 'Player 1',
      username: env('PLAYER1_USERNAME') || env('VITE_PLAYER1_USERNAME'),
      token: env('PLAYER1_TOKEN') || env('VITE_PLAYER1_TOKEN'),
    },
    {
      id: 'player2',
      label: env('PLAYER2_LABEL') || env('VITE_PLAYER2_LABEL') || 'Player 2',
      username: env('PLAYER2_USERNAME') || env('VITE_PLAYER2_USERNAME'),
      token: env('PLAYER2_TOKEN') || env('VITE_PLAYER2_TOKEN'),
    },
  ]
}

// ── Supabase ─────────────────────────────────────────────────────────────────

async function getSyncMeta(username: string): Promise<CacheMeta | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('sync_meta')
    .select('*')
    .eq('username', normalizeUsername(username))
    .maybeSingle()

  if (error) throw new Error(`Failed to read sync meta: ${error.message}`)
  if (!data) return null

  return {
    username: data.username,
    gameCount: data.game_count,
    latestCreatedAt: data.latest_created_at,
    fullSyncUntil: data.full_sync_until ?? null,
    lastSyncedAt: new Date(data.last_synced_at).getTime(),
  }
}

async function getGamesFromDb(username: string): Promise<LichessGame[]> {
  const supabase = getSupabase()
  const allGames: LichessGame[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('games')
      .select('data')
      .eq('username', normalizeUsername(username))
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw new Error(`Failed to read games: ${error.message}`)
    if (!data?.length) break

    allGames.push(...data.map((row) => row.data as LichessGame))
    if (data.length < pageSize) break
    from += pageSize
  }

  return allGames
}

async function deleteGamesForUser(username: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('username', normalizeUsername(username))

  if (error) throw new Error(`Failed to delete games: ${error.message}`)
}

async function upsertGames(username: string, games: LichessGame[]): Promise<void> {
  if (games.length === 0) return

  const supabase = getSupabase()
  const normalized = normalizeUsername(username)
  const batchSize = 500

  for (let i = 0; i < games.length; i += batchSize) {
    const batch = games.slice(i, i + batchSize).map((game) => ({
      id: game.id,
      username: normalized,
      created_at: game.createdAt,
      data: game,
    }))

    const { error } = await supabase.from('games').upsert(batch, { onConflict: 'id' })
    if (error) throw new Error(`Failed to upsert games: ${error.message}`)
  }
}

async function saveSyncMeta(
  username: string,
  games: LichessGame[],
  options: { fullSyncUntil?: number | null } = {},
): Promise<CacheMeta> {
  const supabase = getSupabase()
  const normalized = normalizeUsername(username)
  const latestCreatedAt =
    games.length > 0 ? Math.max(...games.map((game) => game.createdAt)) : null

  const existing = await getSyncMeta(username)
  const fullSyncUntil =
    options.fullSyncUntil !== undefined
      ? options.fullSyncUntil
      : (existing?.fullSyncUntil ?? null)

  const row = {
    username: normalized,
    game_count: games.length,
    latest_created_at: latestCreatedAt,
    full_sync_until: fullSyncUntil,
    last_synced_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('sync_meta').upsert(row)
  if (error) throw new Error(`Failed to save sync meta: ${error.message}`)

  return {
    username: normalized,
    gameCount: games.length,
    latestCreatedAt,
    fullSyncUntil,
    lastSyncedAt: Date.now(),
  }
}

// ── Lichess ──────────────────────────────────────────────────────────────────

function parseNdjson(text: string): LichessGame[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  return trimmed
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as LichessGame
      } catch {
        throw new Error(`Failed to parse game JSON on line ${index + 1}`)
      }
    })
}

async function fetchUserGamesFromLichess(
  username: string,
  token: string,
  options: { since?: number; until?: number; max?: number } = {},
): Promise<LichessGame[]> {
  const params = new URLSearchParams({
    pgnInJson: 'true',
    moves: 'true',
    tags: 'true',
    opening: 'true',
    clocks: 'false',
    evals: 'false',
  })

  if (options.since !== undefined) params.set('since', String(options.since))
  if (options.until !== undefined) params.set('until', String(options.until))
  if (options.max !== undefined) params.set('max', String(options.max))

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/x-ndjson',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Lichess API error (${response.status}): ${detail || response.statusText}`,
    )
  }

  return parseNdjson(await response.text())
}

// ── Sync ─────────────────────────────────────────────────────────────────────

async function syncPlayerGames(
  player: PlayerConfig,
  options: { force?: boolean; skipIfFresh?: boolean } = {},
): Promise<SyncResult> {
  const username = player.username
  let meta = await getSyncMeta(username)
  let cached = await getGamesFromDb(username)

  if (options.force) {
    await deleteGamesForUser(username)
    meta = await saveSyncMeta(username, [], { fullSyncUntil: null })
    cached = []
  }

  if (
    options.skipIfFresh &&
    !options.force &&
    meta &&
    cached.length > 0 &&
    meta.fullSyncUntil == null &&
    Date.now() - meta.lastSyncedAt < CACHE_TTL_MS
  ) {
    return {
      games: cached,
      meta,
      cachedCount: cached.length,
      fetchedCount: 0,
      newCount: 0,
      fullRefresh: false,
      skipped: true,
      needsMore: false,
    }
  }

  const resumingFullSync = meta?.fullSyncUntil != null
  const hasHistory = meta?.latestCreatedAt != null && meta.fullSyncUntil == null

  let fetchedCount = 0
  let newCount = 0

  if (hasHistory && !options.force && !resumingFullSync) {
    const fetched = await fetchUserGamesFromLichess(username, player.token, {
      since: meta!.latestCreatedAt!,
    })
    fetchedCount = fetched.length
    newCount = fetched.length
    if (fetched.length > 0) await upsertGames(username, fetched)
  } else {
    const until = meta?.fullSyncUntil ?? undefined
    const batch = await fetchUserGamesFromLichess(username, player.token, {
      max: LICHESS_BATCH_SIZE,
      until,
    })

    fetchedCount = batch.length
    newCount = batch.length

    const gameCountBefore = (await getGamesFromDb(username)).length
    if (batch.length > 0) await upsertGames(username, batch)

    let needsMore = batch.length === LICHESS_BATCH_SIZE
    let fullSyncUntil = needsMore
      ? Math.min(...batch.map((game) => game.createdAt)) - 1
      : null

    const games = await getGamesFromDb(username)

    if (needsMore && games.length === gameCountBefore) {
      needsMore = false
      fullSyncUntil = null
    } else if (
      needsMore &&
      meta?.fullSyncUntil != null &&
      fullSyncUntil != null &&
      fullSyncUntil >= meta.fullSyncUntil
    ) {
      needsMore = false
      fullSyncUntil = null
    }

    const updatedMeta = await saveSyncMeta(username, games, { fullSyncUntil })

    return {
      games,
      meta: updatedMeta,
      cachedCount: cached.length,
      fetchedCount,
      newCount,
      fullRefresh: options.force ?? false,
      skipped: false,
      needsMore,
    }
  }

  const games = await getGamesFromDb(username)
  const updatedMeta = await saveSyncMeta(username, games, { fullSyncUntil: null })

  return {
    games,
    meta: updatedMeta,
    cachedCount: cached.length,
    fetchedCount,
    newCount,
    fullRefresh: options.force ?? false,
    skipped: false,
    needsMore: false,
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function getGamesHandler(): Promise<ApiPlayersResponse> {
  const players = getServerPlayers()
  const results: PlayerSyncResponse[] = await Promise.all(
    players.map(async (player) => {
      if (!player.username) {
        return {
          id: player.id,
          label: player.label,
          username: player.username,
          games: [],
          error: 'Missing PLAYER*_USERNAME in environment',
        }
      }

      try {
        const [games, meta] = await Promise.all([
          getGamesFromDb(player.username),
          getSyncMeta(player.username),
        ])

        return {
          id: player.id,
          label: player.label,
          username: player.username,
          games,
          sync: meta
            ? {
                games,
                meta,
                cachedCount: games.length,
                fetchedCount: 0,
                newCount: 0,
                fullRefresh: false,
                skipped: true,
                needsMore: meta.fullSyncUntil != null,
              }
            : undefined,
        }
      } catch (err) {
        return {
          id: player.id,
          label: player.label,
          username: player.username,
          games: [],
          error: err instanceof Error ? err.message : 'Failed to load games',
        }
      }
    }),
  )

  return { players: results }
}

export async function syncHandler(
  body: SyncRequestBody = {},
): Promise<ApiPlayersResponse> {
  const force = body.force === true
  const skipIfFresh = body.skipIfFresh !== false && !force
  const players = getServerPlayers()

  const results: PlayerSyncResponse[] = await Promise.all(
    players.map(async (player) => {
      if (!player.username || !player.token) {
        return {
          id: player.id,
          label: player.label,
          username: player.username,
          games: [],
          error: 'Missing PLAYER*_USERNAME or PLAYER*_TOKEN in environment',
        }
      }

      try {
        const sync = await syncPlayerGames(player, { force, skipIfFresh })
        return {
          id: player.id,
          label: player.label,
          username: player.username,
          games: sync.games,
          sync,
        }
      } catch (err) {
        return {
          id: player.id,
          label: player.label,
          username: player.username,
          games: [],
          error: err instanceof Error ? err.message : 'Sync failed',
        }
      }
    }),
  )

  return { players: results }
}
