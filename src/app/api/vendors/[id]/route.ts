import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("vendor_bookings")
      .update({
        project_id: body.project_id || null,
        vendor_name: String(body.vendor_name).trim(),
        role_service: String(body.role_service || "Cameraman").trim(),
        phone: body.phone ? String(body.phone).trim() : null,
        agreed_amount: Number(body.agreed_amount || 0),
        due_date: body.due_date || null,
        notes: body.notes || null,
      })
      .eq("id", params.id)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ booking: data });
  } catch {
    return NextResponse.json({ error: "Failed to update vendor booking." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("vendor_bookings").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
