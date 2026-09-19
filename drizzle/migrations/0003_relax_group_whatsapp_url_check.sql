ALTER TABLE public.study_groups DROP CONSTRAINT IF EXISTS study_groups_whatsapp_url_check;

ALTER TABLE public.study_groups
  ADD CONSTRAINT study_groups_whatsapp_url_check
  CHECK (
    whatsapp_url = ''
    OR whatsapp_url ~* '^https://([a-z0-9-]+\.)*(whatsapp\.com|wa\.me)(/.*)?$'
  );