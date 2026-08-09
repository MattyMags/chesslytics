export type PlayerColor = 'white' | 'black'
export type GameResult = 'win' | 'loss' | 'draw'

export interface LichessPlayer {
  user?: { name: string; id?: string }
  rating?: number
  ratingDiff?: number
  analysis?: {
    inaccuracy: number
    mistake: number
    blunder: number
  }
}

export interface LichessGame {
  id: string
  rated: boolean
  variant: string
  speed: string
  perf: string
  status: string
  createdAt: number
  lastMoveAt: number
  winner?: PlayerColor
  opening?: { eco: string; name: string; ply: number }
  pgn?: string
  players: {
    white: LichessPlayer
    black: LichessPlayer
  }
}
