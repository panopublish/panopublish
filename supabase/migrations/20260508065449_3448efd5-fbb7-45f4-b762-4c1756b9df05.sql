CREATE TABLE IF NOT EXISTS public.constellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tour_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.constellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own constellations all" ON public.constellations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS constellation_id uuid,
  ADD COLUMN IF NOT EXISTS spacing text DEFAULT '3m',
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS heading double precision;