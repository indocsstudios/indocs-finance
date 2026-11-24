import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const { error: updErr } = await supabase
      .from("projects")
      .update({
        receipt_type: body.receipt_type || "Final Payment Receipt",
        client_name: String(body.client_name).trim(),
        client_email: body.client_email ? String(body.client_email).trim() : null,
        client_phone: body.client_phone ? String(body.client_phone).trim() : null,
        project_title: String(body.project_title).trim(),
        purpose: body.purpose ? String(body.purpose).trim() : body.project_title,
        original_amount: body.original_amount ? Number(body.original_amount) : null,
        discount_amount: Number(body.discount_amount || 0),
        total_amount: Number(body.total_amount || 0),
        advance_amount: Number(body.advance_amount || 0),
        advance_confirmed: Boolean(body.advance_confirmed),
        advance_received_date: body.advance_received_date || null,
        final_payment_amount: Number(body.final_payment_amount || 0),
        final_payment_date: body.final_payment_date || null,
        booking_confirmed_date: body.booking_confirmed_date || null,
        settlement_date: body.settlement_date || null,
        payment_mode: body.payment_mode || "UPI",
        payment_account: body.payment_account || null,
        notes: body.notes || null,
        terms_and_conditions: body.terms_and_conditions || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    if (Array.isArray(body.events)) {
      await supabase.from("project_events").delete().eq("project_id", params.id);
      const validEvents = body.events
        .filter((e: { event_name?: string; event_date?: string }) => e.event_name && e.event_date)
        .map((e: { event_name: string; event_date: string; day_label?: string; venue?: string; deliverables?: string; event_budget?: number | string }, idx: number) => ({
          project_id: params.id,
          event_name: e.event_name.trim(),
          event_date: e.event_date,
          day_label: e.day_label ? e.day_label.trim() : null,
          venue: e.venue ? e.venue.trim() : null,
          deliverables: e.deliverables ? e.deliverables.trim() : null,
          event_budget: e.event_budget !== undefined && e.event_budget !== "" && e.event_budget !== null ? Number(e.event_budget) : null,
          sort_order: idx,
        }));
      if (validEvents.length > 0) {
        await supabase.from("project_events").insert(validEvents);
      }
    }

    const { data: fullProject } = await supabase
      .from("projects")
      .select("*, project_events(*)")
      .eq("id", params.id)
      .single();

    return NextResponse.json({ project: fullProject });
  } catch {
    return NextResponse.json({ error: "Failed to update project." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("projects").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
