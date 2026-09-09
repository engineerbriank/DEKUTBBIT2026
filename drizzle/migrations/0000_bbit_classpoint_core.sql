-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Units
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  lecturer TEXT NOT NULL DEFAULT '',
  year INT NOT NULL DEFAULT 1,
  semester INT NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.units TO authenticated, anon;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units readable" ON public.units FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins manage units" ON public.units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);
GRANT SELECT ON public.categories TO authenticated, anon;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.categories FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Resources
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  lecturer TEXT NOT NULL DEFAULT '',
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  status TEXT NOT NULL DEFAULT 'published',
  download_count INT NOT NULL DEFAULT 0,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published resources readable" ON public.resources FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "admins read all resources" ON public.resources FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage resources" ON public.resources FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published announcements readable" ON public.announcements FOR SELECT TO authenticated USING (status = 'published');
CREATE POLICY "admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Timetable
CREATE TABLE public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  lecturer TEXT NOT NULL DEFAULT ''
);
GRANT SELECT ON public.timetable TO authenticated;
GRANT ALL ON public.timetable TO service_role;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timetable readable" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage timetable" ON public.timetable FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AI documents uploaded by students
CREATE TABLE public.ai_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT '',
  char_count INT NOT NULL DEFAULT 0,
  extracted_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.ai_documents TO authenticated;
GRANT ALL ON public.ai_documents TO service_role;
ALTER TABLE public.ai_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai docs" ON public.ai_documents FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "delete own ai docs" ON public.ai_documents FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- AI chat history
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  document_id UUID REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai messages" ON public.ai_messages FOR SELECT TO authenticated USING (auth.uid() = owner_id);

-- Generated exams
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exams" ON public.exams FOR SELECT TO authenticated USING (auth.uid() = owner_id);

INSERT INTO public.categories (slug, name, description) VALUES
  ('notes', 'Notes', 'Lecture notes and study material'),
  ('assignments', 'Assignments', 'Assignment briefs and submissions guidance'),
  ('past-papers', 'Past Papers', 'Previous examination papers'),
  ('cats', 'CATs', 'Continuous assessment tests'),
  ('slides', 'Slides', 'Lecture slide decks');

INSERT INTO public.units (code, name, lecturer, year, semester, description) VALUES
  ('BBIT 1101', 'Introduction to Business Information Technology', 'Dr. A. Mwangi', 1, 1, 'Foundations of BBIT'),
  ('BEC 2110', 'Business Economics', 'Prof. J. Otieno', 2, 1, 'Micro and macro economics for IT professionals'),
  ('BIT 2203', 'Database Systems', 'Dr. L. Wanjiru', 2, 2, 'Relational design, SQL and transactions'),
  ('BIT 2305', 'Systems Analysis and Design', 'Mr. K. Kiptoo', 3, 1, 'SDLC, modelling and requirements'),
  ('BIT 2401', 'Data Communication and Networks', 'Dr. S. Achieng', 4, 1, 'Networking fundamentals and protocols');