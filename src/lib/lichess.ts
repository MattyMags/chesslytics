import type { LichessGame } from '../types/lichess'
import {
  getCachedGames,
  getCacheMeta,
  saveCachedGames,
  type CacheMeta,
} from './cache/game-store'

export interface FetchGamesOptions {
  since?: number
  until?: number
  max?: number
}

export interface SyncResult {
  games: LichessGame[]
  meta: CacheMeta
  cachedCount: number
  fetchedCount: number
  newCount: number
  fullRefresh: boolean
}

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

function buildGamesUrl(username: string, options: FetchGamesOptions = {}): string {
  const params = new URLSearchParams({
    pgnInJson: 'true',
    moves: 'false',
    tags: 'true',
    opening: 'true',
    clocks: 'false',
    evals: 'false',
  })

  if (options.since !== undefined) params.set('since', String(options.since))
  if (options.until !== undefined) params.set('until', String(options.until))
  if (options.max !== undefined) params.set('max', String(options.max))

  return `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`
}

export async function fetchUserGamesFromApi(
  username: string,
  token: string,
  options: FetchGamesOptions = {},
): Promise<LichessGame[]> {
  const url = buildGamesUrl(username, options)

  const headers: HeadersInit = {
    Accept: 'application/x-ndjson',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(
      `Lichess API error (${response.status}): ${detail || response.statusText}`,
    )
  }

  return parseNdjson(await response.text())
}

function mergeGames(
  existing: LichessGame[],
  incoming: LichessGame[],
): { merged: LichessGame[]; newCount: number } {
  const byId = new Map<string, LichessGame>()
  for (const game of existing) byId.set(game.id, game)

  let newCount = 0
  for (const game of incoming) {
    if (!byId.has(game.id)) newCount++
    byId.set(game.id, game)
  }

  return {
    merged: [...byId.values()].sort((a, b) => a.createdAt - b.createdAt),
    newCount,
  }
}

export async function syncUserGames(
  username: string,
  token: string,
  options: { force?: boolean } = {},
): Promise<SyncResult> {
  const cached = options.force ? [] : await getCachedGames<LichessGame>(username)
  const since =
    !options.force && cached.length > 0
      ? Math.max(...cached.map((game) => game.createdAt))
      : undefined

  const fetched = await fetchUserGamesFromApi(username, token, { since })
  const { merged, newCount } = mergeGames(cached, fetched)
  const meta = await saveCachedGames(username, merged)

  return {
    games: merged,
    meta,
    cachedCount: cached.length,
    fetchedCount: fetched.length,
    newCount,
    fullRefresh: options.force ?? false,
  }
}

export async function getCachedUserGames(
  username: string,
): Promise<{ games: LichessGame[]; meta: CacheMeta | null }> {
  const [games, meta] = await Promise.all([
    getCachedGames<LichessGame>(username),
    getCacheMeta(username),
  ])

  return { games, meta }
}

// Backwards-compatible alias used by the app entrypoint.
export async function fetchUserGames(
  username: string,
  token: string,
): Promise<LichessGame[]> {
  const result = await syncUserGames(username, token)
  return result.games
}
