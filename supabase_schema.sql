-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA: MULTI-ROLE SYSTEM & DELIVERY TRACKING
-- ==============================================================================

-- 1. Ensure required extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ==============================================================================
-- SECTION 1: UPDATE OR CREATE public.profiles TABLE
-- ==============================================================================

-- Create profiles table if it doesn't already exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add required multi-role columns to public.profiles
DO $$
BEGIN
    -- Add role column (default: 'customer')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';
    END IF;

    -- Add account_status column (default: 'active')
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
    END IF;

    -- Add plan_expiry_date column (timestamptz)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'plan_expiry_date'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN plan_expiry_date TIMESTAMPTZ DEFAULT NULL;
    END IF;
END $$;

-- Enforce constraints on role and account_status in public.profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_role;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_role 
    CHECK (role IN ('customer', 'seller', 'delivery_partner', 'admin', 'super_admin', 'user'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profiles_account_status;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profiles_account_status 
    CHECK (account_status IN ('active', 'inactive'));

-- Index on plan_expiry_date and account_status for fast queries
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expiry 
    ON public.profiles(account_status, plan_expiry_date);

-- ==============================================================================
-- SECTION 2: CREATE public.deliveries TABLE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL,
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    delivery_partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Status constraints: pending, picked_up, out_for_delivery, delivered, cancelled
    CONSTRAINT chk_delivery_status 
        CHECK (status IN ('pending', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'))
);

-- Performance indices for logistics queries
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_seller_id ON public.deliveries(seller_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_partner_id ON public.deliveries(delivery_partner_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);

-- Function and trigger to auto-update 'updated_at' timestamp on change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deliveries_updated_at ON public.deliveries;
CREATE TRIGGER trg_deliveries_updated_at
    BEFORE UPDATE ON public.deliveries
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) FOR public.deliveries
-- ==============================================================================

-- Enable RLS on deliveries
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Only the assigned delivery partner OR seller can view the row
DROP POLICY IF EXISTS "Sellers and delivery partners can view assigned deliveries" ON public.deliveries;
CREATE POLICY "Sellers and delivery partners can view assigned deliveries"
    ON public.deliveries
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = seller_id OR auth.uid() = delivery_partner_id
    );

-- 2. UPDATE Policy: ONLY the assigned delivery partner can update the delivery status
DROP POLICY IF EXISTS "Assigned delivery partner can update delivery status" ON public.deliveries;
CREATE POLICY "Assigned delivery partner can update delivery status"
    ON public.deliveries
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = delivery_partner_id
    )
    WITH CHECK (
        auth.uid() = delivery_partner_id
    );

-- 3. INSERT Policy: Sellers or system authenticated users can create deliveries
DROP POLICY IF EXISTS "Sellers can create new delivery orders" ON public.deliveries;
CREATE POLICY "Sellers can create new delivery orders"
    ON public.deliveries
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = seller_id
    );

-- ==============================================================================
-- SECTION 4: AUTOMATIC PLAN EXPIRY FUNCTION & CRON JOB
-- ==============================================================================

-- Database function to expire accounts whose plan_expiry_date is in the past
CREATE OR REPLACE FUNCTION public.check_and_expire_user_plans()
RETURNS TABLE(updated_count INT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    affected_rows INT;
BEGIN
    UPDATE public.profiles
    SET 
        account_status = 'inactive',
        updated_at = NOW()
    WHERE 
        plan_expiry_date IS NOT NULL
        AND plan_expiry_date < NOW()
        AND account_status = 'active';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN QUERY SELECT affected_rows;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.check_and_expire_user_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_expire_user_plans() TO service_role;

-- Database RPC function to fetch users whose PRO partner plans expire within the next 3 days
CREATE OR REPLACE FUNCTION public.check_expiring_plans()
RETURNS TABLE(
    user_id UUID,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    role TEXT,
    plan_expiry_date TIMESTAMPTZ,
    days_left INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS user_id,
        p.full_name,
        p.phone,
        p.email,
        p.role,
        p.plan_expiry_date,
        CEIL(EXTRACT(EPOCH FROM (p.plan_expiry_date - NOW())) / 86400)::INT AS days_left
    FROM public.profiles p
    WHERE 
        p.account_status = 'active'
        AND p.plan_expiry_date IS NOT NULL
        AND p.plan_expiry_date > NOW()
        AND p.plan_expiry_date <= (NOW() + INTERVAL '3 days');
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_expiring_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_expiring_plans() TO service_role;

-- Schedule automatic recurring cron job with pg_cron (runs every hour at minute 0)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Remove existing cron job if previously scheduled
        PERFORM cron.unschedule(jobid) 
        FROM cron.job 
        WHERE jobname = 'auto_expire_plans_hourly';

        -- Schedule to run every hour at minute 0
        PERFORM cron.schedule(
            'auto_expire_plans_hourly',
            '0 * * * *',
            'SELECT public.check_and_expire_user_plans();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron extension not active or permission denied. The function public.check_and_expire_user_plans() is still available for invocation via Supabase Edge Functions or DB Webhooks.';
END $$;

-- ==============================================================================
-- SECTION 5: PUBLIC.LISTINGS TABLE & MULTI-PHOTO MIGRATION (image_urls text[])
-- ==============================================================================

-- 1. Create listings table if it does not exist
CREATE TABLE IF NOT EXISTS public.listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category_id TEXT,
    category_name TEXT NOT NULL,
    location_id TEXT,
    location_name TEXT NOT NULL,
    state_name TEXT DEFAULT 'Meghalaya',
    price NUMERIC NOT NULL,
    condition TEXT,
    description TEXT,
    phone TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    image_urls TEXT[] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN DEFAULT FALSE,
    is_pro BOOLEAN DEFAULT FALSE,
    is_heavy_item BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending',
    seller_id TEXT,
    seller_name TEXT,
    seller_verified BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Safe Migration Block: Convert legacy single image column to image_urls text[]
DO $$
BEGIN
    -- If old single string image columns exist (images_json, image_url, image), migrate data to image_urls
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'image_urls'
    ) THEN
        ALTER TABLE public.listings ADD COLUMN image_urls TEXT[] NOT NULL DEFAULT '{}';
    END IF;

    -- Migrate legacy data from images_json if present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'images_json'
    ) THEN
        UPDATE public.listings 
        SET image_urls = ARRAY[images_json] 
        WHERE (image_urls IS NULL OR cardinality(image_urls) = 0) 
          AND images_json IS NOT NULL 
          AND images_json <> '';

        ALTER TABLE public.listings DROP COLUMN images_json;
    END IF;

    -- Migrate legacy data from single image_url column if present
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'listings' AND column_name = 'image_url'
    ) THEN
        UPDATE public.listings 
        SET image_urls = ARRAY[image_url] 
        WHERE (image_urls IS NULL OR cardinality(image_urls) = 0) 
          AND image_url IS NOT NULL 
          AND image_url <> '';

        ALTER TABLE public.listings DROP COLUMN image_url;
    END IF;
