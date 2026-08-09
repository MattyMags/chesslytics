import type { LichessGame } from '../types/lichess'

export interface FetchGamesOptions {
  max?: number
  since?: number
  until?: number
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

export async function fetchUserGames(
  username: string,
  token: string,
  options: FetchGamesOptions = {},
): Promise<LichessGame[]> {
  const params = new URLSearchParams({
    pgnInJson: 'true',
    moves: 'true',
    tags: 'true',
    opening: 'true',
    clocks: 'true',
    evals: 'false',
  })

  if (options.max !== undefined) params.set('max', String(options.max))
  if (options.since !== undefined) params.set('since', String(options.since))
  if (options.until !== undefined) params.set('until', String(options.until))

  const url = `https://lichess.org/api/games/user/${encodeURIComponent(username)}?${params}`

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
