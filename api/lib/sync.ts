import {
  deleteGamesForUser,
  getGamesFromDb,
  getSyncMeta,
  saveSyncMeta,
  upsertGames,
} from './supabase'
import { fetchUserGamesFromLichess } from './lichess'
import type { PlayerConfig, SyncResult } from './types'

export const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const LICHESS_BATCH_SIZE = 100

export async function syncPlayerGames(
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
    if (fetched.length > 0) {
      await upsertGames(username, fetched)
    }
  } else {
    const until = meta?.fullSyncUntil ?? undefined
    const batch = await fetchUserGamesFromLichess(username, player.token, {
      max: LICHESS_BATCH_SIZE,
      until,
    })

    fetchedCount = batch.length
    newCount = batch.length

    if (batch.length > 0) {
      await upsertGames(username, batch)
    }

    const needsMore = batch.length === LICHESS_BATCH_SIZE
    const fullSyncUntil = needsMore
      ? Math.min(...batch.map((game) => game.createdAt)) - 1
      : null

    const games = await getGamesFromDb(username)
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
