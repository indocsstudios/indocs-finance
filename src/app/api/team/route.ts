import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .select("id, full_name, username, email, role, email_verified, is_approved, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [] });
}

export async function PATCH(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Member ID required." }, { status: 400 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_approved === "boolean") updates.is_approved = body.is_approved;
  if (typeof body.email_verified === "boolean") updates.email_verified = body.email_verified;
  if (body.role === "admin" || body.role === "member") updates.role = body.role;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .update(updates)
    .eq("id", body.id)
    .select("id, full_name, username, email, role, email_verified, is_approved, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ member: data });
}
