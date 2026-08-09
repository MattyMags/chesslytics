import { useEffect, useMemo, useState } from 'react'
import { HeadToHeadDashboard } from './components/HeadToHeadDashboard'
import { PlayerDashboard } from './components/PlayerDashboard'
import { getPlayers } from './config/players'
import { formatDate } from './lib/format'
import {
  loadGamesFromApi,
  syncPlayersFromApi,
  type PlayerSyncResponse,
} from './lib/lichess'
import {
  computeHeadToHeadStats,
  computePlayerStats,
  type HeadToHeadStats,
  type PlayerStats,
} from './lib/stats/compute'
import './App.css'

type Tab = 'player1' | 'player2' | 'h2h'

interface PlayerData {
  label: string
  username: string
  games: PlayerSyncResponse['games']
  stats: PlayerStats | null
  sync?: PlayerSyncResponse['sync']
  error?: string
}

function toPlayerData(entry: PlayerSyncResponse): PlayerData {
  return {
    label: entry.label,
    username: entry.username,
    games: entry.games,
    stats:
      entry.games.length > 0 && entry.username
        ? computePlayerStats(entry.games, entry.username)
        : null,
    sync: entry.sync,
    error: entry.error,
  }
}

function App() {
  const players = useMemo(() => getPlayers(), [])
  const [syncing, setSyncing] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('player1')
  const [playerData, setPlayerData] = useState<PlayerData[]>([])
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null)

  const hasData = playerData.some((p) => p.stats)

  function applyResults(results: PlayerData[]) {
    setPlayerData(results)

    if (
      results.length === 2 &&
      results[0].stats &&
      results[1].stats &&
      results[0].username &&
      results[1].username
    ) {
      setHeadToHead(
        computeHeadToHeadStats(
          results[0].games,
          results[0].username,
          results[1].username,
        ),
      )
    } else {
      setHeadToHead(null)
    }
  }

  async function syncAll(force = false, skipIfFresh = !force) {
    setSyncing(true)

    if (force) {
      setPlayerData([])
      setHeadToHead(null)
      setInitialLoading(true)
    } else if (!hasData) {
      try {
        const cached = await loadGamesFromApi()
        if (cached.players.some((p) => p.games.length > 0)) {
          applyResults(cached.players.map(toPlayerData))
          setInitialLoading(false)
        }
      } catch {
        // DB may be empty on first run — sync will populate it
      }
    }

    try {
      const response = await syncPlayersFromApi({ force, skipIfFresh })
      applyResults(response.players.map(toPlayerData))
    } catch (err) {
      if (!hasData) {
        applyResults(
          players.map((player) => ({
            label: player.label,
            username: player.username,
            games: [],
            stats: null,
            error: err instanceof Error ? err.message : 'Sync failed',
          })),
        )
      }
    }

    setInitialLoading(false)
    setSyncing(false)
  }

  useEffect(() => {
    syncAll(false, true)
  }, [])

  const tabs: { id: Tab; label: string; disabled?: boolean }[] = [
    { id: 'player1', label: players[0]?.label || 'Player 1', disabled: !playerData[0]?.stats },
    { id: 'player2', label: players[1]?.label || 'Player 2', disabled: !playerData[1]?.stats },
    { id: 'h2h', label: 'Head to head', disabled: !headToHead },
  ]

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
        <section className="toolbar card">
          <div className="toolbar__players">
            {players.map((player) => (
              <div key={player.id} className="toolbar-player">
                <span className="toolbar-player__label">{player.label}</span>
                <span className="toolbar-player__username">
                  {player.username || 'not configured'}
                </span>
              </div>
            ))}
          </div>
          <div className="toolbar__actions">
            {syncing && (
              <span className="sync-indicator">Syncing with Lichess…</span>
            )}
            <button
              type="button"
              className="fetch-btn fetch-btn--secondary"
              onClick={() => syncAll(false, false)}
              disabled={syncing}
            >
              Check for new games
            </button>
            <button
              type="button"
              className="fetch-btn fetch-btn--secondary"
              onClick={() => syncAll(true)}
              disabled={syncing}
            >
              Full refresh
            </button>
          </div>
          {playerData.some((p) => p.sync) && (
            <div className="sync-status">
              {playerData
                .filter((p) => p.sync)
                .map((p) => (
                  <p key={p.username}>
                    <strong>{p.label}:</strong>{' '}
                    {p.sync!.games.length.toLocaleString()} games in database
                    {' · '}
                    last synced {formatDate(p.sync!.meta.lastSyncedAt)}
                    {p.sync!.skipped
                      ? ' (no Lichess call — recently synced)'
                      : p.sync!.fullRefresh
                        ? ' (full re-download)'
                        : p.sync!.cachedCount === 0
                          ? ' (first download)'
                          : p.sync!.newCount > 0
                            ? ` (+${p.sync!.newCount} new from Lichess)`
                            : ' (checked — no new games)'}
                  </p>
                ))}
            </div>
          )}
          {playerData.some((p) => p.error) && (
            <div className="errors">
              {playerData
                .filter((p) => p.error)
                .map((p) => (
                  <p key={p.username} className="error">
                    {p.label}: {p.error}
                  </p>
                ))}
            </div>
          )}
        </section>

        {hasData && (
          <nav className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tabs__btn ${activeTab === tab.id ? 'tabs__btn--active' : ''}`}
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        )}

        {activeTab === 'player1' && playerData[0]?.stats && (
          <PlayerDashboard
            label={playerData[0].label}
            username={playerData[0].username}
            stats={playerData[0].stats}
          />
        )}

        {activeTab === 'player2' && playerData[1]?.stats && (
          <PlayerDashboard
            label={playerData[1].label}
            username={playerData[1].username}
            stats={playerData[1].stats}
          />
        )}

        {activeTab === 'h2h' && headToHead && playerData.length === 2 && (
          <HeadToHeadDashboard
            player1Label={playerData[0].label}
            player2Label={playerData[1].label}
            stats={headToHead}
          />
        )}

        {initialLoading && !hasData && (
          <section className="empty-state card">
            <h2>Loading your games…</h2>
            <p>
              First sync downloads your Lichess history into Supabase. This may
              take a minute.
            </p>
          </section>
        )}

        {!initialLoading && !hasData && !syncing && (
          <section className="empty-state card">
            <h2>No games found</h2>
            <p>
              Set up Supabase (see README), add server env vars, then reload or
              use Full refresh.
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <span>Powered by chess.js, Lichess API &amp; Supabase</span>
      </footer>
    </div>
  )
}

export default App
