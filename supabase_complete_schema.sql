-- ==============================================================================
-- MERI LOCAL BAZAAR - COMPREHENSIVE SUPABASE DATABASE SCHEMA & FIX SCRIPT
-- Run this script in your Supabase Project -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Profiles Table (Users, Riders, Vendors, Admins)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT,
    full_name TEXT,
    name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    is_pro BOOLEAN DEFAULT FALSE,
    pro_status TEXT DEFAULT 'inactive',
    pro_expiry TIMESTAMPTZ,
    plan_title TEXT,
    hardware_locked BOOLEAN DEFAULT TRUE,
    
    -- Address Fields
    permanent_address TEXT,
    state TEXT DEFAULT 'Meghalaya',
    district TEXT DEFAULT 'West Garo Hills',
    block TEXT DEFAULT 'Rongram',
    village TEXT,
    city_locality TEXT,
    
    -- Delivery Partner Fields
    is_delivery_partner BOOLEAN DEFAULT FALSE,
    partner_status TEXT DEFAULT 'pending',
    vehicle_type TEXT,
    vehicle_number TEXT,
    vehicle_rc_no TEXT,
    driving_license TEXT,
    driving_license_no TEXT,
    driving_license_proof_url TEXT,
    
    -- Payout / Banking Fields
    wallet_balance NUMERIC DEFAULT 0,
    payout_upi_id TEXT,
    payout_bank_name TEXT,
    payout_account_no TEXT,
    payout_ifsc_code TEXT,
    payout_qr_image_url TEXT,
    
    -- Shop & Business Fields
    shop_name TEXT,
    shop_category TEXT,
    shop_address TEXT,
    shop_banner_url TEXT,
    shop_id_proof_type TEXT,
    shop_id_no TEXT,
    owner_name TEXT,
    owner_id_type TEXT,
    owner_id_no TEXT,
    owner_id_proof_url TEXT,
    description TEXT,
    opening_hours TEXT,
    is_approved_by_admin BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Listings Table (Marketplace Ads)
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category_name TEXT NOT NULL,
    location_name TEXT,
    state_name TEXT DEFAULT 'Meghalaya',
    district TEXT DEFAULT 'West Garo Hills',
    block TEXT,
    village TEXT,
    price NUMERIC DEFAULT 0,
    condition TEXT DEFAULT 'Used',
    description TEXT,
    phone TEXT,
    whatsapp TEXT,
    images_json TEXT,
    image_urls TEXT[],
    is_featured BOOLEAN DEFAULT FALSE,
    is_pro BOOLEAN DEFAULT FALSE,
    is_heavy_item BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'rejected', 'sold'
    seller_id UUID,
    seller_name TEXT,
    seller_verified BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Active Listings View
CREATE OR REPLACE VIEW public.active_listings AS
SELECT * FROM public.listings WHERE status = 'active';

-- 4. Service Registrations Table (Delivery Fleet, Local Services, Jobs, Shops, Taxis)
CREATE TABLE IF NOT EXISTS public.service_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT,
    full_name TEXT,
    phone TEXT,
    whatsapp TEXT,
    category TEXT,
    service_type TEXT DEFAULT 'driver', -- 'driver', 'service', 'shop'
    vehicle_type TEXT,
    vehicle_number TEXT,
    driving_license_no TEXT,
    driving_license_proof_url TEXT,
    vehicle_rc_no TEXT,
    payout_upi TEXT,
    payout_upi_id TEXT,
    experience TEXT,
    service_address TEXT,
    city_locality TEXT,
    state TEXT DEFAULT 'Meghalaya',
    district TEXT DEFAULT 'West Garo Hills',
    block TEXT DEFAULT 'Rongram',
    village TEXT,
    bio_skills TEXT,
    hourly_or_daily_rate TEXT,
    identity_proof_url TEXT,
    aadhaar_or_voter_no TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    is_approved BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payout Requests Table (Withdrawals)
CREATE TABLE IF NOT EXISTS public.payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    driver_id UUID,
    user_name TEXT,
    driver_name TEXT,
    user_phone TEXT,
    driver_phone TEXT,
    user_role TEXT DEFAULT 'delivery_partner',
    amount NUMERIC NOT NULL,
    upi_id TEXT,
    payout_upi_id TEXT,
    bank_name TEXT,
    account_no TEXT,
    ifsc_code TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
    admin_notes TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Wallets Table
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL,
    balance NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payout Logs Table
CREATE TABLE IF NOT EXISTS public.payout_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'paid',
    payout_upi TEXT,
    transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Recharge Requests Table (PRO Membership Upgrades)
CREATE TABLE IF NOT EXISTS public.recharge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    user_phone TEXT,
    plan_name TEXT,
    plan_id TEXT,
    amount NUMERIC NOT NULL,
    utr TEXT,
    transaction_id TEXT,
    payment_screenshot_url TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    is_top_pro BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Deliveries & Delivery Orders Table
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT,
    listing_id UUID,
    listing_title TEXT,
    listing_price NUMERIC,
    listing_image_url TEXT,
    buyer_id UUID,
    buyer_name TEXT,
    buyer_phone TEXT,
    buyer_address TEXT,
    seller_id UUID,
    seller_name TEXT,
    seller_phone TEXT,
    delivery_partner_id UUID,
    delivery_partner_name TEXT,
    delivery_partner_phone TEXT,
    status TEXT DEFAULT 'pending_verification', -- 'pending_verification', 'paid', 'assigned', 'picked_up', 'delivered_by_boy', 'delivered', 'rejected'
    payment_status TEXT DEFAULT 'pending_verification',
    payment_utr TEXT,
    payment_screenshot_url TEXT,
    total_amount NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    otp_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Banner Ads Table
CREATE TABLE IF NOT EXISTS public.banner_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Admin Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default Settings
INSERT INTO public.settings (key, value, description)
VALUES 
    ('upi_id', 'merilocalbazaar@oksbi', 'Admin Payment UPI ID'),
    ('admin_upi_id', 'merilocalbazaar@oksbi', 'Admin Primary Receiving UPI'),
    ('qr_code_url', 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=merilocalbazaar@oksbi', 'Default QR Code'),
    ('app_broadcast_alert', 'Welcome to Meri Local Bazaar - Verified Community Marketplace', 'Global marquee banner text')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 12. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    listing_id UUID,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. App Policies Table
CREATE TABLE IF NOT EXISTS public.app_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type TEXT UNIQUE NOT NULL,
    title TEXT,
    content TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    amount NUMERIC NOT NULL,
    type TEXT, -- 'credit', 'debit'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - OPEN FOR ANONYMOUS & AUTHENTICATED ACCESS
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recharge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Grant Full Permissions for public schema
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Public Full Access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- PLAN EXPIRY NOTIFICATIONS & PG_CRON SCHEDULE
-- ==============================================================================

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

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-plan-expiry-daily') THEN
    PERFORM cron.unschedule('check-plan-expiry-daily');
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'check-plan-expiry-daily',
  '0 0 * * *',
  $$
  INSERT INTO app_notifications (user_id, title, message, type)
  SELECT user_id, '⚠️ Plan Expire Hone Wala Hai!', 'Aapka premium plan 3 din me khatam ho jayega.', 'warning'
  FROM users_plans
  WHERE date(expiry_date) = current_date + interval '3 days';

  INSERT INTO app_notifications (user_id, title, message, type)
  SELECT user_id, '🚫 Plan Expire Ho Chuka Hai!', 'Aapka plan khatam ho gaya hai. Services continue rakhne ke liye renew karein.', 'expired'
  FROM users_plans
  WHERE date(expiry_date) = current_date;
  $$
);

