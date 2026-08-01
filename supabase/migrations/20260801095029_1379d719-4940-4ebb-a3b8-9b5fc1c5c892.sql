CREATE TABLE IF NOT EXISTS public.career_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer NOT NULL CHECK (level >= 1 AND level <= 35),
  best_score integer NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, level)
);

GRANT SELECT ON public.career_progress TO authenticated;
GRANT ALL ON public.career_progress TO service_role;

ALTER TABLE public.career_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own career progress" ON public.career_progress;
CREATE POLICY "Users read own career progress"
  ON public.career_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());