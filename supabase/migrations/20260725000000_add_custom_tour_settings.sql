-- Add custom_settings column to tours table
ALTER TABLE public.tours ADD COLUMN IF NOT EXISTS custom_settings TEXT DEFAULT '{}';

-- Add metadata column to connections table
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS metadata TEXT DEFAULT '{}';
