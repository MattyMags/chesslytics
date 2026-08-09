import type { PlayerConfig } from './types'

function env(key: string): string {
  return process.env[key]?.trim() ?? ''
}

export function getServerPlayers(): PlayerConfig[] {
  return [
    {
      id: 'player1',
      label: env('PLAYER1_LABEL') || env('VITE_PLAYER1_LABEL') || 'Player 1',
      username: env('PLAYER1_USERNAME') || env('VITE_PLAYER1_USERNAME'),
      token: env('PLAYER1_TOKEN') || env('VITE_PLAYER1_TOKEN'),
    },
    {
      id: 'player2',
      label: env('PLAYER2_LABEL') || env('VITE_PLAYER2_LABEL') || 'Player 2',
      username: env('PLAYER2_USERNAME') || env('VITE_PLAYER2_USERNAME'),
      token: env('PLAYER2_TOKEN') || env('VITE_PLAYER2_TOKEN'),
    },
  ]
}