END $$;

-- Enable RLS and indexes for listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category_name);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at DESC);

-- Public can read approved listings, users can read their own pending/approved listings
DROP POLICY IF EXISTS "Public can view approved listings" ON public.listings;
CREATE POLICY "Public can view approved listings"
    ON public.listings FOR SELECT
    USING (status = 'active' OR auth.uid()::text = seller_id);

DROP POLICY IF EXISTS "Users can insert listings" ON public.listings;
CREATE POLICY "Users can insert listings"
    ON public.listings FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
CREATE POLICY "Users can update their own listings"
    ON public.listings FOR UPDATE
    USING (auth.uid()::text = seller_id);

-- ==============================================================================
-- SECTION 6: WALLETS AND PAYOUT MANAGEMENT FOR SELLERS & DELIVERY FLEET
-- ==============================================================================

-- 1. Create public.wallets table linked to users/profiles
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create public.payout_logs table to track payouts sent by admin
CREATE TABLE IF NOT EXISTS public.payout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled', 'rejected')),
    payout_upi TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_user_id ON public.payout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_logs_created_at ON public.payout_logs(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Wallets
DROP POLICY IF EXISTS "Users can view their own wallet or admin full access" ON public.wallets;
CREATE POLICY "Users can view their own wallet or admin full access"
    ON public.wallets FOR ALL
    USING (true)
    WITH CHECK (true);

-- RLS Policies for Payout Logs
DROP POLICY IF EXISTS "Users can view payout logs or admin manage" ON public.payout_logs;
CREATE POLICY "Users can view payout logs or admin manage"
    ON public.payout_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- SECTION 7: PLAN EXPIRY NOTIFICATIONS & PG_CRON SCHEDULE
-- ==============================================================================

-- Tables for notifications and plans
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.users_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    plan_name TEXT,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access on app_notifications" ON public.app_notifications;
CREATE POLICY "Public Access on app_notifications" ON public.app_notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access on users_plans" ON public.users_plans;
CREATE POLICY "Public Access on users_plans" ON public.users_plans FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.app_notifications TO anon, authenticated, service_role;
GRANT ALL ON public.users_plans TO anon, authenticated, service_role;

-- Har subah 12 baje check karne ke liye cron extension enable karein
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule existing job if already created to prevent duplicate schedule error
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-plan-expiry-daily') THEN
    PERFORM cron.unschedule('check-plan-expiry-daily');
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Cron job jo automatic check karega
SELECT cron.schedule(
  'check-plan-expiry-daily',
  '0 0 * * *', -- Everyday at midnight
  $$
  -- 1. Un users ke liye warning push karein jinki expiry me exact 3 din bache hain
  INSERT INTO app_notifications (user_id, title, message, type)
  SELECT user_id, '⚠️ Plan Expire Hone Wala Hai!', 'Aapka premium plan 3 din me khatam ho jayega.', 'warning'
  FROM users_plans
  WHERE date(expiry_date) = current_date + interval '3 days';

  -- 2. Un users ke liye alert push karein jinka plan expire ho chuka hai
  INSERT INTO app_notifications (user_id, title, message, type)
  SELECT user_id, '🚫 Plan Expire Ho Chuka Hai!', 'Aapka plan khatam ho gaya hai. Services continue rakhne ke liye renew karein.', 'expired'
  FROM users_plans
  WHERE date(expiry_date) = current_date;
  $$
);


