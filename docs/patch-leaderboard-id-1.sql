-- One-off patch: update leaderboard row id 1 with witnessed run stats.
-- (Run was lost in transition when leaderboard switched to Edge Function submit.)
-- Run in Supabase Dashboard → SQL Editor.

update public.leaderboard
set
  initials = 'BM*'
  score = 42069,
  distance = 42069,
  gold = 420,
  total_gold_earned = 69,
  game_version = '0.6'
where id = 1;
