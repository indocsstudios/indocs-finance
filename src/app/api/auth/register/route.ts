import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { generateVerificationToken } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const username = String(body.username || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const email = String(body.email || "").trim().toLowerCase();
    if (!fullName || !username || !email || !email.includes("@")) {
      return NextResponse.json({ error: "Full name, username, and valid email required." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const [{ data: e1 }, { data: e2 }] = await Promise.all([
      supabase.from("team_members").select("id").eq("email", email).maybeSingle(),
      supabase.from("team_members").select("id").eq("username", username).maybeSingle(),
    ]);
    if (e1 || e2) return NextResponse.json({ error: "Email or username already exists." }, { status: 409 });

    const { raw, hash } = generateVerificationToken();
    const { error } = await supabase.from("team_members").insert({
      full_name: fullName, username, email, role: "member", email_verified: false, is_approved: false,
      verification_token_hash: hash, verification_expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/verify?token=${raw}`;
    await sendMail({
      to: email,
      subject: "Verify your email — Indocs Media Portal",
      html: `<p>Shri Harivansh <strong>${fullName}</strong>,</p><p>Click to verify your email: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });
    return NextResponse.json({ message: "Verification email sent! Verify your email, then wait for Admin approval." });
  } catch {
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
