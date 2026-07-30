CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;

-- Extra run stats (additive, safe defaults)
ALTER TABLE public.game_runs
  ADD COLUMN IF NOT EXISTS near_misses integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_combo integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_m integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS police_escapes integer NOT NULL DEFAULT 0;

-- Daily challenges (public catalogue, one per day)
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_date date NOT NULL UNIQUE,
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  target integer NOT NULL,
  reward_coins integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.daily_challenges TO anon;
GRANT SELECT ON public.daily_challenges TO authenticated;
GRANT ALL ON public.daily_challenges TO service_role;

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Daily challenges are public" ON public.daily_challenges;
CREATE POLICY "Daily challenges are public"
  ON public.daily_challenges FOR SELECT
  TO anon, authenticated
  USING (true);

DROP TRIGGER IF EXISTS update_daily_challenges_updated_at ON public.daily_challenges;
CREATE TRIGGER update_daily_challenges_updated_at
  BEFORE UPDATE ON public.daily_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-player progress
CREATE TABLE IF NOT EXISTS public.challenge_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);

GRANT SELECT ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own challenge progress" ON public.challenge_progress;
CREATE POLICY "Users read own challenge progress"
  ON public.challenge_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_challenge_progress_updated_at ON public.challenge_progress;
CREATE TRIGGER update_challenge_progress_updated_at
  BEFORE UPDATE ON public.challenge_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Deterministic daily challenge generator based on the database date
CREATE OR REPLACE FUNCTION public.ensure_daily_challenge()
RETURNS public.daily_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d date := (now() AT TIME ZONE 'utc')::date;
  result public.daily_challenges;
  idx integer;
BEGIN
  SELECT * INTO result FROM public.daily_challenges WHERE challenge_date = d;
  IF FOUND THEN
    RETURN result;
  END IF;

  idx := (EXTRACT(EPOCH FROM d)::bigint / 86400) % 5;

  INSERT INTO public.daily_challenges (challenge_date, kind, title, description, target, reward_coins)
  VALUES (
    d,
    CASE idx WHEN 0 THEN 'distance' WHEN 1 THEN 'near_miss' WHEN 2 THEN 'combo'
             WHEN 3 THEN 'survive' ELSE 'score' END,
    CASE idx WHEN 0 THEN 'Long Haul' WHEN 1 THEN 'Close Shaves' WHEN 2 THEN 'Combo Artist'
             WHEN 3 THEN 'Endurance Run' ELSE 'Score Chaser' END,
    CASE idx WHEN 0 THEN 'Drive 5,000 meters in a single run'
             WHEN 1 THEN 'Get 10 near misses in a single run'
             WHEN 2 THEN 'Chain a 5x near miss combo'
             WHEN 3 THEN 'Survive for 3 minutes in a single run'
             ELSE 'Reach a score of 60 in a single run' END,
    CASE idx WHEN 0 THEN 5000 WHEN 1 THEN 10 WHEN 2 THEN 5 WHEN 3 THEN 180 ELSE 60 END,
    CASE idx WHEN 0 THEN 80 WHEN 1 THEN 60 WHEN 2 THEN 70 WHEN 3 THEN 100 ELSE 90 END
  )
  ON CONFLICT (challenge_date) DO NOTHING;

  SELECT * INTO result FROM public.daily_challenges WHERE challenge_date = d;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_daily_challenge() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_daily_challenge() TO service_role;