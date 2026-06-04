-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  email text NOT NULL,
  discount_percent integer NOT NULL DEFAULT 0,
  plan text, -- 'basic' | 'pro' | 'agency' or null for any plan
  is_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  used_at timestamptz
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policy: Admin full access
CREATE POLICY "Admin full access" ON public.coupons FOR ALL USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

-- Policy: Users view their own coupons
CREATE POLICY "Users view own coupons" ON public.coupons FOR SELECT USING (
  email = (SELECT email FROM public.profiles WHERE id = auth.uid())
);

-- Admin policies on public.tours, public.photos, public.clients, public.subscriptions, public.profiles
DROP POLICY IF EXISTS "Admin select tours" ON public.tours;
CREATE POLICY "Admin select tours" ON public.tours FOR SELECT USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin select photos" ON public.photos;
CREATE POLICY "Admin select photos" ON public.photos FOR SELECT USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin select clients" ON public.clients;
CREATE POLICY "Admin select clients" ON public.clients FOR SELECT USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin select subscriptions" ON public.subscriptions;
CREATE POLICY "Admin select subscriptions" ON public.subscriptions FOR SELECT USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;
CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE USING (
  auth.jwt() ->> 'email' = 'er.prashantyadav37@gmail.com' OR 
  auth.jwt() ->> 'email' = 'vista360gtp@gmail.com'
);

-- Grant privileges
GRANT ALL ON TABLE public.coupons TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coupons TO authenticated;
GRANT SELECT ON TABLE public.coupons TO anon;

-- Notify postgrest to reload schema cache
NOTIFY pgrst, 'reload schema';
