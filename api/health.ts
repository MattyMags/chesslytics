export const config = {
  maxDuration: 10,
}

type ApiResponse = {
  status: (code: number) => ApiResponse
  json: (body: unknown) => ApiResponse
}

export default function handler(_req: unknown, res: ApiResponse) {
  return res.status(200).json({
    ok: true,
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
    hasSupabaseKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    hasPlayer1: Boolean(process.env.PLAYER1_TOKEN || process.env.VITE_PLAYER1_TOKEN),
    hasPlayer2: Boolean(process.env.PLAYER2_TOKEN || process.env.VITE_PLAYER2_TOKEN),
  })
}
