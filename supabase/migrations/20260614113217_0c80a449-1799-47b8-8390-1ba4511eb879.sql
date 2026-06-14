
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop dependent policies first
DROP POLICY IF EXISTS "own rx all" ON public.prescriptions;
DROP POLICY IF EXISTS "own lab all" ON public.lab_reports;
DROP POLICY IF EXISTS "own vlog all" ON public.verification_logs;

ALTER TABLE public.prescriptions
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS engine_outputs,
  DROP COLUMN IF EXISTS detected_medicines,
  DROP COLUMN IF EXISTS processing_time_ms;

ALTER TABLE public.medicines DROP COLUMN IF EXISTS abbreviations;

ALTER TABLE public.lab_reports
  DROP COLUMN IF EXISTS user_id,
  DROP COLUMN IF EXISTS patient_name,
  DROP COLUMN IF EXISTS summary;

ALTER TABLE public.verification_logs DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.verification_logs DROP COLUMN IF EXISTS raw_text;
ALTER TABLE public.verification_logs RENAME COLUMN matched_medicine TO medicine_name;

CREATE POLICY "public rx all" ON public.prescriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public lab all" ON public.lab_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public vlog all" ON public.verification_logs FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lab_reports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_logs TO anon, authenticated;
