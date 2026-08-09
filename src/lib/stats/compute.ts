import { Chess } from 'chess.js'
import type { LichessGame } from '../../types/lichess'
import {
  DAY_NAMES,
  getOpponentRating,
  getOpponentUsername,
  getPlayerAnalysis,
  getPlayerColor,
  getPlayerRating,
  getRatingDiff,
  getResult,
  MONTH_NAMES,
  sortGamesByDate,
  sortGamesByDateDesc,
} from '../game-utils'
import {
  addToRecord,
  finalizeRecord,
  median,
  topCounts,
  type ActivityStats,
  type GameRecord,
  type HeadToHeadStats,
  type OpeningStat,
  type OpponentStat,
  type PlayerStats,
  type SpeedStat,
  type StreakInfo,
  type VariantStat,
} from './types'

function getMoveCount(pgn: string | undefined): number | undefined {
  if (!pgn) return undefined
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)
    return chess.history().length
  } catch {
    return undefined
  }
}

function getGameDurationMinutes(game: LichessGame): number | undefined {
  if (!game.lastMoveAt || !game.createdAt) return undefined
  const ms = game.lastMoveAt - game.createdAt
  if (ms <= 0) return undefined
  return ms / 60_000
}

function computeStreaks(games: LichessGame[], username: string): StreakInfo {
  const sorted = sortGamesByDate(games)
  let longestWin = 0
  let longestLoss = 0
  let longestDraw = 0
  let currentWin = 0
  let currentLoss = 0
  let currentDraw = 0

  for (const game of sorted) {
    const result = getResult(game, username)
    if (!result) continue

    if (result === 'win') {
      currentWin++
      currentLoss = 0
      currentDraw = 0
      longestWin = Math.max(longestWin, currentWin)
    } else if (result === 'loss') {
      currentLoss++
      currentWin = 0
      currentDraw = 0
      longestLoss = Math.max(longestLoss, currentLoss)
    } else {
      currentDraw++
      currentWin = 0
      currentLoss = 0
      longestDraw = Math.max(longestDraw, currentDraw)
    }
  }

  const recent = sortGamesByDateDesc(games)
  let current: StreakInfo['current'] = { type: 'draw', count: 0 }

  for (const game of recent) {
    const result = getResult(game, username)
    if (!result) continue

    if (current.count === 0) {
      current = { type: result, count: 1 }
    } else if (current.type === result) {
      current.count++
    } else {
      break
    }
  }

  return {
    longestWin,
    longestLoss,
    longestDraw,
    current,
  }
}

function recordFromMap(
  map: Map<string, { wins: number; losses: number; draws: number }>,
): OpeningStat[] {
  return [...map.entries()]
    .map(([key, record]) => {
      const [eco, ...nameParts] = key.split('|')
      return {
        eco,
        name: nameParts.join('|'),
        games: record.wins + record.losses + record.draws,
        record: finalizeRecord(record),
      }
    })
    .filter((entry) => entry.games > 0)
    .sort((a, b) => b.games - a.games)
}

function recordMapToSpeedStats(
  map: Map<string, { wins: number; losses: number; draws: number }>,
): SpeedStat[] {
  return [...map.entries()]
    .map(([speed, record]) => ({
      speed,
      record: finalizeRecord(record),
    }))
    .sort((a, b) => b.record.games - a.record.games)
}

function recordMapToVariantStats(
  map: Map<string, { wins: number; losses: number; draws: number }>,
): VariantStat[] {
  return [...map.entries()]
    .map(([variant, record]) => ({
      variant,
      record: finalizeRecord(record),
    }))
    .sort((a, b) => b.record.games - a.record.games)
}

