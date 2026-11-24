import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

async function generateReceiptNumber(): Promise<string> {
  const supabase = getSupabaseAdmin();
  const year = new Date().getFullYear();
  const prefix = `INDX-${year}-`;

  const { data } = await supabase
    .from("projects")
    .select("receipt_number")
    .like("receipt_number", `${prefix}%`)
    .order("receipt_number", { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (data && data.length > 0) {
    const last = data[0].receipt_number.split("-").pop();
    const parsed = parseInt(last || "0", 10);
    if (!isNaN(parsed)) nextNum = parsed + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("projects")
    .select("*, project_events(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sorted = (data || []).map((p) => ({
    ...p,
    project_events: (p.project_events || []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => (a.sort_order || 0) - (b.sort_order || 0)
    ),
  }));

  return NextResponse.json({ projects: sorted });
}

export async function POST(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.client_name || !body.project_title) {
      return NextResponse.json(
        { error: "Client name and project title are required." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: settings } = await supabase
      .from("company_settings")
      .select("default_terms")
      .eq("id", 1)
      .maybeSingle();

    const receiptNumber = await generateReceiptNumber();

    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .insert({
        receipt_number: receiptNumber,
        client_name: String(body.client_name).trim(),
        client_email: body.client_email ? String(body.client_email).trim() : null,
        client_phone: body.client_phone ? String(body.client_phone).trim() : null,
        project_title: String(body.project_title).trim(),
        total_amount: Number(body.total_amount || 0),
        advance_amount: Number(body.advance_amount || 0),
        advance_confirmed: Boolean(body.advance_confirmed),
        advance_received_date: body.advance_received_date || null,
        booking_confirmed_date: body.booking_confirmed_date || null,
        settlement_date: body.settlement_date || null,
        payment_mode: body.payment_mode || "UPI / Bank Transfer",
        notes: body.notes || null,
        terms_and_conditions: body.terms_and_conditions || settings?.default_terms || null,
        created_by: session.id,
      })
      .select("*")
      .single();

    if (projectErr || !project) {
      return NextResponse.json({ error: projectErr?.message || "Failed to save project" }, { status: 500 });
    }

    const events = Array.isArray(body.events) ? body.events : [];
    const validEvents = events
      .filter((e: { event_name?: string; event_date?: string }) => e.event_name && e.event_date)
      .map((e: { event_name: string; event_date: string; venue?: string; event_budget?: number | string }, idx: number) => ({
        project_id: project.id,
        event_name: e.event_name.trim(),
        event_date: e.event_date,
        venue: e.venue ? e.venue.trim() : null,
        event_budget: e.event_budget !== undefined && e.event_budget !== "" && e.event_budget !== null
          ? Number(e.event_budget)
          : null,
        sort_order: idx,
      }));

    if (validEvents.length > 0) {
      const { error: evErr } = await supabase.from("project_events").insert(validEvents);
      if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });
    }

    const { data: fullProject } = await supabase
      .from("projects")
      .select("*, project_events(*)")
      .eq("id", project.id)
      .single();

    return NextResponse.json({ project: fullProject }, { status: 201 });
  } catch (err) {
    console.error("Create project error:", err);
    return NextResponse.json({ error: "Failed to create project." }, { status: 500 });
  }
}
