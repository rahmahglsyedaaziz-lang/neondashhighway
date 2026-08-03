-- Limit anonymous public access on profiles to leaderboard-safe columns only
DROP POLICY IF EXISTS "Public leaderboard read" ON public.profiles;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, high_score, games_played, total_coins, selected_car_slug)
  ON public.profiles TO anon;

CREATE POLICY "Public leaderboard read"
  ON public.profiles FOR SELECT
  TO anon
  USING (high_score > 0);

GRANT SELECT ON public.leaderboard TO anon, authenticated;