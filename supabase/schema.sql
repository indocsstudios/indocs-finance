-- ============================================================
-- INDOX MEDIA CLIENT & RECEIPT PORTAL - SUPABASE SQL SCHEMA
-- Run this entire script once in Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TEAM MEMBERS (Authentication, Email Verification & Admin Approval)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token_hash TEXT,
  verification_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. COMPANY SETTINGS (Single Row: Default Indox Media Info, Signature, Terms)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Indox Media',
  company_email TEXT NOT NULL DEFAULT 'indoxmedia@gmail.com',
  company_phone TEXT NOT NULL DEFAULT '+91 XXXXX XXXXX',
  company_address TEXT NOT NULL DEFAULT 'Delhi, India',
  logo_data_url TEXT,
  signer_name TEXT NOT NULL DEFAULT 'Mithilesh Shandy',
  signer_title TEXT NOT NULL DEFAULT 'Authorized Signatory, Indox Media',
  signature_data_url TEXT,
  gst_number TEXT,
  default_terms TEXT NOT NULL DEFAULT E'1. Booking is confirmed only after receipt of the agreed advance payment.\n2. The remaining balance must be settled on or before the stated settlement date.\n3. Advance payments are non-refundable in case of cancellation by the client; date rescheduling is subject to team availability.\n4. Final edited deliverables will be shared within the mutually agreed timeline after full settlement.\n5. Travel, accommodation, or additional shoot hours outside the listed event schedule will be billed separately.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.company_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 3. CLIENT PROJECTS & FINANCIAL RECEIPTS
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  project_title TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  advance_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  advance_received_date DATE,
  booking_confirmed_date DATE,
  settlement_date DATE,
  payment_mode TEXT DEFAULT 'UPI / Bank Transfer',
  notes TEXT,
  terms_and_conditions TEXT,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. MULTI-EVENT SCHEDULE PER PROJECT (1, 2, 3+ events under one invoice)
CREATE TABLE IF NOT EXISTS public.project_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  venue TEXT,
  event_budget NUMERIC(12, 2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_events_project_id ON public.project_events(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Enable Row Level Security (Server API uses Service Role key, blocking direct anon reads)
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SEED INITIAL ADMIN ACCOUNTS (Pre-verified & Pre-approved)
-- Edit emails below before running if needed!
-- ============================================================
INSERT INTO public.team_members (full_name, username, email, role, email_verified, is_approved)
VALUES
  ('Mithilesh Shandy', 'mithilesh', 'indoxmedia@gmail.com', 'admin', TRUE, TRUE),
  ('Anav', 'anav', 'anav@indoxmedia.com', 'member', TRUE, TRUE),
  ('Divansh', 'divansh', 'divansh@indoxmedia.com', 'member', TRUE, TRUE)
ON CONFLICT (username) DO NOTHING;
