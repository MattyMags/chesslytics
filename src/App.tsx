import { useMemo, useState } from 'react'
import { getPlayers } from './config/players'
import { fetchUserGameCount } from './lib/lichess'
import './App.css'

interface PlayerCount {
  label: string
  username: string
  count: number | null
  error?: string
}

function App() {
  const players = useMemo(() => getPlayers(), [])
  const [loading, setLoading] = useState(false)
  const [counts, setCounts] = useState<PlayerCount[]>([])

  async function handleFetch() {
    setLoading(true)

    const results = await Promise.all(
      players.map(async (player) => {
        if (!player.username || !player.token) {
          return {
            label: player.label,
            username: player.username,
            count: null,
            error: 'Missing username or token in .env',
          }
        }

        try {
          const count = await fetchUserGameCount(player.username, player.token)
          return { label: player.label, username: player.username, count }
        } catch (err) {
          return {
            label: player.label,
            username: player.username,
            count: null,
            error: err instanceof Error ? err.message : 'Failed to fetch',
          }
        }
      }),
    )

    setCounts(results)
    setLoading(false)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">♞</span>
          <h1>Chesslytics</h1>
        </div>
        <p className="tagline">Chess analytics for you and your friends</p>
      </header>

      <main className="main">
        <section className="card">
          <h2>Players</h2>

          <div className="player-grid">
            {players.map((player) => {
              const result = counts.find((c) => c.username === player.username)
              return (
                <div key={player.id} className="player-card">
                  <span className="player-label">{player.label}</span>
                  <span className="player-username">
                    {player.username || 'not configured'}
                  </span>
                  {result?.error && (
                    <span className="error">{result.error}</span>
                  )}
                  {result?.count !== null && result?.count !== undefined && (
                    <span className="player-count">
                      {result.count.toLocaleString()} games
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="button"
            className="fetch-btn"
            onClick={handleFetch}
            disabled={loading}
          >
            {loading ? 'Fetching…' : 'Fetch games'}
          </button>
        </section>
      </main>

      <footer className="footer">
        <span>Powered by Lichess API</span>
      </footer>
    </div>
  )
}

export default App
