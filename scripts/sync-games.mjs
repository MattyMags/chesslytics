#!/usr/bin/env node
/**
 * Downloads Lichess games to .cache/{username}.ndjson on disk.
 * Incremental: only fetches games since the last saved game.
 *
 * Usage: node scripts/sync-games.mjs
 * Requires .env with VITE_PLAYER*_USERNAME and VITE_PLAYER*_TOKEN
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const CACHE_DIR = '.cache'

function loadEnv() {
  const envPath = '.env'
  if (!existsSync(envPath)) {
    throw new Error('Missing .env file')
  }

  const vars = {}
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    vars[key] = rest.join('=')
  }
  return vars
}

function parseNdjson(text) {
  const trimmed = text.trim()
  if (!trimmed) return []
  return trimmed.split('\n').filter(Boolean).map((line) => JSON.parse(line))
}

function readCache(username) {
  const file = join(CACHE_DIR, `${username.toLowerCase()}.ndjson`)
  if (!existsSync(file)) return []
  return parseNdjson(readFileSync(file, 'utf8'))
}

function writeCache(username, games) {
  mkdirSync(CACHE_DIR, { recursive: true })
  const file = join(CACHE_DIR, `${username.toLowerCase()}.ndjson`)
  const metaFile = join(CACHE_DIR, `${username.toLowerCase()}.meta.json`)

  const ndjson = games.map((g) => JSON.stringify(g)).join('\n')
  writeFileSync(file, ndjson ? `${ndjson}\n` : '')

  const latestCreatedAt =
    games.length > 0 ? Math.max(...games.map((g) => g.createdAt)) : null

  writeFileSync(
    metaFile,
    JSON.stringify(
      {
        username: username.toLowerCase(),
        gameCount: games.length,
        latestCreatedAt,
        lastSyncedAt: Date.now(),
      },
      null,
      2,
    ),
  )
}

function mergeGames(existing, incoming) {
  const byId = new Map(existing.map((g) => [g.id, g]))
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

async function fetchGames(username, token, since) {
  const params = new URLSearchParams({
    pgnInJson: 'true',
    moves: 'true',
    tags: 'true',
    opening: 'true',
    clocks: 'false',
    evals: 'false',
  })
  if (since) params.set('since', String(since))

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/x-ndjson',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Lichess API ${response.status}: ${await response.text()}`)
  }

  return parseNdjson(await response.text())
}

async function syncPlayer(label, username, token) {
  const cached = readCache(username)
  const since =
    cached.length > 0
      ? Math.max(...cached.map((g) => g.createdAt))
      : undefined

  console.log(
    `${label} (@${username}): ${cached.length} games on disk` +
      (since ? `, checking since ${new Date(since).toISOString()}` : ', full download…'),
  )

  const fetched = await fetchGames(username, token, since)
  const { merged, newCount } = mergeGames(cached, fetched)
  writeCache(username, merged)

  console.log(
    `  → ${merged.length} total (${newCount} new) → .cache/${username.toLowerCase()}.ndjson\n`,
  )
}

const env = loadEnv()
const players = [
  {
    label: env.VITE_PLAYER1_LABEL || 'Player 1',
    username: env.VITE_PLAYER1_USERNAME,
    token: env.VITE_PLAYER1_TOKEN,
  },
  {
    label: env.VITE_PLAYER2_LABEL || 'Player 2',
    username: env.VITE_PLAYER2_USERNAME,
    token: env.VITE_PLAYER2_TOKEN,
  },
]

for (const player of players) {
  if (!player.username || !player.token) {
    console.warn(`Skipping ${player.label}: missing username or token`)
    continue
  }
  await syncPlayer(player.label, player.username, player.token)
}

console.log('Done.')
