-- Add columns to profiles for TSRHELP promo tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS applied_promo text,
ADD COLUMN IF NOT EXISTS promo_discount_redeemed boolean NOT NULL DEFAULT false;

-- Create index for fast promo lookup
CREATE INDEX IF NOT EXISTS idx_profiles_applied_promo ON public.profiles(applied_promo);
