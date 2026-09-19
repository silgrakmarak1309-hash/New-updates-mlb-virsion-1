-- ==============================================================================
-- SUPABASE CRON: DAILY PLAN EXPIRY CHECK & NOTIFICATIONS
-- ==============================================================================

-- 1. Ensure required tables exist
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

-- Enable RLS and grant permissions
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access on app_notifications" ON public.app_notifications;
CREATE POLICY "Public Access on app_notifications" ON public.app_notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access on users_plans" ON public.users_plans;
CREATE POLICY "Public Access on users_plans" ON public.users_plans FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.app_notifications TO anon, authenticated, service_role;
GRANT ALL ON public.users_plans TO anon, authenticated, service_role;

-- 2. Har subah 12 baje check karne ke liye cron extension enable karein
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

-- 3. Cron job jo automatic check karega
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
