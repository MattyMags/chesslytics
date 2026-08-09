# Chesslytics

A chess analytics dashboard for you and a friend — built with React, chess.js, the Lichess API, Supabase, and Vercel.

## Stack

- **Vite + React + TypeScript** — frontend
- **chess.js** — PGN parsing and game stats
- **Lichess API** — game export (server-side only)
- **Supabase (Postgres)** — persistent game storage
- **Vercel serverless** — `/api/sync` and `/api/games`
- **Vercel** — hosting

## Setup

### 1. Supabase (free)

1. Create a project at [supabase.com](https://supabase.com)
2. Open **SQL Editor** → run the contents of [`supabase/schema.sql`](supabase/schema.sql)
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose in the client)

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Where |
|---|---|
| `VITE_PLAYER*_LABEL`, `VITE_PLAYER*_USERNAME` | Client (display) |
| `PLAYER*_USERNAME`, `PLAYER*_TOKEN` | Server (Lichess sync) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server (database) |

Create Lichess tokens at [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token) with **Read** scope.

Add the same server vars in Vercel (**Settings → Environment Variables**). Do **not** prefix tokens with `VITE_`.

### 3. Run locally

**Full app (Vite + API routes)** — use either:

```bash
npm install
npm run dev          # recommended — Vite with built-in /api routes
```

or:

```bash
npm run dev:stack    # alternative — vercel dev
```

Open [http://localhost:5173](http://localhost:5173) (Vite) or the URL shown by `vercel dev`.

## How sync works

1. **First visit** — API downloads full Lichess history → saves to Supabase
2. **Later visits** — loads games from Supabase instantly; checks Lichess for new games only (incremental)
3. **Fresh cache (< 1 hour)** — skips the Lichess API call entirely

Games persist in the database — works in private browsing and across devices.

## Deploy to Vercel

1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add all env vars from `.env.example` (server + client)
4. Deploy

## Optional: file backup

```bash
npm run sync:games
```

Writes games to `.cache/{username}.ndjson` on disk (local backup only).
