-- Create Referral Program Tables & Profiles Columns
-- Commission Rate: Lifetime 25% recurring commission

-- 1. Extend profiles table with referral and payout fields
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS payout_upi_id text,
  ADD COLUMN IF NOT EXISTS payout_account_name text,
  ADD COLUMN IF NOT EXISTS payout_bank_account text,
  ADD COLUMN IF NOT EXISTS payout_ifsc text;

-- 2. Create referral_codes table
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  commission_percent numeric(5,2) NOT NULL DEFAULT 25.00,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);

-- 3. Create referral_attributions table (Permanent 1-to-1 account link)
CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referred_user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code_id uuid REFERENCES public.referral_codes(id) ON DELETE SET NULL,
  attributed_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_attributions_referrer ON public.referral_attributions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_attributions_referred ON public.referral_attributions(referred_user_id);

-- 4. Create referral_commissions ledger
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_source text NOT NULL DEFAULT 'razorpay_subscription', -- 'razorpay_subscription' | 'razorpay_order'
  payment_reference_id text NOT NULL,
  plan_name text,
  payment_amount_inr numeric(10,2) NOT NULL,
  commission_percent numeric(5,2) NOT NULL DEFAULT 25.00,
  commission_amount_inr numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'approved', -- 'pending' | 'approved' | 'paid' | 'void'
  payout_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON public.referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_ref_id ON public.referral_commissions(payment_reference_id);

-- 5. Create referral_payouts table
CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_inr numeric(10,2) NOT NULL,
  payout_method text NOT NULL DEFAULT 'upi', -- 'upi' | 'bank_transfer'
  payout_address text NOT NULL,
  transaction_reference text NOT NULL,
  processed_by text NOT NULL,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_payouts_referrer ON public.referral_payouts(referrer_user_id);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;

-- 7. Admin Full Access Policies
DROP POLICY IF EXISTS "Admin full access referral_codes" ON public.referral_codes;
CREATE POLICY "Admin full access referral_codes" ON public.referral_codes FOR ALL USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin full access referral_attributions" ON public.referral_attributions;
CREATE POLICY "Admin full access referral_attributions" ON public.referral_attributions FOR ALL USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin full access referral_commissions" ON public.referral_commissions;
CREATE POLICY "Admin full access referral_commissions" ON public.referral_commissions FOR ALL USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin full access referral_payouts" ON public.referral_payouts;
CREATE POLICY "Admin full access referral_payouts" ON public.referral_payouts FOR ALL USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

-- 8. Authenticated Users Read Policies
DROP POLICY IF EXISTS "Users view own referral_codes" ON public.referral_codes;
CREATE POLICY "Users view own referral_codes" ON public.referral_codes FOR SELECT USING (
  user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users view own referral_attributions" ON public.referral_attributions;
CREATE POLICY "Users view own referral_attributions" ON public.referral_attributions FOR SELECT USING (
  referrer_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users view own referral_commissions" ON public.referral_commissions;
CREATE POLICY "Users view own referral_commissions" ON public.referral_commissions FOR SELECT USING (
  referrer_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users view own referral_payouts" ON public.referral_payouts;
CREATE POLICY "Users view own referral_payouts" ON public.referral_payouts FOR SELECT USING (
  referrer_user_id = auth.uid()
);

-- 9. Allow anon/authenticated to validate referral codes during signup
DROP POLICY IF EXISTS "Public check referral_codes" ON public.referral_codes;
CREATE POLICY "Public check referral_codes" ON public.referral_codes FOR SELECT USING (
  is_active = true
);

-- 10. Grant privileges
GRANT ALL ON TABLE public.referral_codes TO postgres, service_role;
GRANT SELECT ON TABLE public.referral_codes TO authenticated, anon;
GRANT INSERT, UPDATE ON TABLE public.referral_codes TO authenticated;

GRANT ALL ON TABLE public.referral_attributions TO postgres, service_role;
GRANT SELECT ON TABLE public.referral_attributions TO authenticated;

GRANT ALL ON TABLE public.referral_commissions TO postgres, service_role;
GRANT SELECT ON TABLE public.referral_commissions TO authenticated;

GRANT ALL ON TABLE public.referral_payouts TO postgres, service_role;
GRANT SELECT ON TABLE public.referral_payouts TO authenticated;

-- Function: Ensure each profile has a referral code
CREATE OR REPLACE FUNCTION public.ensure_user_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  v_base_code text;
  v_final_code text;
  v_count int;
BEGIN
  IF NEW.referral_code IS NULL OR TRIM(NEW.referral_code) = '' THEN
    -- Generate code from username or email prefix
    IF NEW.username IS NOT NULL AND TRIM(NEW.username) != '' THEN
      v_base_code := UPPER(REGEXP_REPLACE(NEW.username, '[^a-zA-Z0-9]', '', 'g'));
    ELSE
      v_base_code := UPPER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'));
    END IF;

    IF LENGTH(v_base_code) < 3 THEN
      v_base_code := 'PANO' || SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 4);
    END IF;

    v_final_code := v_base_code;
    
    -- Check collision and append random digits if needed
    SELECT COUNT(*) INTO v_count FROM public.referral_codes WHERE code = v_final_code;
    IF v_count > 0 THEN
      v_final_code := v_base_code || FLOOR(100 + RANDOM() * 899)::text;
    END IF;

    NEW.referral_code := v_final_code;

    -- Also insert into referral_codes table
    INSERT INTO public.referral_codes (user_id, code, commission_percent, is_active)
    VALUES (NEW.id, v_final_code, 25.00, true)
    ON CONFLICT (code) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_ensure_user_referral_code ON public.profiles;
CREATE TRIGGER trg_ensure_user_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_referral_code();

-- Backfill existing profiles without referral codes
DO $$
DECLARE
  r RECORD;
  v_code text;
  v_exists int;
BEGIN
  FOR r IN SELECT id, email, username FROM public.profiles WHERE referral_code IS NULL LOOP
    v_code := UPPER(COALESCE(NULLIF(REGEXP_REPLACE(r.username, '[^a-zA-Z0-9]', '', 'g'), ''), NULLIF(REGEXP_REPLACE(SPLIT_PART(r.email, '@', 1), '[^a-zA-Z0-9]', '', 'g'), ''), 'PANO' || SUBSTRING(REPLACE(r.id::text, '-', ''), 1, 4)));
    SELECT COUNT(*) INTO v_exists FROM public.referral_codes WHERE code = v_code;
    IF v_exists > 0 THEN
      v_code := v_code || FLOOR(100 + RANDOM() * 899)::text;
    END IF;

    UPDATE public.profiles SET referral_code = v_code WHERE id = r.id;
    INSERT INTO public.referral_codes (user_id, code, commission_percent, is_active)
    VALUES (r.id, v_code, 25.00, true)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
