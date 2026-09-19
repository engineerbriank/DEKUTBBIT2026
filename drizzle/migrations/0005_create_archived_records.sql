CREATE TABLE public.archived_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX archived_records_table_idx ON public.archived_records (table_name, deleted_at DESC);

GRANT SELECT ON public.archived_records TO authenticated;
GRANT ALL ON public.archived_records TO service_role;

ALTER TABLE public.archived_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read archived records" ON public.archived_records
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
