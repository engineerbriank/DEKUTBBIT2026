INSERT INTO public.categories (slug, name, description) VALUES
  ('notes', 'Notes', 'Lecture notes and summaries'),
  ('past-papers', 'Past Papers', 'Previous exam papers'),
  ('assignments', 'Assignments', 'Assignment questions and briefs'),
  ('cats', 'CATs', 'Continuous assessment tests'),
  ('slides', 'Slides', 'Lecture slide decks'),
  ('books', 'Books', 'Reference books and e-books'),
  ('labs', 'Labs', 'Practical and lab material')
ON CONFLICT (slug) DO NOTHING;