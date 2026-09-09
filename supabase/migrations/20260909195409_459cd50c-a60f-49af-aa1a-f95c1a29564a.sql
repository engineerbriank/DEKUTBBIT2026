CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "admins manage units" ON public.units;
CREATE POLICY "admins manage units" ON public.units FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "admins manage resources" ON public.resources;
CREATE POLICY "admins manage resources" ON public.resources FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "admins read all resources" ON public.resources;
CREATE POLICY "admins read all resources" ON public.resources FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

DROP POLICY "admins manage categories" ON public.categories;
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "admins manage announcements" ON public.announcements;
CREATE POLICY "admins manage announcements" ON public.announcements FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "admins manage timetable" ON public.timetable;
CREATE POLICY "admins manage timetable" ON public.timetable FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

DROP POLICY "admins delete resources" ON storage.objects;
CREATE POLICY "admins delete resources" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'resources' AND private.has_role(auth.uid(),'admin'));

DROP POLICY "admins update resources" ON storage.objects;
CREATE POLICY "admins update resources" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'resources' AND private.has_role(auth.uid(),'admin'));

DROP POLICY "admins upload resources" ON storage.objects;
CREATE POLICY "admins upload resources" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resources' AND private.has_role(auth.uid(),'admin'));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);