import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("finance_transactions")
    .select("*")
    .order("tx_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ transactions: data || [] });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.title || !body.amount || !body.tx_type) {
      return NextResponse.json({ error: "Title, type, and amount are required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("finance_transactions")
      .insert({
        project_id: body.project_id || null,
        tx_type: body.tx_type === "income" ? "income" : "expense",
        category: String(body.category || "General").trim(),
        title: String(body.title).trim(),
        amount: Number(body.amount),
        tx_date: body.tx_date || new Date().toISOString().slice(0, 10),
        paid_by: body.paid_by ? String(body.paid_by).trim() : session.full_name,
        payment_mode: body.payment_mode || "UPI",
        notes: body.notes || null,
        proof_image_url: body.proof_image_url || null,
        created_by: session.id,
      })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ transaction: data }, { status: 201 });
  } catch (err) {
    console.error("Finance POST error:", err);
    return NextResponse.json({ error: "Failed to save transaction." }, { status: 500 });
  }
}
