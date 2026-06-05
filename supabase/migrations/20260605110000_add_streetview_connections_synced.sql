-- Add streetview_connections_synced to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS streetview_connections_synced BOOLEAN NOT NULL DEFAULT false;
