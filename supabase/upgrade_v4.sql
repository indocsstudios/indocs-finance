-- ============================================================
-- INDOCS MEDIA PORTAL v4 UPGRADE SCRIPT
-- Safe to run on your EXISTING Supabase database!
-- Adds: Crew / Cameraman / Vendor Bookings & Payables Tracker
--       + Cleans up duplicate Mithilesh / Devansh names.
-- ============================================================

-- 1. Create Crew / Vendor Bookings table (e.g. Cameraman total 25,000, paid 1,000, balance 24,000)
CREATE TABLE IF NOT EXISTS public.vendor_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  vendor_name TEXT NOT NULL,
  role_service TEXT NOT NULL DEFAULT 'Cameraman',
  phone TEXT,
  agreed_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Link finance_transactions to vendor_bookings so every payout updates paid/balance automatically
ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS vendor_booking_id UUID REFERENCES public.vendor_bookings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendor_bookings_project ON public.vendor_bookings(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_vendor ON public.finance_transactions(vendor_booking_id);

ALTER TABLE public.vendor_bookings ENABLE ROW LEVEL SECURITY;

-- 3. Unify team member names so duplicate cards never appear
UPDATE public.team_members SET full_name = 'Mithilesh Shende' WHERE username = 'mithilesh';
UPDATE public.team_members SET full_name = 'Devansh Rajput' WHERE username IN ('divansh', 'devansh');

-- Sync any old project/finance records using old spellings
UPDATE public.projects SET advance_received_by = 'Mithilesh Shende' WHERE advance_received_by = 'Mithilesh Shandy';
UPDATE public.projects SET final_payment_received_by = 'Mithilesh Shende' WHERE final_payment_received_by = 'Mithilesh Shandy';
UPDATE public.projects SET advance_received_by = 'Devansh Rajput' WHERE advance_received_by IN ('Devansh', 'Divansh');
UPDATE public.projects SET final_payment_received_by = 'Devansh Rajput' WHERE final_payment_received_by IN ('Devansh', 'Divansh');
UPDATE public.finance_transactions SET paid_by = 'Mithilesh Shende' WHERE paid_by = 'Mithilesh Shandy';
UPDATE public.finance_transactions SET transfer_to = 'Mithilesh Shende' WHERE transfer_to = 'Mithilesh Shandy';
UPDATE public.finance_transactions SET paid_by = 'Devansh Rajput' WHERE paid_by IN ('Devansh', 'Divansh');
UPDATE public.finance_transactions SET transfer_to = 'Devansh Rajput' WHERE transfer_to IN ('Devansh', 'Divansh');

-- 4. Permissions safety
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
