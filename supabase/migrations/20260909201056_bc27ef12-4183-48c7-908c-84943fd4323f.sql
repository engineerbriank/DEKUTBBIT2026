ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS source_file text;
ALTER TABLE public.timetable ADD COLUMN IF NOT EXISTS group_label text;
ALTER TABLE public.timetable ALTER COLUMN unit_id DROP NOT NULL;

DROP POLICY IF EXISTS "timetable readable" ON public.timetable;
CREATE POLICY "published timetable readable" ON public.timetable
  FOR SELECT TO authenticated
  USING (status = 'published' OR private.has_role(auth.uid(), 'admin'::app_role));