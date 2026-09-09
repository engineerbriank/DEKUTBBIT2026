CREATE POLICY "admins upload resources" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update resources" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete resources" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resources' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "auth read resources" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resources');

CREATE POLICY "own ai uploads insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own ai uploads read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own ai uploads delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ai-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);