import { Chess } from 'chess.js'
import type { LichessGame, PlayerColor } from '../types/lichess'

export function getOpponentUsername(
  game: LichessGame,
  username: string,
): string | undefined {
  const normalized = username.toLowerCase()
  const white = game.players.white.user?.name?.toLowerCase()
  const black = game.players.black.user?.name?.toLowerCase()

  if (white === normalized) return game.players.black.user?.name
  if (black === normalized) return game.players.white.user?.name
  return undefined
}

export function getPlayerColor(
  game: LichessGame,
  username: string,
): PlayerColor | undefined {
  const normalized = username.toLowerCase()
  const white = game.players.white.user?.name?.toLowerCase()
  const black = game.players.black.user?.name?.toLowerCase()

  if (white === normalized) return 'white'
  if (black === normalized) return 'black'
  return undefined
}

export function getGamePgn(game: LichessGame): string | undefined {
  return game.pgn ?? undefined
}

export function validateGamePgn(pgn: string): boolean {
  try {
    const chess = new Chess()
    chess.loadPgn(pgn)
    return true
  } catch {
    return false
  }
}

export function formatGameResult(game: LichessGame, username: string): string {
  const color = getPlayerColor(game, username)
  if (!game.winner) return 'draw'
  if (!color) return game.winner
  return game.winner === color ? 'win' : 'loss'
}
