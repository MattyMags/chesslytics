import type { GameResult, LichessGame, PlayerColor } from '../types/lichess'

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

export function getOpponentUsername(
  game: LichessGame,
  username: string,
): string | undefined {
  const color = getPlayerColor(game, username)
  if (color === 'white') return game.players.black.user?.name
  if (color === 'black') return game.players.white.user?.name
  return undefined
}

export function getPlayerRating(
  game: LichessGame,
  username: string,
): number | undefined {
  const color = getPlayerColor(game, username)
  if (color === 'white') return game.players.white.rating
  if (color === 'black') return game.players.black.rating
  return undefined
}

export function getOpponentRating(
  game: LichessGame,
  username: string,
): number | undefined {
  const color = getPlayerColor(game, username)
  if (color === 'white') return game.players.black.rating
  if (color === 'black') return game.players.white.rating
  return undefined
}

export function getRatingDiff(
  game: LichessGame,
  username: string,
): number | undefined {
  const color = getPlayerColor(game, username)
  if (color === 'white') return game.players.white.ratingDiff
  if (color === 'black') return game.players.black.ratingDiff
  return undefined
}

export function getResult(
  game: LichessGame,
  username: string,
): GameResult | undefined {
  const color = getPlayerColor(game, username)
  if (!color) return undefined
  if (!game.winner) return 'draw'
  return game.winner === color ? 'win' : 'loss'
}

export function getPlayerAnalysis(game: LichessGame, username: string) {
  const color = getPlayerColor(game, username)
  if (color === 'white') return game.players.white.analysis
  if (color === 'black') return game.players.black.analysis
  return undefined
}

export function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    mate: 'Checkmate',
    resign: 'Resignation',
    stalemate: 'Stalemate',
    timeout: 'Timeout',
    outoftime: 'Out of time',
    draw: 'Draw agreement',
    insufficientMaterialClaim: 'Insufficient material',
    variantEnd: 'Variant end',
    aborted: 'Aborted',
    noStart: 'No start',
    unknownFinish: 'Unknown',
    created: 'Created',
    started: 'Started',
  }
  return labels[status] ?? status
}

export function formatSpeed(speed: string): string {
  const labels: Record<string, string> = {
    ultraBullet: 'UltraBullet',
    bullet: 'Bullet',
    blitz: 'Blitz',
    rapid: 'Rapid',
    classical: 'Classical',
    correspondence: 'Correspondence',
  }
  return labels[speed] ?? speed
}

export function formatVariant(variant: string): string {
  if (variant === 'standard') return 'Standard'
  return variant
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

export function sortGamesByDate(games: LichessGame[]): LichessGame[] {
  return [...games].sort((a, b) => a.createdAt - b.createdAt)
}

export function sortGamesByDateDesc(games: LichessGame[]): LichessGame[] {
  return [...games].sort((a, b) => b.createdAt - a.createdAt)
}

export function isHeadToHeadGame(
  game: LichessGame,
  username1: string,
  username2: string,
): boolean {
  const u1 = username1.toLowerCase()
  const u2 = username2.toLowerCase()
  const white = game.players.white.user?.name?.toLowerCase()
  const black = game.players.black.user?.name?.toLowerCase()
  return (
    (white === u1 && black === u2) || (white === u2 && black === u1)
  )
}

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const
