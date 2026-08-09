import { Chess, type Color, type Move, type Square } from 'chess.js'
import type { LichessGame, PlayerColor } from '../../types/lichess'
import {
  getOpponentUsername,
  getPlayerColor,
  getPlayerAnalysis,
  getResult,
} from '../game-utils'
import type {
  BlunderBreakdown,
  BlunderStats,
  QueenBlunderEvent,
} from './types'

function countQueens(chess: Chess, color: Color): number {
  let count = 0
  for (const row of chess.board()) {
    for (const piece of row) {
      if (piece?.type === 'q' && piece.color === color) count++
    }
  }
  return count
}

function isQueenTrade(
  moves: Move[],
  queenLostIndex: number,
  playerColor: Color,
): boolean {
  for (let offset = -3; offset <= 3; offset++) {
    if (offset === 0) continue
    const move = moves[queenLostIndex + offset]
    if (!move || move.color !== playerColor || move.captured !== 'q') continue
    return true
  }
  return false
}

export function findQueenBlundersInPgn(
  pgn: string,
  playerColor: PlayerColor,
): Pick<
  QueenBlunderEvent,
  'moveNumber' | 'moveSan' | 'playerColor' | 'kind'
>[] {
  const chess = new Chess()
  try {
    chess.loadPgn(pgn, { strict: false })
  } catch {
    return []
  }

  const moves = chess.history({ verbose: true })
  chess.reset()

  const color: Color = playerColor === 'white' ? 'w' : 'b'
  if (countQueens(chess, color) === 0) return []

  const events: Pick<
    QueenBlunderEvent,
    'moveNumber' | 'moveSan' | 'playerColor' | 'kind'
  >[] = []

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i]
    const queensBefore = countQueens(chess, color)
    const opponentColor: Color = color === 'w' ? 'b' : 'w'
    const oppQueensBefore = countQueens(chess, opponentColor)

    chess.move({
      from: move.from as Square,
      to: move.to as Square,
      promotion: move.promotion,
    })

    const queensAfter = countQueens(chess, color)
    const oppQueensAfter = countQueens(chess, opponentColor)

    if (queensBefore <= queensAfter) continue
    if (oppQueensAfter < oppQueensBefore) continue
    if (isQueenTrade(moves, i, color)) continue

    const isPlayerMove = move.color === color
    events.push({
      moveNumber: Math.floor(i / 2) + 1,
      moveSan: move.san,
      playerColor,
      kind: isPlayerMove ? 'hung' : 'captured',
    })
  }

  return events
}

function topBreakdown(
  counts: Map<string, number>,
  limit = 8,
): BlunderBreakdown[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }))
}

export function computeBlunderStats(
  games: LichessGame[],
  username: string,
): BlunderStats {
  let gamesAnalyzed = 0
  let inaccuracyTotal = 0
  let mistakeTotal = 0
  let blunderTotal = 0

  let gamesWithPgn = 0
  const queenBlunders: QueenBlunderEvent[] = []
  const gamesWithQueenBlunder = new Set<string>()
  const openingCounts = new Map<string, number>()
  const speedCounts = new Map<string, number>()
  const recordAfterQueenBlunder = { wins: 0, losses: 0, draws: 0 }

  for (const game of games) {
    const color = getPlayerColor(game, username)
    const result = getResult(game, username)
    if (!color || !result) continue

    const analysis = getPlayerAnalysis(game, username)
    if (analysis) {
      gamesAnalyzed++
      inaccuracyTotal += analysis.inaccuracy
      mistakeTotal += analysis.mistake
      blunderTotal += analysis.blunder
    }

    if (!game.pgn) continue
    gamesWithPgn++

    const events = findQueenBlundersInPgn(game.pgn, color)
    if (events.length === 0) continue

    gamesWithQueenBlunder.add(game.id)
    const opponent = getOpponentUsername(game, username) ?? 'unknown'
    const opening = game.opening?.name

    for (const event of events) {
      queenBlunders.push({
        ...event,
        gameId: game.id,
        date: game.createdAt,
        opponent,
        result,
        opening,
        speed: game.speed,
        lichessBlunders: analysis?.blunder,
      })

      if (result === 'win') recordAfterQueenBlunder.wins++
      else if (result === 'loss') recordAfterQueenBlunder.losses++
      else recordAfterQueenBlunder.draws++

      if (opening) {
        openingCounts.set(opening, (openingCounts.get(opening) ?? 0) + 1)
      }
      speedCounts.set(game.speed, (speedCounts.get(game.speed) ?? 0) + 1)
    }
  }

  queenBlunders.sort((a, b) => b.date - a.date)

  const totalQueenBlunders = queenBlunders.length

  return {
    gamesAnalyzed,
    totalInaccuracies: inaccuracyTotal,
    totalMistakes: mistakeTotal,
    totalBlunders: blunderTotal,
    avgInaccuracies: gamesAnalyzed > 0 ? inaccuracyTotal / gamesAnalyzed : 0,
    avgMistakes: gamesAnalyzed > 0 ? mistakeTotal / gamesAnalyzed : 0,
    avgBlunders: gamesAnalyzed > 0 ? blunderTotal / gamesAnalyzed : 0,
    gamesWithPgn,
    totalQueenBlunders,
    queenBlundersPerGame:
      gamesWithPgn > 0 ? totalQueenBlunders / gamesWithPgn : 0,
    gamesWithQueenBlunder: gamesWithQueenBlunder.size,
    queenBlunderRate:
      gamesWithPgn > 0
        ? (gamesWithQueenBlunder.size / gamesWithPgn) * 100
        : 0,
    recordAfterQueenBlunder,
    queenBlunders,
    queenBlundersByOpening: topBreakdown(openingCounts),
    queenBlundersBySpeed: topBreakdown(speedCounts),
  }
}

export function lichessGameUrl(gameId: string): string {
  return `https://lichess.org/${gameId}`
}
