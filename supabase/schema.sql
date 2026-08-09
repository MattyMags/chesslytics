-- Run this in the Supabase SQL editor (Dashboard → SQL → New query)
--
-- RLS is enabled with no public policies on purpose:
-- - Browser never talks to Supabase directly (only /api routes)
-- - Vercel API uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS
-- - anon / authenticated keys cannot read or write these tables

create table if not exists games (
  id text primary key,
  username text not null,
  created_at bigint not null,
  data jsonb not null
);

create index if not exists games_username_created_at_idx
  on games (username, created_at desc);

create table if not exists sync_meta (
  username text primary key,
  game_count integer not null default 0,
  latest_created_at bigint,
  last_synced_at timestamptz not null default now()
);
npm run dev:stack
alter table games enable row level security;
alter table sync_meta enable row level security;

-- Intentionally no policies for anon or authenticated roles.
-- All access goes through serverless functions using the service role key.
