-- 1) Restrict profiles direct reads
drop policy if exists "Profiles are public" on public.profiles;

create policy "Users read own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));

revoke select on public.profiles from anon;

-- 2) Public leaderboard view with only safe columns
drop view if exists public.leaderboard;
create view public.leaderboard as
  select id, username, high_score, games_played, total_coins, selected_car_slug
  from public.profiles;

grant select on public.leaderboard to anon, authenticated;

-- 3) Lock down SECURITY DEFINER function execution
revoke all on function public.get_player_rank(uuid) from public, anon, authenticated;
grant execute on function public.get_player_rank(uuid) to service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_stats() from public, anon, authenticated;

revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.is_staff(uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_staff(uuid) to authenticated, service_role;