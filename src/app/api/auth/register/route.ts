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
      return NextResponse.json(
        { error: "Full name, valid username, and email address are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const [{ data: existingEmail }, { data: existingUser }] = await Promise.all([
      supabase.from("team_members").select("id").eq("email", email).maybeSingle(),
      supabase.from("team_members").select("id").eq("username", username).maybeSingle(),
    ]);
    const existing = existingEmail || existingUser;

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email or username already exists." },
        { status: 409 }
      );
    }

    const { raw, hash } = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24 hours

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

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyUrl = `${appUrl}/api/auth/verify?token=${raw}`;

    // Send verification email via indoxmedia@gmail.com SMTP
    await sendMail({
      to: email,
      subject: "Verify your email — Indox Media Admin Portal",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="margin-top:0; color:#18181b;">Indox Media Portal</h2>
          <p>Hi <strong>${fullName}</strong>,</p>
          <p>Click the button below to verify your email address. Once verified, an Indox Media Admin will approve your access.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="background:#4338ca; color:#ffffff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:600;">
              Verify Email Address
            </a>
          </p>
          <p style="font-size:12px; color:#64748b;">Or paste this link in your browser:<br/>${verifyUrl}</p>
        </div>
      `,
    });

    // Notify Indox Media Admin
    if (process.env.SMTP_USER) {
      await sendMail({
        to: process.env.SMTP_USER,
        subject: `New Access Request: ${fullName} (${username})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 16px;">
            <h3>New Indox Media Portal Access Request</h3>
            <p><strong>Name:</strong> ${fullName}<br/>
            <strong>Username:</strong> ${username}<br/>
            <strong>Email:</strong> ${email}</p>
            <p>Log in to the Admin Panel -> Team &amp; Access tab to approve once they verify their email.</p>
          </div>
        `,
      }).catch(() => {});
    }

    return NextResponse.json({
      message: "Registration received! Please check your email to verify, then wait for Admin approval.",
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Could not complete registration. Please check SMTP and Supabase configuration." },
      { status: 500 }
    );
  }
}
