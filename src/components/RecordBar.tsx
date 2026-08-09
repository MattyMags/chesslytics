import type { GameRecord } from '../lib/stats/types'
import { formatPct } from '../lib/format'

interface RecordBarProps {
  record: GameRecord
  showLabels?: boolean
}

export function RecordBar({ record, showLabels = true }: RecordBarProps) {
  if (record.games === 0) {
    return <div className="record-bar record-bar--empty">No games</div>
  }

  const winPct = (record.wins / record.games) * 100
  const lossPct = (record.losses / record.games) * 100
  const drawPct = (record.draws / record.games) * 100

  return (
    <div className="record-bar">
      <div className="record-bar__track">
        <div
          className="record-bar__segment record-bar__segment--win"
          style={{ width: `${winPct}%` }}
        />
        <div
          className="record-bar__segment record-bar__segment--draw"
          style={{ width: `${drawPct}%` }}
        />
        <div
          className="record-bar__segment record-bar__segment--loss"
          style={{ width: `${lossPct}%` }}
        />
      </div>
      {showLabels && (
        <div className="record-bar__meta">
          <span>{record.wins}W</span>
          <span>{record.draws}D</span>
          <span>{record.losses}L</span>
          <span className="record-bar__rate">{formatPct(record.winRate)} win</span>
        </div>
      )}
    </div>
  )
}
