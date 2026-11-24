import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";
import type { CompanySettings, FinanceTransaction, Project, TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = getSession();
  if (!user) redirect("/login");

  const supabase = getSupabaseAdmin();

  const [projectsRes, settingsRes, membersRes, financeRes] = await Promise.all([
    supabase.from("projects").select("*, project_events(*)").order("created_at", { ascending: false }),
    supabase.from("company_settings").select("*").eq("id", 1).single(),
    user.role === "admin"
      ? supabase.from("team_members").select("id, full_name, username, email, role, email_verified, is_approved, created_at").order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase.from("finance_transactions").select("*").order("tx_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);

  const projects: Project[] = (projectsRes.data || []).map((p) => ({
    ...p,
    project_events: (p.project_events || []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => (a.sort_order || 0) - (b.sort_order || 0)
    ),
  }));

  const settings: CompanySettings = settingsRes.data || {
    id: 1,
    company_name: "Indocs Media",
    company_tagline: "WEDDING PHOTOGRAPHY, VIDEOGRAPHY & CREATIVE PRODUCTION",
    company_email: "indoxmedia@gmail.com",
    company_phone: "+91 9310895844 | +91 9910892766 | +91 7972929641",
    company_address: "New Delhi, India",
    default_upi: "9310895844@kotakbank",
    logo_data_url: null,
    signer_name: "Mithilesh Shende",
    signer_title: "Co-Founder, Indocs Media | +91 7972929641",
    signature_data_url: null,
    gst_number: null,
    default_terms: "• This receipt confirms full and final settlement towards the agreed package.",
  };

  return (
    <DashboardClient
      user={user}
      initialProjects={projects}
      initialSettings={settings}
      initialMembers={(membersRes.data as TeamMember[]) || []}
      initialTransactions={(financeRes.data as FinanceTransaction[]) || []}
    />
  );
}
