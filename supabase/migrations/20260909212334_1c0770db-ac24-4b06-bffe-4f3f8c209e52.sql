CREATE TABLE IF NOT EXISTS public.recovery_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.recovery_codes TO service_role;
ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.generate_recovery_code()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$ SELECT upper(substr(replace(encode(gen_random_bytes(9), 'base64'), '/', 'X'), 1, 8)); $$;

REVOKE EXECUTE ON FUNCTION public.generate_recovery_code() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  INSERT INTO public.recovery_codes (user_id, code)
  VALUES (NEW.id, public.generate_recovery_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

INSERT INTO public.recovery_codes (user_id, code)
SELECT id, public.generate_recovery_code() FROM auth.users
ON CONFLICT (user_id) DO NOTHING;