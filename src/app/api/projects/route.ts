import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

async function generateReceiptNumber(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const year = new Date().getFullYear();
  const prefix = `INDC-${year}-`;
  const { data } = await supabase
    .from("projects").select("receipt_number").like("receipt_number", `${prefix}%`)
    .order("receipt_number", { ascending: false }).limit(1);
  let nextNum = 1;
  if (data && data.length > 0) {
    const parsed = parseInt(data[0].receipt_number.split("-").pop() || "0", 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.client_name || !body.project_title) {
      return NextResponse.json({ error: "Client name and project title are required." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: settings } = await supabase.from("company_settings").select("default_terms, default_upi").eq("id", 1).maybeSingle();
    const receiptNumber = await generateReceiptNumber();

    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        receipt_number: receiptNumber,
        receipt_type: body.receipt_type || "Quotation",
        category: body.category || "Wedding Photography & Film",
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
        advance_received_by: body.advance_received_by || session.full_name,
        final_payment_amount: Number(body.final_payment_amount || 0),
        final_payment_date: body.final_payment_date || null,
        final_payment_received_by: body.final_payment_received_by || session.full_name,
        booking_confirmed_date: body.booking_confirmed_date || null,
        settlement_date: body.settlement_date || null,
        payment_mode: body.payment_mode || "UPI",
        payment_account: body.payment_account || settings?.default_upi || "9310895844@kotakbank",
        terms_and_conditions: body.terms_and_conditions || settings?.default_terms || null,
        created_by: session.id,
      })
      .select("*").single();

    if (pErr || !project) return NextResponse.json({ error: pErr?.message || "Failed to save" }, { status: 500 });

    const validEvents = (Array.isArray(body.events) ? body.events : [])
      .filter((e: { event_name?: string; event_date?: string }) => e.event_name && e.event_date)
      .map((e: { event_name: string; event_date: string; day_label?: string; venue?: string; deliverables?: string }, idx: number) => ({
        project_id: project.id,
        event_name: e.event_name.trim(),
        event_date: e.event_date,
        day_label: e.day_label ? e.day_label.trim() : null,
        venue: e.venue ? e.venue.trim() : null,
        deliverables: e.deliverables ? e.deliverables.trim() : null,
        sort_order: idx,
      }));
    if (validEvents.length > 0) await supabase.from("project_events").insert(validEvents);

    const { data: fullProject } = await supabase.from("projects").select("*, project_events(*)").eq("id", project.id).single();
    return NextResponse.json({ project: fullProject }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
