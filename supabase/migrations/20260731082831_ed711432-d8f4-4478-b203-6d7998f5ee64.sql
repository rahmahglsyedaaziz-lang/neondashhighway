-- 1. Replace policies that call has_role/is_staff with inline checks
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owner manages cars" ON public.cars;
CREATE POLICY "Owner manages cars" ON public.cars
  FOR ALL TO authenticated
  USING (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'owner'))
  WITH CHECK (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role = 'owner'));

DROP POLICY IF EXISTS "Users read own unlocks" ON public.unlocked_cars;
CREATE POLICY "Users read own unlocks" ON public.unlocked_cars
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('owner','admin')));

DROP POLICY IF EXISTS "Users read own runs" ON public.game_runs;
CREATE POLICY "Users read own runs" ON public.game_runs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('owner','admin')));

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid()
    OR exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.role in ('owner','admin')));

-- 2. Revoke direct execution of SECURITY DEFINER helpers from client roles
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;

-- 3. challenge_progress is server-written only
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.challenge_progress FROM anon, authenticated;
REVOKE ALL ON public.challenge_progress FROM anon;
GRANT SELECT ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;