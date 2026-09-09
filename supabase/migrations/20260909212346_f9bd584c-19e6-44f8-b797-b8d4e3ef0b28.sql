CREATE OR REPLACE FUNCTION public.generate_recovery_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path TO 'public', 'extensions'
AS $$ SELECT upper(substr(replace(encode(gen_random_bytes(9), 'base64'), '/', 'X'), 1, 8)); $$;
REVOKE EXECUTE ON FUNCTION public.generate_recovery_code() FROM anon, authenticated, public;