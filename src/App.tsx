import { useMemo, useState } from 'react'
import { getPlayer, getPlayers, type PlayerId } from './config/players'
import { formatGameResult, getGamePgn, validateGamePgn } from './lib/games'
import { fetchUserGames } from './lib/lichess'
import type { LichessGame } from './types/lichess'
import './App.css'

function App() {
  const players = useMemo(() => getPlayers(), [])
  const [selectedPlayerId, setSelectedPlayerId] = useState<PlayerId>('player1')
  const [gamesByPlayer, setGamesByPlayer] = useState<
    Record<PlayerId, LichessGame[]>
  >({
    player1: [],
    player2: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetchedAt, setLastFetchedAt] = useState<
    Record<PlayerId, string | null>
  >({
    player1: null,
    player2: null,
  })

  const selectedPlayer = getPlayer(selectedPlayerId)
  const selectedGames = gamesByPlayer[selectedPlayerId]
  const latestGame = selectedGames[0]

  async function handleFetchGames() {
    const player = getPlayer(selectedPlayerId)
    if (!player?.username) {
      setError(`Missing username for ${player?.label ?? selectedPlayerId}`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const games = await fetchUserGames(player.username, player.token)
      setGamesByPlayer((current) => ({
        ...current,
        [selectedPlayerId]: games,
      }))
      setLastFetchedAt((current) => ({
        ...current,
        [selectedPlayerId]: new Date().toLocaleString(),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch games')
    } finally {
      setLoading(false)
    }
  }

  const configuredCount = players.filter((player) => player.username).length

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
          <p className="hint">
            Switch between players to fetch their latest Lichess games as JSON
            with embedded PGN.
          </p>

          <div className="controls">
            <label htmlFor="player-select">Active player</label>
            <select
              id="player-select"
              value={selectedPlayerId}
              onChange={(event) =>
                setSelectedPlayerId(event.target.value as PlayerId)
              }
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.label}
                  {player.username ? ` (@${player.username})` : ' (not configured)'}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleFetchGames}
              disabled={loading || !selectedPlayer?.username}
            >
              {loading ? 'Fetching…' : 'Fetch latest games'}
            </button>
          </div>

          <div className="player-grid">
            {players.map((player) => (
              <div key={player.id} className="player-card">
                <span className="player-label">{player.label}</span>
                <span className="player-username">
                  {player.username ? `@${player.username}` : 'Not configured'}
                </span>
                <span className="player-meta">
                  {gamesByPlayer[player.id].length} games cached
                  {lastFetchedAt[player.id]
                    ? ` · last fetch ${lastFetchedAt[player.id]}`
                    : ''}
                </span>
              </div>
            ))}
          </div>

          {configuredCount < 2 && (
            <p className="warning">
              Add both usernames and API tokens in your <code>.env</code> file.
              See <code>.env.example</code>.
            </p>
          )}

          {error && <p className="error">{error}</p>}

          {latestGame && selectedPlayer && (
            <div className="preview">
              <h3>Latest game preview</h3>
              <ul>
                <li>
                  <strong>ID:</strong> {latestGame.id}
                </li>
                <li>
                  <strong>Opening:</strong>{' '}
                  {latestGame.opening?.name ?? 'Unknown'}
                </li>
                <li>
                  <strong>Result:</strong>{' '}
                  {formatGameResult(latestGame, selectedPlayer.username)}
                </li>
                <li>
                  <strong>PGN valid:</strong>{' '}
                  {(() => {
                    const pgn = getGamePgn(latestGame)
                    if (!pgn) return 'No PGN in response'
                    return validateGamePgn(pgn) ? 'Yes (chess.js)' : 'Invalid'
                  })()}
                </li>
              </ul>
            </div>
          )}
        </section>

        <section className="card placeholder">
          <h2>Coming soon</h2>
          <ul>
            <li>Head-to-head records</li>
            <li>Opening repertoire analysis</li>
            <li>Rating trends over time</li>
            <li>Batch fetch for both players</li>
          </ul>
        </section>
      </main>

      <footer className="footer">
        <span>Powered by chess.js &amp; Lichess API</span>
      </footer>
    </div>
  )
}

export default App
