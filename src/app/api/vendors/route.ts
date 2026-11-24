import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.vendor_name || !body.agreed_amount) {
      return NextResponse.json({ error: "Vendor/Cameraman name and total agreed amount are required." }, { status: 400 });
    }
    const supabase = getSupabaseAdmin();
    const { data: booking, error } = await supabase
      .from("vendor_bookings")
      .insert({
        project_id: body.project_id || null,
        vendor_name: String(body.vendor_name).trim(),
        role_service: String(body.role_service || "Cameraman").trim(),
        phone: body.phone ? String(body.phone).trim() : null,
        agreed_amount: Number(body.agreed_amount),
        due_date: body.due_date || null,
        notes: body.notes || null,
        created_by: session.id,
      })
      .select("*").single();

    if (error || !booking) return NextResponse.json({ error: error?.message || "Failed to save booking" }, { status: 500 });

    // If an initial advance (e.g. Rs. 1,000) was paid now, automatically log it in finance_transactions!
    let createdTx = null;
    const initialPaid = Number(body.initial_paid || 0);
    if (initialPaid > 0) {
      const { data: tx } = await supabase
        .from("finance_transactions")
        .insert({
          project_id: body.project_id || null,
          vendor_booking_id: booking.id,
          tx_type: "expense",
          category: body.role_service || "Crew / Freelancer Payout",
          title: `${booking.vendor_name} (${booking.role_service}) — Booking Advance`,
          amount: initialPaid,
          tx_date: body.tx_date || new Date().toISOString().slice(0, 10),
          paid_by: body.paid_by || session.full_name,
          payment_mode: body.payment_mode || "UPI",
          notes: body.notes || null,
          proof_image_url: body.proof_image_url || null,
          created_by: session.id,
        })
        .select("*").single();
      createdTx = tx;
    }

    return NextResponse.json({ booking, transaction: createdTx }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create vendor booking." }, { status: 500 });
  }
}
