import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const txType = body.tx_type === "income" || body.tx_type === "transfer" ? body.tx_type : "expense";
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("finance_transactions")
      .update({
        project_id: body.project_id || null,
        tx_type: txType,
        category: String(body.category || "General").trim(),
        title: String(body.title).trim(),
        amount: Number(body.amount),
        tx_date: body.tx_date || new Date().toISOString().slice(0, 10),
        paid_by: body.paid_by ? String(body.paid_by).trim() : session.full_name,
        transfer_to: txType === "transfer" && body.transfer_to ? String(body.transfer_to).trim() : null,
        payment_mode: body.payment_mode || "UPI",
        notes: body.notes || null,
        proof_image_url: body.proof_image_url ?? null,
      })
      .eq("id", params.id)
      .select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data });
  } catch {
    return NextResponse.json({ error: "Failed to update transaction." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
