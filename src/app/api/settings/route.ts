import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(req: Request) {
  const session = getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const body = await req.json();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("company_settings")
    .update({
      company_name: body.company_name,
      company_tagline: body.company_tagline || null,
      company_email: body.company_email,
      company_phone: body.company_phone,
      company_address: body.company_address,
      default_upi: body.default_upi || null,
      logo_data_url: body.logo_data_url || null,
      signer_name: body.signer_name,
      signer_title: body.signer_title,
      signature_data_url: body.signature_data_url || null,
      gst_number: body.gst_number || null,
      default_terms: body.default_terms,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
