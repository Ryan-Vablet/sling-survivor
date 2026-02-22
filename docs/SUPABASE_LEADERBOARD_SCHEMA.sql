-- Leaderboard table for Sling Survivor
-- Run in Supabase Dashboard → SQL Editor → New query
-- Safe to re-run (merge-friendly): create if not exists, add columns only if missing.
create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  initials text not null,
  score bigint not null default 0,
  distance bigint not null default 0,
  scrap bigint not null default 0,
  gold bigint not null default 0,
  summary_json text,
  replay_url text,
  created_at timestamptz not null default now()
);

-- Add columns only if they don't exist (for schema merges / re-runs)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leaderboard' and column_name = 'replay_url') then
    alter table public.leaderboard add column replay_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'leaderboard' and column_name = 'game_version') then
    alter table public.leaderboard add column game_version text;
  end if;
end $$;

-- Allow anonymous read (for global leaderboard)
alter table public.leaderboard enable row level security;

drop policy if exists "Allow public read leaderboard" on public.leaderboard;
create policy "Allow public read leaderboard"
  on public.leaderboard for select
  to anon
  using (true);

-- Allow anonymous insert (for submitting scores)
drop policy if exists "Allow public insert leaderboard" on public.leaderboard;
create policy "Allow public insert leaderboard"
  on public.leaderboard for insert
  to anon
  with check (true);

-- Storage: create bucket "replays" in Dashboard → Storage → New bucket.
-- Set bucket to public (or use signed URLs) so replay_url links work.
-- Object key pattern: {uuid}.json.gz (gzipped JSON replay).
