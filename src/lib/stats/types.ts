import type { GameResult } from '../../types/lichess'

export interface GameRecord {
  wins: number
  losses: number
  draws: number
  games: number
  winRate: number
  scorePct: number
}

export interface StreakInfo {
  longestWin: number
  longestLoss: number
  longestDraw: number
  current: { type: GameResult; count: number }
}

export interface OpeningStat {
  eco: string
  name: string
  games: number
  record: GameRecord
}

export interface SpeedStat {
  speed: string
  record: GameRecord
}

export interface VariantStat {
  variant: string
  record: GameRecord
}

export interface OpponentStat {
  username: string
  games: number
  record: GameRecord
}

export interface TerminationStat {
  status: string
  count: number
}

export interface YearStat {
  year: number
  count: number
}

export interface MonthStat {
  key: string
  label: string
  count: number
}

export interface RatingInsights {
  avgOpponentRating: number
  avgRatingGain: number
  peakRating: number | null
  bestWin: { opponent: string; rating: number } | null
  worstLoss: { opponent: string; rating: number } | null
  vsHigher: GameRecord
  vsLower: GameRecord
  vsSimilar: GameRecord
}

export interface AccuracyStats {
  gamesAnalyzed: number
  avgInaccuracies: number
  avgMistakes: number
  avgBlunders: number
}

export interface PgnStats {
  parsed: number
  failed: number
  avgMoves: number
  medianMoves: number
  shortest: number
  longest: number
  avgDurationMinutes: number
}

export interface ActivityStats {
  firstGame: number | null
  lastGame: number | null
  spanDays: number
  gamesPerDay: number
  gamesLast7Days: number
  gamesLast30Days: number
  gamesLast90Days: number
  gamesLast365Days: number
  byYear: YearStat[]
  byMonth: MonthStat[]
  byDayOfWeek: { day: string; count: number }[]
}

export interface PlayerStats {
  total: number
  overview: GameRecord
  color: { white: GameRecord; black: GameRecord }
  streaks: StreakInfo
  terminations: {
    winsBy: TerminationStat[]
    lossesBy: TerminationStat[]
    drawsBy: TerminationStat[]
  }
  openings: OpeningStat[]
  speeds: SpeedStat[]
  variants: VariantStat[]
  rated: GameRecord
  casual: GameRecord
  opponents: OpponentStat[]
  rating: RatingInsights
  accuracy: AccuracyStats
  pgn: PgnStats
  activity: ActivityStats
}

export interface HeadToHeadStats {
  total: number
  player1: GameRecord
  player2: GameRecord
  avgMoves: number
  openings: OpeningStat[]
  speeds: SpeedStat[]
  terminations: TerminationStat[]
  firstGame: number | null
  lastGame: number | null
}

export function emptyRecord(): GameRecord {
  return {
    wins: 0,
    losses: 0,
    draws: 0,
    games: 0,
    winRate: 0,
    scorePct: 0,
  }
}

export function finalizeRecord(record: {
  wins: number
  losses: number
  draws: number
}): GameRecord {
  const games = record.wins + record.losses + record.draws
  const decided = record.wins + record.losses
  return {
    ...record,
    games,
    winRate: decided > 0 ? (record.wins / decided) * 100 : 0,
    scorePct: games > 0 ? ((record.wins + record.draws * 0.5) / games) * 100 : 0,
  }
}

export function addToRecord(
  record: { wins: number; losses: number; draws: number },
  result: GameResult,
) {
  if (result === 'win') record.wins++
  else if (result === 'loss') record.losses++
  else record.draws++
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function topCounts(
  counts: Map<string, number>,
  limit = 10,
): TerminationStat[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([status, count]) => ({ status, count }))
}
