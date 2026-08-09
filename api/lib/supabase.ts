import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CacheMeta, LichessGame } from './types'

let client: SupabaseClient | null = null

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function getSupabase(): SupabaseClient {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  client = createClient(normalizeSupabaseUrl(url), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return client
}

function normalizeUsername(username: string): string {
  return username.toLowerCase()
}

export async function getSyncMeta(username: string): Promise<CacheMeta | null> {
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
    lastSyncedAt: new Date(data.last_synced_at).getTime(),
  }
}

export async function getGamesFromDb(username: string): Promise<LichessGame[]> {
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

export async function deleteGamesForUser(username: string): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('games')
    .delete()
    .eq('username', normalizeUsername(username))

  if (error) throw new Error(`Failed to delete games: ${error.message}`)
}

export async function upsertGames(
  username: string,
  games: LichessGame[],
): Promise<void> {
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

export async function saveSyncMeta(
  username: string,
  games: LichessGame[],
): Promise<CacheMeta> {
  const supabase = getSupabase()
  const normalized = normalizeUsername(username)
  const latestCreatedAt =
    games.length > 0 ? Math.max(...games.map((game) => game.createdAt)) : null

  const row = {
    username: normalized,
    game_count: games.length,
    latest_created_at: latestCreatedAt,
    last_synced_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('sync_meta').upsert(row)
  if (error) throw new Error(`Failed to save sync meta: ${error.message}`)

  return {
    username: normalized,
    gameCount: games.length,
    latestCreatedAt,
    lastSyncedAt: Date.now(),
  }
}
