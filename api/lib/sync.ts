import {
  deleteGamesForUser,
  getGamesFromDb,
  getSyncMeta,
  saveSyncMeta,
  upsertGames,
} from './supabase'
import { fetchAllGamesFromLichess, fetchUserGamesFromLichess, mergeGames } from './lichess'
import type { PlayerConfig, SyncResult } from './types'

export const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function syncPlayerGames(
  player: PlayerConfig,
  options: { force?: boolean; skipIfFresh?: boolean } = {},
): Promise<SyncResult> {
  const username = player.username
  const cached = options.force ? [] : await getGamesFromDb(username)
  const meta = await getSyncMeta(username)

  if (
    options.skipIfFresh &&
    !options.force &&
    meta &&
    cached.length > 0 &&
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
    }
  }

  if (options.force) {
    await deleteGamesForUser(username)
  }

  const since =
    !options.force && meta?.latestCreatedAt != null
      ? meta.latestCreatedAt
      : undefined

  const fetched = since
    ? await fetchUserGamesFromLichess(username, player.token, { since })
    : await fetchAllGamesFromLichess(username, player.token)

  if (fetched.length > 0) {
    await upsertGames(username, fetched)
  }

  const { merged, newCount } = mergeGames(cached, fetched)
  const games = options.force ? await getGamesFromDb(username) : merged
  const updatedMeta = await saveSyncMeta(username, games)

  return {
    games,
    meta: updatedMeta,
    cachedCount: cached.length,
    fetchedCount: fetched.length,
    newCount: options.force ? games.length : newCount,
    fullRefresh: options.force ?? false,
    skipped: false,
  }
}
