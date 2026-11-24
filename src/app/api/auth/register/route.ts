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
      return NextResponse.json({ error: "Full name, valid username, and email are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const [{ data: existingEmail }, { data: existingUser }] = await Promise.all([
      supabase.from("team_members").select("id").eq("email", email).maybeSingle(),
      supabase.from("team_members").select("id").eq("username", username).maybeSingle(),
    ]);
    if (existingEmail || existingUser) {
      return NextResponse.json({ error: "Email or username already exists." }, { status: 409 });
    }

    const { raw, hash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    const { error: insertError } = await supabase.from("team_members").insert({
      full_name: fullName,
      username,
      email,
      role: "member",
      email_verified: false,
      is_approved: false,
      verification_token_hash: hash,
      verification_expires_at: expiresAt,
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/api/auth/verify?token=${raw}`;

    await sendMail({
      to: email,
      subject: "Verify your email — Indocs Media Admin Portal",
      html: `<p>Hi <strong>${fullName}</strong>,</p><p>Click to verify your email:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    return NextResponse.json({
      message: "Registration received! Verify your email, then wait for Admin approval.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Registration failed. Check SMTP settings." }, { status: 500 });
  }
}
