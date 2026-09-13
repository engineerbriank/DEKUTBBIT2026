GRANT ALL ON public.admin_allowlist TO service_role;
REVOKE ALL ON public.admin_allowlist FROM anon, authenticated;
DROP POLICY IF EXISTS "service role manages admin allowlist" ON public.admin_allowlist;
CREATE POLICY "service role manages admin allowlist" ON public.admin_allowlist FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON public.recovery_codes TO authenticated;
GRANT ALL ON public.recovery_codes TO service_role;
REVOKE ALL ON public.recovery_codes FROM anon;
DROP POLICY IF EXISTS "members read own recovery code" ON public.recovery_codes;
CREATE POLICY "members read own recovery code" ON public.recovery_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;