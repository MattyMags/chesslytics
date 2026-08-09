import type { GameRecord } from './stats/types'

export function formatRecord({ wins, losses, draws }: GameRecord): string {
  return `${wins}W · ${losses}L · ${draws}D`
}

export function formatPct(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function formatRating(value: number): string {
  return Math.round(value).toLocaleString()
}

export function formatDate(timestamp: number | null): string {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function streakLabel(type: 'win' | 'loss' | 'draw', count: number): string {
  if (count === 0) return 'None'
  const label = type === 'win' ? 'Win' : type === 'loss' ? 'Loss' : 'Draw'
  return `${count} ${label}${count === 1 ? '' : 's'}`
}
