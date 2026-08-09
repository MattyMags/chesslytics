import { formatSpeed, formatStatus, formatVariant } from '../lib/game-utils'
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPct,
  formatRating,
  formatRecord,
  streakLabel,
} from '../lib/format'
import type { PlayerStats } from '../lib/stats/types'
import { DataTable } from './DataTable'
import { RecordBar } from './RecordBar'
import { Section } from './Section'
import { StatCard } from './StatCard'

interface PlayerDashboardProps {
  label: string
  username: string
  stats: PlayerStats
}

export function PlayerDashboard({ label, username, stats }: PlayerDashboardProps) {
  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div className="dashboard-hero__identity">
          <h2>{label}</h2>
          <span className="dashboard-hero__username">@{username}</span>
        </div>
        <div className="metric-grid metric-grid--hero">
          <StatCard
            label="Total games"
            value={formatNumber(stats.total)}
            accent="neutral"
          />
          <StatCard
            label="Win rate"
            value={formatPct(stats.overview.winRate)}
            hint={formatRecord(stats.overview)}
            accent="win"
          />
          <StatCard
            label="Score"
            value={formatPct(stats.overview.scorePct)}
            hint="W + ½D"
            accent="neutral"
          />
          <StatCard
            label="Peak rating"
            value={
              stats.rating.peakRating
                ? formatRating(stats.rating.peakRating)
                : '—'
            }
            accent="neutral"
          />
        </div>
      </div>

      <Section title="Overview" description="Core performance at a glance">
        <div className="metric-grid">
          <StatCard
            label="Avg moves"
            value={formatNumber(stats.pgn.avgMoves, 1)}
            hint={`Median ${formatNumber(stats.pgn.medianMoves, 0)}`}
          />
          <StatCard
            label="Shortest game"
            value={`${stats.pgn.shortest} moves`}
          />
          <StatCard
            label="Longest game"
            value={`${stats.pgn.longest} moves`}
          />
          <StatCard
            label="PGN parsed"
            value={formatNumber(stats.pgn.parsed)}
            hint={
              stats.pgn.failed > 0
                ? `${stats.pgn.failed} failed (variants)`
                : undefined
            }
          />
          <StatCard
            label="Avg game length"
            value={
              stats.pgn.avgDurationMinutes > 0
                ? formatDuration(stats.pgn.avgDurationMinutes)
                : '—'
            }
          />
          <StatCard
            label="Avg opponent rating"
            value={
              stats.rating.avgOpponentRating > 0
                ? formatRating(stats.rating.avgOpponentRating)
                : '—'
            }
          />
          <StatCard
            label="Avg rating change"
            value={
              stats.rating.avgRatingGain !== 0
                ? `${stats.rating.avgRatingGain > 0 ? '+' : ''}${formatNumber(stats.rating.avgRatingGain, 1)}`
                : '—'
            }
          />
        </div>
      </Section>

      <div className="dashboard-columns">
        <Section title="By color" description="Performance as white vs black">
          <div className="split-cards">
            <div className="split-card">
              <div className="split-card__header">
                <span>White</span>
                <span>{formatRecord(stats.color.white)}</span>
              </div>
              <RecordBar record={stats.color.white} showLabels={false} />
              <span className="split-card__meta">
                {formatPct(stats.color.white.winRate)} win ·{' '}
                {formatNumber(stats.color.white.games)} games
              </span>
            </div>
            <div className="split-card">
              <div className="split-card__header">
                <span>Black</span>
                <span>{formatRecord(stats.color.black)}</span>
              </div>
              <RecordBar record={stats.color.black} showLabels={false} />
              <span className="split-card__meta">
                {formatPct(stats.color.black.winRate)} win ·{' '}
                {formatNumber(stats.color.black.games)} games
              </span>
            </div>
          </div>
        </Section>

        <Section title="Streaks" description="Momentum and runs">
          <div className="metric-grid metric-grid--compact">
            <StatCard
              label="Current streak"
              value={streakLabel(
                stats.streaks.current.type,
                stats.streaks.current.count,
              )}
              accent={
                stats.streaks.current.type === 'win'
                  ? 'win'
                  : stats.streaks.current.type === 'loss'
                    ? 'loss'
                    : 'draw'
              }
            />
            <StatCard
              label="Best win streak"
              value={String(stats.streaks.longestWin)}
              accent="win"
            />
            <StatCard
              label="Worst loss streak"
              value={String(stats.streaks.longestLoss)}
              accent="loss"
            />
            <StatCard
              label="Longest draw streak"
              value={String(stats.streaks.longestDraw)}
              accent="draw"
            />
          </div>
        </Section>
      </div>

      <Section
        title="How games end"
        description="Wins, losses, and draws by termination"
      >
        <div className="dashboard-columns">
          <TerminationList title="Wins by" items={stats.terminations.winsBy} />
          <TerminationList
            title="Losses by"
            items={stats.terminations.lossesBy}
          />
          <TerminationList title="Draws by" items={stats.terminations.drawsBy} />
        </div>
      </Section>

      <Section title="Time controls" description="Results by game speed">
        <div className="speed-grid">
          {stats.speeds.map(({ speed, record }) => (
            <div key={speed} className="speed-card">
              <div className="speed-card__header">
                <span>{formatSpeed(speed)}</span>
                <span>{formatNumber(record.games)}</span>
              </div>
              <RecordBar record={record} />
            </div>
          ))}
        </div>
      </Section>

      <div className="dashboard-columns">
        <Section title="Rated vs casual">
          <div className="split-cards">
            <div className="split-card">
              <div className="split-card__header">
                <span>Rated</span>
                <span>{formatRecord(stats.rated)}</span>
              </div>
              <RecordBar record={stats.rated} showLabels={false} />
            </div>
            <div className="split-card">
              <div className="split-card__header">
                <span>Casual</span>
                <span>{formatRecord(stats.casual)}</span>
              </div>
              <RecordBar record={stats.casual} showLabels={false} />
            </div>
          </div>
        </Section>

        <Section title="Variants">
          <div className="tag-list">
            {stats.variants.map(({ variant, record }) => (
              <div key={variant} className="tag-item">
                <span className="tag-item__name">{formatVariant(variant)}</span>
                <span className="tag-item__meta">
                  {formatRecord(record)} · {formatPct(record.winRate)} win
                </span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Section
        title="Rating matchups"
        description="Results vs higher, similar, and lower rated opponents"
      >
        <div className="metric-grid">
          <StatCard
            label="vs higher rated"
            value={formatRecord(stats.rating.vsHigher)}
            hint={`${formatPct(stats.rating.vsHigher.winRate)} win`}
          />
          <StatCard
            label="vs similar rating"
            value={formatRecord(stats.rating.vsSimilar)}
            hint={`${formatPct(stats.rating.vsSimilar.winRate)} win`}
          />
          <StatCard
            label="vs lower rated"
            value={formatRecord(stats.rating.vsLower)}
            hint={`${formatPct(stats.rating.vsLower.winRate)} win`}
          />
          <StatCard
            label="Best win"
            value={
              stats.rating.bestWin
                ? `vs ${stats.rating.bestWin.opponent} (${formatRating(stats.rating.bestWin.rating)})`
                : '—'
            }
            accent="win"
          />
          <StatCard
            label="Toughest loss"
            value={
              stats.rating.worstLoss
                ? `vs ${stats.rating.worstLoss.opponent} (${formatRating(stats.rating.worstLoss.rating)})`
                : '—'
            }
            accent="loss"
          />
        </div>
      </Section>

      {stats.accuracy.gamesAnalyzed > 0 && (
        <Section
          title="Accuracy"
          description={`From ${formatNumber(stats.accuracy.gamesAnalyzed)} analyzed games on Lichess`}
        >
          <div className="metric-grid">
            <StatCard
              label="Inaccuracies / game"
              value={formatNumber(stats.accuracy.avgInaccuracies, 1)}
            />
            <StatCard
              label="Mistakes / game"
              value={formatNumber(stats.accuracy.avgMistakes, 1)}
            />
            <StatCard
              label="Blunders / game"
              value={formatNumber(stats.accuracy.avgBlunders, 1)}
            />
          </div>
        </Section>
      )}

      <Section title="Openings" description="Most played openings and results">
        <DataTable
          rows={stats.openings}
          emptyMessage="No opening data available"
          columns={[
            {
              key: 'eco',
              header: 'ECO',
              render: (row) => row.eco,
            },
            {
              key: 'name',
              header: 'Opening',
              render: (row) => row.name,
            },
            {
              key: 'games',
              header: 'Games',
              align: 'right',
              render: (row) => formatNumber(row.games),
            },
            {
              key: 'record',
              header: 'Record',
              align: 'right',
              render: (row) => formatRecord(row.record),
            },
            {
              key: 'winRate',
              header: 'Win %',
              align: 'right',
              render: (row) => formatPct(row.record.winRate),
            },
            {
              key: 'score',
              header: 'Score %',
              align: 'right',
              render: (row) => formatPct(row.record.scorePct),
            },
          ]}
        />
      </Section>

      <Section title="Top opponents" description="Most frequent opponents">
        <DataTable
          rows={stats.opponents}
          emptyMessage="No opponent data"
          columns={[
            {
              key: 'username',
              header: 'Opponent',
              render: (row) => row.username,
            },
            {
              key: 'games',
              header: 'Games',
              align: 'right',
              render: (row) => formatNumber(row.games),
            },
            {
              key: 'record',
              header: 'Record',
              align: 'right',
              render: (row) => formatRecord(row.record),
            },
            {
              key: 'winRate',
              header: 'Win %',
              align: 'right',
              render: (row) => formatPct(row.record.winRate),
            },
          ]}
        />
      </Section>

      <Section title="Activity" description="When and how often you play">
        <div className="metric-grid">
          <StatCard
            label="First game"
            value={formatDate(stats.activity.firstGame)}
          />
          <StatCard
            label="Latest game"
            value={formatDate(stats.activity.lastGame)}
          />
          <StatCard
            label="Active span"
            value={`${formatNumber(stats.activity.spanDays)} days`}
          />
          <StatCard
            label="Games / day"
            value={formatNumber(stats.activity.gamesPerDay, 2)}
          />
          <StatCard
            label="Last 7 days"
            value={formatNumber(stats.activity.gamesLast7Days)}
          />
          <StatCard
            label="Last 30 days"
            value={formatNumber(stats.activity.gamesLast30Days)}
          />
          <StatCard
            label="Last 90 days"
            value={formatNumber(stats.activity.gamesLast90Days)}
          />
          <StatCard
            label="Last 365 days"
            value={formatNumber(stats.activity.gamesLast365Days)}
          />
        </div>

        <div className="dashboard-columns dashboard-columns--activity">
          <div className="activity-chart">
            <h4>By year</h4>
            <BarChart
              items={stats.activity.byYear.map((y) => ({
                label: String(y.year),
                value: y.count,
              }))}
            />
          </div>
          <div className="activity-chart">
            <h4>By day of week</h4>
            <BarChart
              items={stats.activity.byDayOfWeek.map((d) => ({
                label: d.day.slice(0, 3),
                value: d.count,
              }))}
            />
          </div>
        </div>

        {stats.activity.byMonth.length > 0 && (
          <div className="activity-chart activity-chart--wide">
            <h4>Recent months</h4>
            <BarChart
              items={stats.activity.byMonth.map((m) => ({
                label: m.label,
                value: m.count,
              }))}
              compact
            />
          </div>
        )}
      </Section>
    </div>
  )
}

function TerminationList({
  title,
  items,
}: {
  title: string
  items: { status: string; count: number }[]
}) {
  return (
    <div className="termination-list">
      <h4>{title}</h4>
      {items.length === 0 ? (
        <p className="table-empty">None</p>
      ) : (
        <ul>
          {items.map(({ status, count }) => (
            <li key={status}>
              <span>{formatStatus(status)}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BarChart({
  items,
  compact = false,
}: {
  items: { label: string; value: number }[]
  compact?: boolean
}) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className={`bar-chart ${compact ? 'bar-chart--compact' : ''}`}>
      {items.map((item) => (
        <div key={item.label} className="bar-chart__row">
          <span className="bar-chart__label">{item.label}</span>
          <div className="bar-chart__track">
            <div
              className="bar-chart__fill"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="bar-chart__value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
