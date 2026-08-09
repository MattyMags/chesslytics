export async function fetchUserGameCount(
  username: string,
  token: string,
): Promise<number> {
  const params = new URLSearchParams({
    moves: 'false',
    tags: 'false',
    clocks: 'false',
    evals: 'false',
  })

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

  const text = (await response.text()).trim()
  if (!text) return 0

  return text.split('\n').filter(Boolean).length
}
