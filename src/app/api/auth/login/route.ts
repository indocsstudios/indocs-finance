import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { setSessionCookie, verifyMasterPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json({ error: "Please enter your email/username and password." }, { status: 400 });
    }
    if (!verifyMasterPassword(password)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const field = identifier.includes("@") ? "email" : "username";
    const { data: user, error } = await supabase
      .from("team_members")
      .select("id, full_name, username, email, role, email_verified, is_approved")
      .eq(field, identifier)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: `Supabase Error: ${error.message}` }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ error: "Account not found. Please register first or contact Admin." }, { status: 401 });
    }
    if (!user.email_verified) {
      return NextResponse.json({ error: "Email not verified yet. Please check your inbox." }, { status: 403 });
    }
    if (!user.is_approved) {
      return NextResponse.json({ error: "Awaiting Admin approval before you can log in." }, { status: 403 });
    }

    setSessionCookie({
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
