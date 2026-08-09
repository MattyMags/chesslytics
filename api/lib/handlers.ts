import { getGamesFromDb, getSyncMeta } from './supabase'
import { getServerPlayers } from './players'
import { syncPlayerGames } from './sync'
import type { PlayerSyncResponse } from './types'

export interface SyncRequestBody {
  force?: boolean
  skipIfFresh?: boolean
}

export interface ApiPlayersResponse {
  players: PlayerSyncResponse[]
}

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

export function assertServerEnv(): void {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env',
    )
  }
}
