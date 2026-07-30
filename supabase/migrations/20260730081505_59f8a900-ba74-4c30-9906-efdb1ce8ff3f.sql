drop view if exists public.leaderboard;
create view public.leaderboard with (security_invoker = on) as
  select id, username, high_score, games_played, total_coins, selected_car_slug
  from public.profiles;

grant select on public.leaderboard to anon, authenticated;

-- anon may read only the leaderboard-safe columns of profiles
create policy "Public leaderboard read"
  on public.profiles for select to anon
  using (true);

grant select (id, username, high_score, games_played, total_coins, selected_car_slug)
  on public.profiles to anon;