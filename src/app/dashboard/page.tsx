import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";
import type { CompanySettings, Project, TeamMember } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = getSession();
  if (!user) {
    redirect("/login");
  }

  const supabase = getSupabaseAdmin();

  const [projectsRes, settingsRes, membersRes] = await Promise.all([
    supabase
      .from("projects")
      .select("*, project_events(*)")
      .order("created_at", { ascending: false }),
    supabase.from("company_settings").select("*").eq("id", 1).single(),
    user.role === "admin"
      ? supabase
          .from("team_members")
          .select("id, full_name, username, email, role, email_verified, is_approved, created_at")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const projects: Project[] = (projectsRes.data || []).map((p) => ({
    ...p,
    project_events: (p.project_events || []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => (a.sort_order || 0) - (b.sort_order || 0)
    ),
  }));

  const settings: CompanySettings = settingsRes.data || {
    id: 1,
    company_name: "Indox Media",
    company_email: "indoxmedia@gmail.com",
    company_phone: "+91 XXXXX XXXXX",
    company_address: "Delhi, India",
    logo_data_url: null,
    signer_name: "Mithilesh Shandy",
    signer_title: "Authorized Signatory, Indox Media",
    signature_data_url: null,
    gst_number: null,
    default_terms:
      "1. Booking is confirmed only after receipt of the agreed advance payment.\n2. Remaining balance must be settled on or before the settlement date.",
  };

  const members: TeamMember[] = (membersRes.data as TeamMember[]) || [];

  return (
    <DashboardClient
      user={user}
      initialProjects={projects}
      initialSettings={settings}
      initialMembers={members}
    />
  );
}
