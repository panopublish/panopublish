-- Add order_index column to photos table
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS order_index int not null default 0;

-- Notify postgrest to reload the schema cache
NOTIFY pgrst, 'reload schema';
