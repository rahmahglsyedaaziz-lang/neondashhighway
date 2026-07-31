CREATE TABLE public.daily_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  claim_date date NOT NULL,
  streak integer NOT NULL DEFAULT 1,
  coins_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, claim_date)
);

GRANT SELECT ON public.daily_logins TO authenticated;
GRANT ALL ON public.daily_logins TO service_role;

ALTER TABLE public.daily_logins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own daily logins" ON public.daily_logins
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER update_daily_logins_updated_at
  BEFORE UPDATE ON public.daily_logins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();