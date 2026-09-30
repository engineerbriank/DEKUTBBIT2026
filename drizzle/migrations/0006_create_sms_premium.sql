CREATE TABLE public.sms_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('week','two_weeks','month')),
  amount integer NOT NULL,
  phone text NOT NULL,
  checkout_request_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  receipt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_payments TO authenticated;
GRANT ALL ON public.sms_payments TO service_role;
ALTER TABLE public.sms_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own payments readable" ON public.sms_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sms_subscribers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  premium_until timestamptz,
  phone text,
  phone_verified boolean NOT NULL DEFAULT false,
  pending_phone text,
  code_hash text,
  code_expires_at timestamptz,
  code_attempts integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_subscribers TO authenticated;
GRANT ALL ON public.sms_subscribers TO service_role;
ALTER TABLE public.sms_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscription readable" ON public.sms_subscribers FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  message text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  accepted_count integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  dedupe_key text UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sms logs" ON public.sms_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));