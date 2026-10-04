-- Migration: Disable auto-generation of referral codes
-- Referral program is strictly private and only visible/enabled for users explicitly assigned by admin.

DROP TRIGGER IF EXISTS trg_ensure_user_referral_code ON public.profiles;
DROP FUNCTION IF EXISTS public.ensure_user_referral_code();

NOTIFY pgrst, 'reload schema';
