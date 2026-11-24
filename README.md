# Indox Media — Client Financial & Receipt Portal

Full-stack Next.js (App Router) + Supabase + Gmail SMTP (`indoxmedia@gmail.com`) web application built for **Indox Media**, ready for one-click deployment on **Vercel**.

## Key Features
- **Strict `.env` Master Password Auth**: One shared company password (`APP_MASTER_PASSWORD`) stored strictly in `.env.local` / Vercel Environment Variables — never in the database or UI.
- **Per-Member Identity + Email Verification + Admin Approval**: Separate usernames/emails for Anav, Divansh, Mithilesh, etc. New members must verify their email via `indoxmedia@gmail.com` SMTP **and** be approved by an Admin before they can sign in.
- **Multi-Event Client Projects**: Add a client (e.g., Bhavna) with 1, 2, 3+ separate event dates (e.g., `19 Feb 2027` & `20 Feb 2027`) under one unified payment & receipt.
- **Auto-Generated Downloadable PDF Receipts**: Includes Indox Media logo, client & booking dates (booking confirmed date, advance received date, settlement date), advance confirmation badge, default Terms & Conditions, and **Mithilesh Shandy**'s signature (no GST field shown unless added later in Company Defaults).
- **One-Click Email Receipt**: Sends the receipt PDF directly to the client from `indoxmedia@gmail.com` with automatic CC to `indoxmedia@gmail.com`.

---

## Step-by-Step Setup Guide

### Step 1: Create Your Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new free project.
2. Open **SQL Editor** in Supabase, paste the entire contents of `supabase/schema.sql`, and click **Run**.
   - *(Tip: Before running, you can update the seeded emails for Mithilesh, Anav, and Divansh at the bottom of `supabase/schema.sql`.)*
3. Go to **Project Settings -> API** and copy:
   - `Project URL` (`NEXT_PUBLIC_SUPABASE_URL`)
   - `anon public` key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)

### Step 2: Create a Gmail App Password for `indoxmedia@gmail.com`
1. Sign in to `indoxmedia@gmail.com` and enable **2-Step Verification** in Google Account Security.
2. Visit [Google App Passwords](https://myaccount.google.com/apppasswords), create an app password named `Indox Portal`, and copy the 16-character password.

### Step 3: Configure `.env.local` (Local Testing)
```bash
cp .env.example .env.local
```
Fill in your Supabase keys, `APP_MASTER_PASSWORD`, a random `SESSION_SECRET`, and your Gmail `SMTP_PASS`.

Then run locally:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` and log in with username `mithilesh` (or `anav` / `divansh`) and your `APP_MASTER_PASSWORD`.

### Step 4: Deploy to Vercel
1. Push this folder to a private GitHub repository.
2. Import the repo in [vercel.com](https://vercel.com).
3. Add all variables from `.env.example` under **Project Settings -> Environment Variables** (set `NEXT_PUBLIC_APP_URL` to your live `https://your-site.vercel.app` domain).
4. Click **Deploy**.
5. Once live, log in as `mithilesh`, open **Company Defaults**, and upload your **Indox Media Logo** and **Mithilesh Shandy Signature PNG**!
