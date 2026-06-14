
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE POLICY "own scans select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own scans insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own scans delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);
