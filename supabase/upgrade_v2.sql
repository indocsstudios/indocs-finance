-- ============================================================
-- INDOCS MEDIA PORTAL v2 UPGRADE SCRIPT
-- Safe to run on your EXISTING Supabase database!
-- Adds detailed receipt fields + Internal Finance & Expense Ledger
-- ============================================================

-- 1. Upgrade company_settings with Indocs Media defaults
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS company_tagline TEXT DEFAULT 'WEDDING PHOTOGRAPHY, VIDEOGRAPHY & CREATIVE PRODUCTION',
  ADD COLUMN IF NOT EXISTS default_upi TEXT DEFAULT '9310895844@kotakbank';

UPDATE public.company_settings
SET
  company_name = 'Indocs Media',
  company_tagline = COALESCE(NULLIF(company_tagline, ''), 'WEDDING PHOTOGRAPHY, VIDEOGRAPHY & CREATIVE PRODUCTION'),
  company_phone = '+91 9310895844 | +91 9910892766 | +91 7972929641',
  default_upi = COALESCE(NULLIF(default_upi, ''), '9310895844@kotakbank'),
  signer_name = 'Mithilesh Shende',
  signer_title = 'Co-Founder, Indocs Media | +91 7972929641',
  default_terms = E'• This receipt confirms the payment recorded above towards the agreed photography & videography package.\n• With 100% payment cleared, post-production editing and release of all final deliverables is authorized.\n• Package includes up to 2 rounds of minor revisions on edited videos; major re-edits, full song replacements, or extra deliverables beyond the agreed scope are billed separately.\n• Raw/unedited files (if requested) can be shared on a client-provided hard drive. Indocs Media retains project backup data for 30 days after final delivery.'
WHERE id = 1;

-- 2. Upgrade projects table for detailed Indocs Media receipts
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS receipt_type TEXT DEFAULT 'Final Payment Receipt',
  ADD COLUMN IF NOT EXISTS purpose TEXT DEFAULT 'Wedding Shoot Booking & Settlement',
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_payment_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_payment_date DATE,
  ADD COLUMN IF NOT EXISTS payment_account TEXT DEFAULT '9310895844@kotakbank';

-- 3. Upgrade project_events for Day Label & Covered Services/Deliverables
ALTER TABLE public.project_events
  ADD COLUMN IF NOT EXISTS day_label TEXT,
  ADD COLUMN IF NOT EXISTS deliverables TEXT;

-- 4. Create Internal Finance & Expense Ledger table (with Photo Proofs)
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  tx_type TEXT NOT NULL CHECK (tx_type IN ('expense', 'income')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tx_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_by TEXT,
  payment_mode TEXT DEFAULT 'UPI',
  notes TEXT,
  proof_image_url TEXT,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_tx_project ON public.finance_transactions(project_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_date ON public.finance_transactions(tx_date DESC);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- 5. Ensure service_role has full access to all tables
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
