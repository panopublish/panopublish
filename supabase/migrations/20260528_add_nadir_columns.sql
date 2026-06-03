ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS nadir_logo_url text;
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS nadir_type text default 'none';
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS nadir_size text default '13%';
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS nadir_pos text default 'btm';
