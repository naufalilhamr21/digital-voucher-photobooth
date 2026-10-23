-- ==============================================================================
-- Alineas Studio Digital Photobooth Voucher System
-- Database Schema for Supabase PostgreSQL
-- ==============================================================================

-- 1. Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create 'events' table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    event_slug VARCHAR(100) UNIQUE NOT NULL,
    quota INTEGER NOT NULL DEFAULT 150,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    pin_code VARCHAR(10) NOT NULL DEFAULT '1234',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create 'vouchers' table
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    token VARCHAR(8) UNIQUE NOT NULL,
    is_redeemed BOOLEAN NOT NULL DEFAULT false,
    redeemed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(event_slug);
CREATE INDEX IF NOT EXISTS idx_vouchers_event_id ON public.vouchers(event_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_token ON public.vouchers(token);
CREATE INDEX IF NOT EXISTS idx_vouchers_is_redeemed ON public.vouchers(is_redeemed);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Events policies
DROP POLICY IF EXISTS "Public can view active events" ON public.events;
CREATE POLICY "Public can view active events" 
    ON public.events FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Authenticated admins can manage events" ON public.events;
CREATE POLICY "Authenticated admins can manage events" 
    ON public.events FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Vouchers policies
DROP POLICY IF EXISTS "Public can view and insert vouchers for claim" ON public.vouchers;
CREATE POLICY "Public can view and insert vouchers for claim" 
    ON public.vouchers FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Public can claim new voucher" ON public.vouchers;
CREATE POLICY "Public can claim new voucher" 
    ON public.vouchers FOR INSERT 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public or Crew can update redemption status" ON public.vouchers;
CREATE POLICY "Public or Crew can update redemption status" 
    ON public.vouchers FOR UPDATE 
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated admins have full access to vouchers" ON public.vouchers;
CREATE POLICY "Authenticated admins have full access to vouchers" 
    ON public.vouchers FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- 7. Insert Initial Demo Event (Optional sample data)
INSERT INTO public.events (
    event_name,
    event_slug,
    quota,
    start_time,
    end_time,
    duration_hours,
    is_active,
    pin_code
) VALUES (
    'The Wedding of Sarah & Dimas',
    'sarah-dimas',
    150,
    timezone('utc'::text, now() - INTERVAL '30 minutes'),
    timezone('utc'::text, now() + INTERVAL '3 hours'),
    3,
    true,
    '8821'
) ON CONFLICT (event_slug) DO NOTHING;
