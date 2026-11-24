import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashToken } from "@/lib/auth";

export async function GET(req: Request) {
  const rawToken = new URL(req.url).searchParams.get("token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!rawToken) return NextResponse.redirect(`${appUrl}/login?verified=invalid`);
  const supabase = getSupabaseAdmin();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, verification_expires_at")
    .eq("verification_token_hash", hashToken(rawToken))
    .maybeSingle();
  if (!member) return NextResponse.redirect(`${appUrl}/login?verified=invalid`);
  if (member.verification_expires_at && new Date(member.verification_expires_at) < new Date()) {
    return NextResponse.redirect(`${appUrl}/login?verified=expired`);
  }
  await supabase.from("team_members").update({ email_verified: true, verification_token_hash: null, verification_expires_at: null }).eq("id", member.id);
  return NextResponse.redirect(`${appUrl}/login?verified=success`);
}