function recordMapToOpponents(
  map: Map<string, { wins: number; losses: number; draws: number }>,
  limit = 20,
): OpponentStat[] {
  return [...map.entries()]
    .map(([username, record]) => ({
      username,
      games: record.wins + record.losses + record.draws,
      record: finalizeRecord(record),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
}

function computeActivity(games: LichessGame[]): ActivityStats {
  if (games.length === 0) {
    return {
      firstGame: null,
      lastGame: null,
      spanDays: 0,
      gamesPerDay: 0,
      gamesLast7Days: 0,
      gamesLast30Days: 0,
      gamesLast90Days: 0,
      gamesLast365Days: 0,
      byYear: [],
      byMonth: [],
      byDayOfWeek: DAY_NAMES.map((day) => ({ day, count: 0 })),
    }
  }

  const sorted = sortGamesByDate(games)
  const firstGame = sorted[0].createdAt
  const lastGame = sorted[sorted.length - 1].createdAt
  const spanDays = Math.max(
    1,
    Math.ceil((lastGame - firstGame) / (1000 * 60 * 60 * 24)),
  )

  const now = Date.now()
  const day = 1000 * 60 * 60 * 24
  let gamesLast7Days = 0
  let gamesLast30Days = 0
  let gamesLast90Days = 0
  let gamesLast365Days = 0

  const yearCounts = new Map<number, number>()
  const monthCounts = new Map<string, number>()
  const dayCounts = new Map<number, number>()

  for (const game of games) {
    const age = now - game.createdAt
    if (age <= 7 * day) gamesLast7Days++
    if (age <= 30 * day) gamesLast30Days++
    if (age <= 90 * day) gamesLast90Days++
    if (age <= 365 * day) gamesLast365Days++

    const date = new Date(game.createdAt)
    const year = date.getFullYear()
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)

    const monthKey = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`
    monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1)
    dayCounts.set(date.getDay(), (dayCounts.get(date.getDay()) ?? 0) + 1)
  }

  const byYear = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year)

  const byMonth = [...monthCounts.entries()]
    .map(([key, count]) => {
      const [year, month] = key.split('-')
      return {
        key,
        label: `${MONTH_NAMES[Number(month) - 1]} ${year}`,
        count,
      }
    })
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-24)

  const byDayOfWeek = DAY_NAMES.map((day, index) => ({
    day,
    count: dayCounts.get(index) ?? 0,
  }))

  return {
    firstGame,
    lastGame,
    spanDays,
    gamesPerDay: games.length / spanDays,
    gamesLast7Days,
    gamesLast30Days,
    gamesLast90Days,
    gamesLast365Days,
    byYear,
    byMonth,
    byDayOfWeek,
  }
}

export function computePlayerStats(
  games: LichessGame[],
  username: string,
): PlayerStats {
  const overviewRaw = { wins: 0, losses: 0, draws: 0 }
  const whiteRaw = { wins: 0, losses: 0, draws: 0 }
  const blackRaw = { wins: 0, losses: 0, draws: 0 }
  const ratedRaw = { wins: 0, losses: 0, draws: 0 }
  const casualRaw = { wins: 0, losses: 0, draws: 0 }
  const vsHigherRaw = { wins: 0, losses: 0, draws: 0 }
  const vsLowerRaw = { wins: 0, losses: 0, draws: 0 }
  const vsSimilarRaw = { wins: 0, losses: 0, draws: 0 }

  const winsByStatus = new Map<string, number>()
  const lossesByStatus = new Map<string, number>()
  const drawsByStatus = new Map<string, number>()
  const openingMap = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >()
  const speedMap = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >()
  const variantMap = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >()
  const opponentMap = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >()

  const moveCounts: number[] = []
  let parsed = 0
  let failed = 0
  let durationTotal = 0
  let durationGames = 0

  let opponentRatingTotal = 0
  let opponentRatingGames = 0
  let ratingGainTotal = 0
  let ratingGainGames = 0
  let peakRating: number | null = null
  let bestWin: { opponent: string; rating: number } | null = null
  let worstLoss: { opponent: string; rating: number } | null = null

  let inaccuracyTotal = 0
  let mistakeTotal = 0
  let blunderTotal = 0
  let analyzedGames = 0

  const playerGames: LichessGame[] = []

  for (const game of games) {
    const result = getResult(game, username)
    if (!result) continue

    playerGames.push(game)
    addToRecord(overviewRaw, result)

    const color = getPlayerColor(game, username)!
    addToRecord(color === 'white' ? whiteRaw : blackRaw, result)
    addToRecord(game.rated ? ratedRaw : casualRaw, result)

    if (result === 'win') {
      winsByStatus.set(game.status, (winsByStatus.get(game.status) ?? 0) + 1)
    } else if (result === 'loss') {
      lossesByStatus.set(
        game.status,
        (lossesByStatus.get(game.status) ?? 0) + 1,
      )
    } else {
      drawsByStatus.set(game.status, (drawsByStatus.get(game.status) ?? 0) + 1)
    }

    if (game.opening?.name) {
      const key = `${game.opening.eco}|${game.opening.name}`
      const entry = openingMap.get(key) ?? { wins: 0, losses: 0, draws: 0 }
      addToRecord(entry, result)
      openingMap.set(key, entry)
    }

    const speedEntry = speedMap.get(game.speed) ?? {
      wins: 0,
      losses: 0,
      draws: 0,
    }
    addToRecord(speedEntry, result)
    speedMap.set(game.speed, speedEntry)

    const variantEntry = variantMap.get(game.variant) ?? {
      wins: 0,
      losses: 0,
      draws: 0,
    }
    addToRecord(variantEntry, result)
    variantMap.set(game.variant, variantEntry)

    const opponent = getOpponentUsername(game, username)
    if (opponent) {
      const oppEntry = opponentMap.get(opponent) ?? {
        wins: 0,
        losses: 0,
        draws: 0,
      }
      addToRecord(oppEntry, result)
      opponentMap.set(opponent, oppEntry)
    }

    const moves = getMoveCount(game.pgn)
    if (moves !== undefined) {
      parsed++
      moveCounts.push(moves)
    } else if (game.pgn) {
      failed++
    }

    const duration = getGameDurationMinutes(game)
    if (duration !== undefined) {
      durationTotal += duration
      durationGames++
    }

    const playerRating = getPlayerRating(game, username)
    const opponentRating = getOpponentRating(game, username)
    if (playerRating !== undefined) {
      peakRating =
        peakRating === null
          ? playerRating
          : Math.max(peakRating, playerRating)
    }

    if (opponentRating !== undefined) {
      opponentRatingTotal += opponentRating
      opponentRatingGames++

      if (playerRating !== undefined) {
        const diff = opponentRating - playerRating
        if (diff > 50) addToRecord(vsHigherRaw, result)
        else if (diff < -50) addToRecord(vsLowerRaw, result)
        else addToRecord(vsSimilarRaw, result)
      }

      if (result === 'win' && opponent) {
        if (!bestWin || opponentRating > bestWin.rating) {
          bestWin = { opponent, rating: opponentRating }
        }
      }

      if (result === 'loss' && opponent) {
        if (!worstLoss || opponentRating > worstLoss.rating) {
          worstLoss = { opponent, rating: opponentRating }
        }
      }
    }

    const ratingDiff = getRatingDiff(game, username)
    if (ratingDiff !== undefined) {
      ratingGainTotal += ratingDiff
      ratingGainGames++
    }

    const analysis = getPlayerAnalysis(game, username)
    if (analysis) {
      analyzedGames++
      inaccuracyTotal += analysis.inaccuracy
      mistakeTotal += analysis.mistake
      blunderTotal += analysis.blunder
    }
  }

  const overview = finalizeRecord(overviewRaw)

  return {
    total: overview.games,
    overview,
    color: {
      white: finalizeRecord(whiteRaw),
      black: finalizeRecord(blackRaw),
    },
    streaks: computeStreaks(playerGames, username),
    terminations: {
      winsBy: topCounts(winsByStatus),
      lossesBy: topCounts(lossesByStatus),
      drawsBy: topCounts(drawsByStatus),
    },
    openings: recordFromMap(openingMap).slice(0, 15),
    speeds: recordMapToSpeedStats(speedMap),
    variants: recordMapToVariantStats(variantMap),
    rated: finalizeRecord(ratedRaw),
    casual: finalizeRecord(casualRaw),
    opponents: recordMapToOpponents(opponentMap),
    rating: {
      avgOpponentRating:
        opponentRatingGames > 0
          ? opponentRatingTotal / opponentRatingGames
          : 0,
      avgRatingGain:
        ratingGainGames > 0 ? ratingGainTotal / ratingGainGames : 0,
      peakRating,
      bestWin,
      worstLoss,
      vsHigher: finalizeRecord(vsHigherRaw),
      vsLower: finalizeRecord(vsLowerRaw),
      vsSimilar: finalizeRecord(vsSimilarRaw),
    },
    accuracy: {
      gamesAnalyzed: analyzedGames,
      avgInaccuracies:
        analyzedGames > 0 ? inaccuracyTotal / analyzedGames : 0,
      avgMistakes: analyzedGames > 0 ? mistakeTotal / analyzedGames : 0,
      avgBlunders: analyzedGames > 0 ? blunderTotal / analyzedGames : 0,
    },
    pgn: {
      parsed,
      failed,
      avgMoves:
        moveCounts.length > 0
          ? moveCounts.reduce((a, b) => a + b, 0) / moveCounts.length
          : 0,
      medianMoves: median(moveCounts),
      shortest: moveCounts.length > 0 ? Math.min(...moveCounts) : 0,
      longest: moveCounts.length > 0 ? Math.max(...moveCounts) : 0,
      avgDurationMinutes:
        durationGames > 0 ? durationTotal / durationGames : 0,
    },
    activity: computeActivity(playerGames),
  }
}

export function computeHeadToHeadStats(
  games1: LichessGame[],
  username1: string,
  username2: string,
): HeadToHeadStats {
  const u2 = username2.toLowerCase()
  const h2hGames = games1.filter((game) => {
    const opponent = getOpponentUsername(game, username1)
    return opponent?.toLowerCase() === u2
  })

  const player1Raw = { wins: 0, losses: 0, draws: 0 }
  const player2Raw = { wins: 0, losses: 0, draws: 0 }
  const openingMap = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >()
  const speedMap = new Map<
    string,
    { wins: number; losses: number; draws: number }
  >()
  const terminationCounts = new Map<string, number>()
  const moveCounts: number[] = []

  for (const game of h2hGames) {
    const result = getResult(game, username1)
    if (!result) continue

    addToRecord(player1Raw, result)
    addToRecord(
      player2Raw,
      result === 'win' ? 'loss' : result === 'loss' ? 'win' : 'draw',
    )

    terminationCounts.set(
      game.status,
      (terminationCounts.get(game.status) ?? 0) + 1,
    )

    if (game.opening?.name) {
      const key = `${game.opening.eco}|${game.opening.name}`
      const entry = openingMap.get(key) ?? { wins: 0, losses: 0, draws: 0 }
      addToRecord(entry, result)
      openingMap.set(key, entry)
    }

    const speedEntry = speedMap.get(game.speed) ?? {
      wins: 0,
      losses: 0,
      draws: 0,
    }
    addToRecord(speedEntry, result)
    speedMap.set(game.speed, speedEntry)

    const moves = getMoveCount(game.pgn)
    if (moves !== undefined) moveCounts.push(moves)
  }

  const sorted = sortGamesByDate(h2hGames)

  return {
    total: h2hGames.length,
    player1: finalizeRecord(player1Raw),
    player2: finalizeRecord(player2Raw),
    avgMoves:
      moveCounts.length > 0
        ? moveCounts.reduce((a, b) => a + b, 0) / moveCounts.length
        : 0,
    openings: recordFromMap(openingMap).slice(0, 10),
    speeds: recordMapToSpeedStats(speedMap),
    terminations: topCounts(terminationCounts),
    firstGame: sorted[0]?.createdAt ?? null,
    lastGame: sorted[sorted.length - 1]?.createdAt ?? null,
  }
}

export type { GameRecord, PlayerStats, HeadToHeadStats }
