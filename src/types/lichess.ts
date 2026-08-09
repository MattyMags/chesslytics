export type PlayerColor = 'white' | 'black'

export interface LichessPlayer {
  user?: { name: string; id?: string }
  rating?: number
  ratingDiff?: number
  analysis?: { inaccuracy: number; mistake: number; blunder: number }
}

export interface LichessGame {
  id: string
  rated: boolean
  variant: string
  speed: string
  perf: string
  createdAt: number
  lastMoveAt: number
  status: string
  source?: string
  players: {
    white: LichessPlayer
    black: LichessPlayer
  }
  winner?: PlayerColor
  opening?: { eco: string; name: string; ply: number }
  moves?: string
  pgn?: string
  clock?: { initial: number; increment: number; totalTime: number }
}
