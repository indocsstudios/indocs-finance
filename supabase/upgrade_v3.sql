-- ============================================================
-- INDOCS MEDIA PORTAL v3 UPGRADE SCRIPT
-- Safe to run on your EXISTING Supabase database!
-- Adds: Project Category, 3-Stage Documents, Who Received Cash,
--       Team Handover Transfers, and Official Logo URL Default.
-- ============================================================

-- 1. Set official Indocs Media logo & defaults
UPDATE public.company_settings
SET
  company_name = 'Indocs Media',
  logo_data_url = COALESCE(NULLIF(logo_data_url, ''), 'https://indocsmedia.vercel.app/assets/logo.png'),
  company_tagline = COALESCE(NULLIF(company_tagline, ''), 'AD SHOOTS, WEDDINGS, VIDEO DIRECTION & CREATIVE PRODUCTION'),
  company_phone = '+91 9310895844 | +91 9910892766 | +91 7972929641',
  default_upi = COALESCE(NULLIF(default_upi, ''), '9310895844@kotakbank'),
  signer_name = 'Mithilesh Shende',
  signer_title = 'Co-Founder, Indocs Media | +91 7972929641'
WHERE id = 1;

-- 2. Add Project Category + Who Received Advance / Final Payment
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Wedding Photography & Film',
  ADD COLUMN IF NOT EXISTS advance_received_by TEXT DEFAULT 'Mithilesh Shende',
  ADD COLUMN IF NOT EXISTS final_payment_received_by TEXT DEFAULT 'Mithilesh Shende';

-- 3. Upgrade finance_transactions to support Team Transfers (handover between Mithilesh/Devansh/Anav)
ALTER TABLE public.finance_transactions
  DROP CONSTRAINT IF EXISTS finance_transactions_tx_type_check;

ALTER TABLE public.finance_transactions
  ADD CONSTRAINT finance_transactions_tx_type_check CHECK (tx_type IN ('expense', 'income', 'transfer'));

ALTER TABLE public.finance_transactions
  ADD COLUMN IF NOT EXISTS transfer_to TEXT;

-- 4. Permissions safety
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
