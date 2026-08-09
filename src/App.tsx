import { useState } from 'react'
import { Chess } from 'chess.js'
import './App.css'

function App() {
  const [lichessUsername, setLichessUsername] = useState('')
  const chess = new Chess()

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
          <h2>Get started</h2>
          <p className="hint">
            Enter a Lichess username to begin. We&apos;ll pull game data and
            build your dashboard here.
          </p>

          <form
            className="username-form"
            onSubmit={(e) => {
              e.preventDefault()
            }}
          >
            <label htmlFor="username">Lichess username</label>
            <div className="input-row">
              <input
                id="username"
                type="text"
                placeholder="e.g. DrNykterstein"
                value={lichessUsername}
                onChange={(e) => setLichessUsername(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={!lichessUsername.trim()}>
                Analyze
              </button>
            </div>
          </form>

          <div className="status">
            <span className="status-dot" />
            <span>
              chess.js ready — starting position:{' '}
              <code>{chess.fen()}</code>
            </span>
          </div>
        </section>

        <section className="card placeholder">
          <h2>Coming soon</h2>
          <ul>
            <li>Lichess game history &amp; stats</li>
            <li>Head-to-head records</li>
            <li>Opening repertoire analysis</li>
            <li>Rating trends over time</li>
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
