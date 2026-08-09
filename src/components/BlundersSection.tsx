import { formatSpeed } from '../lib/game-utils'
import {
  formatDate,
  formatNumber,
  formatPct,
  formatRecord,
} from '../lib/format'
import { lichessGameUrl } from '../lib/stats/blunders'
import type { BlunderStats } from '../lib/stats/types'
import { DataTable } from './DataTable'
import { StatCard } from './StatCard'

interface BlundersSectionProps {
  stats: BlunderStats
}

export function BlundersSection({ stats }: BlundersSectionProps) {
  const hasQueenData = stats.gamesWithPgn > 0
  const hasAnalysis = stats.gamesAnalyzed > 0
  const recordTotal =
    stats.recordAfterQueenBlunder.wins +
    stats.recordAfterQueenBlunder.losses +
    stats.recordAfterQueenBlunder.draws

  if (!hasQueenData && !hasAnalysis) {
    return null
  }

  return (
    <section className="blunders-section">
      <div className="blunders-section__hero">
        <div className="blunders-section__intro">
          <span className="blunders-section__eyebrow">Blunder report</span>
          <h3>Queen disasters &amp; blunder stats</h3>
          <p>
            Queen blunders are detected from your PGNs when you lose the queen
            without trading queens. Lichess analysis counts are included when
            available.
          </p>
        </div>

        <div className="blunders-section__queen-stat">
          <span className="blunders-section__queen-icon" aria-hidden="true">
            ♕
          </span>
          <div className="blunders-section__queen-numbers">
            <span className="blunders-section__queen-value">
              {formatNumber(stats.totalQueenBlunders)}
            </span>
            <span className="blunders-section__queen-label">
              queen blunder{stats.totalQueenBlunders === 1 ? '' : 's'}
            </span>
            {hasQueenData && (
              <span className="blunders-section__queen-meta">
                {formatNumber(stats.queenBlundersPerGame, 2)} per game ·{' '}
                {formatPct(stats.queenBlunderRate)} of games
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="blunders-section__grid">
        {hasAnalysis && (
          <>
            <StatCard
              label="Total blunders"
              value={formatNumber(stats.totalBlunders)}
              hint={`${formatNumber(stats.avgBlunders, 1)} / game`}
              accent="loss"
            />
            <StatCard
              label="Total mistakes"
              value={formatNumber(stats.totalMistakes)}
              hint={`${formatNumber(stats.avgMistakes, 1)} / game`}
            />
            <StatCard
              label="Total inaccuracies"
              value={formatNumber(stats.totalInaccuracies)}
              hint={`${formatNumber(stats.avgInaccuracies, 1)} / game`}
            />
            <StatCard
              label="Analyzed games"
              value={formatNumber(stats.gamesAnalyzed)}
            />
          </>
        )}

        {hasQueenData && (
          <>
            <StatCard
              label="Games with queen blunder"
              value={formatNumber(stats.gamesWithQueenBlunder)}
              accent="loss"
            />
            <StatCard
              label="Record after queen blunder"
              value={
                recordTotal > 0
                  ? formatRecord({
                      ...stats.recordAfterQueenBlunder,
                      games: recordTotal,
                      winRate:
                        stats.recordAfterQueenBlunder.losses +
                          stats.recordAfterQueenBlunder.wins >
                        0
                          ? (stats.recordAfterQueenBlunder.wins /
                              (stats.recordAfterQueenBlunder.wins +
                                stats.recordAfterQueenBlunder.losses)) *
                            100
                          : 0,
                      scorePct:
                        recordTotal > 0
                          ? ((stats.recordAfterQueenBlunder.wins +
                              stats.recordAfterQueenBlunder.draws * 0.5) /
                              recordTotal) *
                            100
                          : 0,
                    })
                  : '—'
              }
              hint={
                recordTotal > 0
                  ? `${formatNumber(stats.recordAfterQueenBlunder.losses)} losses after dropping the queen`
                  : undefined
              }
              accent="loss"
            />
            <StatCard
              label="PGNs scanned"
              value={formatNumber(stats.gamesWithPgn)}
            />
          </>
        )}
      </div>

      {(stats.queenBlundersByOpening.length > 0 ||
        stats.queenBlundersBySpeed.length > 0) && (
        <div className="blunders-section__breakdown">
          {stats.queenBlundersByOpening.length > 0 && (
            <BreakdownList
              title="Queen blunders by opening"
              items={stats.queenBlundersByOpening}
            />
          )}
          {stats.queenBlundersBySpeed.length > 0 && (
            <BreakdownList
              title="Queen blunders by speed"
              items={stats.queenBlundersBySpeed.map((item) => ({
                label: formatSpeed(item.label),
                count: item.count,
              }))}
            />
          )}
        </div>
      )}

      <div className="blunders-section__table">
        <h4>Queen blunder hall of shame</h4>
        {stats.queenBlunders.length === 0 ? (
          <p className="table-empty">
            No queen blunders found — either elite queen safety or no PGN data
            yet.
          </p>
        ) : (
          <DataTable
            rows={stats.queenBlunders.slice(0, 25)}
            emptyMessage="No queen blunders"
            columns={[
              {
                key: 'date',
                header: 'Date',
                render: (row) => formatDate(row.date),
              },
              {
                key: 'opponent',
                header: 'Opponent',
                render: (row) => row.opponent,
              },
              {
                key: 'move',
                header: 'Move',
                render: (row) => `${row.moveNumber}. ${row.moveSan}`,
              },
              {
                key: 'kind',
                header: 'How',
                render: (row) =>
                  row.kind === 'hung' ? 'Hung the queen' : 'Queen captured',
              },
              {
                key: 'opening',
                header: 'Opening',
                render: (row) => row.opening ?? '—',
              },
              {
                key: 'result',
                header: 'Result',
                align: 'right',
                render: (row) => (
                  <span className={`result-pill result-pill--${row.result}`}>
                    {row.result}
                  </span>
                ),
              },
              {
                key: 'game',
                header: 'Game',
                align: 'right',
                render: (row) => (
                  <a
                    className="blunders-section__link"
                    href={lichessGameUrl(row.gameId)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                ),
              },
            ]}
          />
        )}
      </div>
    </section>
  )
}

function BreakdownList({
  title,
  items,
}: {
  title: string
  items: { label: string; count: number }[]
}) {
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="blunders-breakdown">
      <h4>{title}</h4>
      <div className="bar-chart">
        {items.map((item) => (
          <div key={item.label} className="bar-chart__row">
            <span className="bar-chart__label">{item.label}</span>
            <div className="bar-chart__track">
              <div
                className="bar-chart__fill bar-chart__fill--blunder"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="bar-chart__value">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
