ALTER TABLE public.prescriptions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.lab_reports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.verification_logs ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS prescriptions_user_id_idx ON public.prescriptions(user_id);
CREATE INDEX IF NOT EXISTS lab_reports_user_id_idx ON public.lab_reports(user_id);
CREATE INDEX IF NOT EXISTS verification_logs_user_id_idx ON public.verification_logs(user_id);

DROP POLICY IF EXISTS "public lab all" ON public.lab_reports;
DROP POLICY IF EXISTS "public rx all" ON public.prescriptions;
DROP POLICY IF EXISTS "public vlog all" ON public.verification_logs;

ALTER TABLE public.lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_logs TO authenticated;
GRANT ALL ON public.lab_reports TO service_role;
GRANT ALL ON public.prescriptions TO service_role;
GRANT ALL ON public.verification_logs TO service_role;

CREATE POLICY "Users manage own lab reports"
  ON public.lab_reports FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own prescriptions"
  ON public.prescriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own verification logs"
  ON public.verification_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own scans" ON storage.objects;
CREATE POLICY "Users update own scans"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'scans' AND auth.uid()::text = (storage.foldername(name))[1]);