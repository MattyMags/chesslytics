# Chesslytics

A chess analytics dashboard built with React, chess.js, and the Lichess API.

## Stack

- **Vite + React + TypeScript** — fast dev server, modern tooling (CRA is deprecated)
- **chess.js** — game parsing and move validation
- **Lichess API** — player stats and game history (coming soon)
- **Vercel** — deployment

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deploy to Vercel

1. Push this repo to GitHub (if not already).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Vite — no extra config needed.
4. Click **Deploy**.

Or use the CLI:

```bash
npm i -g vercel
vercel
```

## Roadmap

- [ ] Fetch Lichess player profile & ratings
- [ ] Import and parse PGN games
- [ ] Head-to-head stats between two players
- [ ] Opening repertoire breakdown
- [ ] Rating trend charts
