import type { LichessGame } from './types'

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

export async function fetchUserGamesFromLichess(
  username: string,
  token: string,
  options: { since?: number; until?: number; max?: number } = {},
): Promise<LichessGame[]> {
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

export async function fetchAllGamesFromLichess(
  username: string,
  token: string,
): Promise<LichessGame[]> {
  const batchSize = 100
  const allGames: LichessGame[] = []
  let until: number | undefined

  while (true) {
    const batch = await fetchUserGamesFromLichess(username, token, {
      max: batchSize,
      until,
    })

    if (batch.length === 0) break

    allGames.push(...batch)

    if (batch.length < batchSize) break

    until = Math.min(...batch.map((game) => game.createdAt)) - 1
  }

  return allGames
}

export function mergeGames(
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
