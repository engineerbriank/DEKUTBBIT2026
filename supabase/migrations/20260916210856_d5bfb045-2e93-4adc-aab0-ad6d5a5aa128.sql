ALTER TABLE public.study_groups
  ADD COLUMN whatsapp_url text NOT NULL DEFAULT '',
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN leader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN approved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.study_groups
  ADD CONSTRAINT study_groups_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT study_groups_whatsapp_url_check CHECK (
    whatsapp_url = '' OR whatsapp_url ~ '^https://(chat\\.whatsapp\\.com/|wa\\.me/)[A-Za-z0-9?&=_+%./-]+$'
  );

CREATE TABLE public.group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_announcements TO authenticated;
GRANT ALL ON public.group_announcements TO service_role;
ALTER TABLE public.group_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group members read announcements" ON public.group_announcements
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_announcements.group_id AND gm.user_id = auth.uid()
    )
  );
CREATE POLICY "group members post announcements" ON public.group_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.group_members gm
      JOIN public.study_groups sg ON sg.id = gm.group_id
      WHERE gm.group_id = group_announcements.group_id
        AND gm.user_id = auth.uid()
        AND sg.status = 'approved'
    )
  );
CREATE POLICY "authors update announcements" ON public.group_announcements
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authors or admins remove announcements" ON public.group_announcements
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.notifications
  ADD COLUMN group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "groups readable" ON public.study_groups;
DROP POLICY IF EXISTS "members create groups" ON public.study_groups;
DROP POLICY IF EXISTS "admins manage groups" ON public.study_groups;
CREATE POLICY "approved or owned groups readable" ON public.study_groups
  FOR SELECT TO authenticated
  USING (status = 'approved' OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "members create pending groups" ON public.study_groups
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND status = 'pending');
CREATE POLICY "admins update groups" ON public.study_groups
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins remove groups" ON public.study_groups
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "memberships readable" ON public.group_members;
DROP POLICY IF EXISTS "join groups" ON public.group_members;
DROP POLICY IF EXISTS "leave groups" ON public.group_members;
CREATE POLICY "own or admin memberships readable" ON public.group_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "join approved groups" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.study_groups sg WHERE sg.id = group_id AND (sg.status = 'approved' OR sg.created_by = auth.uid())
    )
  );
CREATE POLICY "leave groups or admin remove" ON public.group_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "notifications readable" ON public.notifications;
CREATE POLICY "relevant notifications readable" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    group_id IS NULL OR public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = notifications.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.set_group_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION public.set_group_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_group_updated_at() TO service_role;

CREATE TRIGGER set_study_groups_updated_at
BEFORE UPDATE ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.set_group_updated_at();

CREATE TRIGGER set_group_announcements_updated_at
BEFORE UPDATE ON public.group_announcements
FOR EACH ROW EXECUTE FUNCTION public.set_group_updated_at();