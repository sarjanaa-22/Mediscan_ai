
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE public.medicines
  ADD COLUMN IF NOT EXISTS composition text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS excellent_review numeric,
  ADD COLUMN IF NOT EXISTS average_review numeric,
  ADD COLUMN IF NOT EXISTS poor_review numeric;

CREATE UNIQUE INDEX IF NOT EXISTS medicines_medicine_name_unique
  ON public.medicines (lower(medicine_name));

CREATE INDEX IF NOT EXISTS medicines_name_trgm
  ON public.medicines USING gin (medicine_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS medicines_composition_trgm
  ON public.medicines USING gin (composition gin_trgm_ops);
