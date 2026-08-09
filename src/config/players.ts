export type PlayerId = 'player1' | 'player2'

export interface PlayerConfig {
  id: PlayerId
  label: string
  username: string
  token: string
}

export function getPlayers(): PlayerConfig[] {
  return [
    {
      id: 'player1',
      label: import.meta.env.VITE_PLAYER1_LABEL || 'Player 1',
      username: import.meta.env.VITE_PLAYER1_USERNAME || '',
      token: import.meta.env.VITE_PLAYER1_TOKEN || '',
    },
    {
      id: 'player2',
      label: import.meta.env.VITE_PLAYER2_LABEL || 'Player 2',
      username: import.meta.env.VITE_PLAYER2_USERNAME || '',
      token: import.meta.env.VITE_PLAYER2_TOKEN || '',
    },
  ]
}

export function getPlayer(id: PlayerId): PlayerConfig | undefined {
  return getPlayers().find((player) => player.id === id)
}
