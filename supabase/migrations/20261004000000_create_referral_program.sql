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

-- NOTE: Referral codes are strictly private and assigned manually by the admin from the Admin Panel.
-- No auto-generation trigger or global backfill is applied.

NOTIFY pgrst, 'reload schema';
