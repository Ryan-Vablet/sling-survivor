-- Leaderboard table for Sling Survivor
-- Run in Supabase Dashboard → SQL Editor → New query
create table if not exists public.leaderboard (
  id bigint generated always as identity primary key,
  initials text not null,
  score bigint not null default 0,
  distance bigint not null default 0,
  scrap bigint not null default 0,
  gold bigint not null default 0,
  summary_json text,
  created_at timestamptz not null default now()
);

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
