
-- Add location fields to tours
ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Connections table for Build Connections page
CREATE TABLE IF NOT EXISTS public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tour_id uuid NOT NULL,
  from_photo_id uuid NOT NULL,
  to_photo_id uuid NOT NULL,
  heading double precision DEFAULT 0,
  pitch double precision DEFAULT 0,
  group_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own connections all" ON public.connections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS connections_tour_idx ON public.connections(tour_id);
