ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_path text;

ALTER TABLE public.study_groups
ADD COLUMN IF NOT EXISTS logo_path text;

CREATE POLICY "authenticated users read user images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-images');

CREATE POLICY "users upload own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);