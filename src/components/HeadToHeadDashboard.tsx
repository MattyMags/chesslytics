import { formatSpeed, formatStatus } from '../lib/game-utils'
import {
  formatDate,
  formatNumber,
  formatPct,
  formatRecord,
} from '../lib/format'
import type { HeadToHeadStats } from '../lib/stats/types'
import { DataTable } from './DataTable'
import { RecordBar } from './RecordBar'
import { Section } from './Section'
import { StatCard } from './StatCard'

interface HeadToHeadDashboardProps {
  player1Label: string
  player2Label: string
  stats: HeadToHeadStats
}

export function HeadToHeadDashboard({
  player1Label,
  player2Label,
  stats,
}: HeadToHeadDashboardProps) {
  if (stats.total === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard-hero">
          <div className="dashboard-hero__identity">
            <h2>Head to head</h2>
            <span className="dashboard-hero__username">
              {player1Label} vs {player2Label}
            </span>
          </div>
        </div>
        <p className="table-empty">No games found between these two players.</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-hero">
        <div className="dashboard-hero__identity">
          <h2>Head to head</h2>
          <span className="dashboard-hero__username">
            {player1Label} vs {player2Label}
          </span>
        </div>
        <div className="metric-grid metric-grid--hero">
          <StatCard
            label="Total games"
            value={formatNumber(stats.total)}
          />
          <StatCard
            label={player1Label}
            value={formatRecord(stats.player1)}
            hint={`${formatPct(stats.player1.winRate)} win`}
            accent="win"
          />
          <StatCard
            label={player2Label}
            value={formatRecord(stats.player2)}
            hint={`${formatPct(stats.player2.winRate)} win`}
            accent="loss"
          />
          <StatCard
            label="Avg moves"
            value={formatNumber(stats.avgMoves, 1)}
          />
        </div>
      </div>

      <Section title="Match history span">
        <div className="metric-grid metric-grid--compact">
          <StatCard label="First game" value={formatDate(stats.firstGame)} />
          <StatCard label="Latest game" value={formatDate(stats.lastGame)} />
        </div>
      </Section>

      <div className="dashboard-columns">
        <Section title={`${player1Label}'s record`}>
          <RecordBar record={stats.player1} />
        </Section>
        <Section title={`${player2Label}'s record`}>
          <RecordBar record={stats.player2} />
        </Section>
      </div>

      <Section title="Time controls">
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

      <Section title="How games ended">
        <ul className="termination-inline">
          {stats.terminations.map(({ status, count }) => (
            <li key={status}>
              <span>{formatStatus(status)}</span>
              <span>{count}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Openings in your matchups">
        <DataTable
          rows={stats.openings}
          emptyMessage="No opening data"
          columns={[
            { key: 'eco', header: 'ECO', render: (row) => row.eco },
            { key: 'name', header: 'Opening', render: (row) => row.name },
            {
              key: 'games',
              header: 'Games',
              align: 'right',
              render: (row) => formatNumber(row.games),
            },
            {
              key: 'record',
              header: `${player1Label} record`,
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
    </div>
  )
}
