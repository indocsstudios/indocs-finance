import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendMail } from "@/lib/mailer";
import { formatDate, formatINR } from "@/lib/format";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const pdfBase64: string | undefined = body.pdfBase64;

    const supabase = getSupabaseAdmin();
    const { data: project } = await supabase
      .from("projects")
      .select("*, project_events(*)")
      .eq("id", params.id)
      .single();

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const recipient = body.toEmail || project.client_email;
    if (!recipient) {
      return NextResponse.json({ error: "Client email is missing for this project." }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from("company_settings")
      .select("*")
      .eq("id", 1)
      .single();

    const balance = Math.max(0, Number(project.total_amount || 0) - Number(project.advance_amount || 0));
    const eventsHtml = (project.project_events || [])
      .map(
        (e: { event_name: string; event_date: string; venue?: string }) =>
          `<li><strong>${e.event_name}</strong> — ${formatDate(e.event_date)}${e.venue ? ` (${e.venue})` : ""}</li>`
      )
      .join("");

    const attachments = pdfBase64
      ? [
          {
            filename: `${project.receipt_number}_${project.client_name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Receipt.pdf`,
            content: Buffer.from(pdfBase64, "base64"),
            contentType: "application/pdf",
          },
        ]
      : undefined;

    await sendMail({
      to: recipient,
      cc: settings?.company_email || process.env.SMTP_USER,
      subject: `Payment Receipt ${project.receipt_number} — ${settings?.company_name || "Indox Media"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #18181b; margin-bottom: 4px;">${settings?.company_name || "Indox Media"}</h2>
          <p style="color: #64748b; margin-top: 0;">Receipt #${project.receipt_number}</p>
          <p>Dear <strong>${project.client_name}</strong>,</p>
          <p>Thank you for booking with <strong>${settings?.company_name || "Indox Media"}</strong>. Please find your official payment receipt attached for <strong>${project.project_title}</strong>.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${formatINR(project.total_amount)}</p>
            <p style="margin: 4px 0;"><strong>Advance Paid (${project.advance_confirmed ? "Confirmed" : "Pending"}):</strong> ${formatINR(project.advance_amount)}</p>
            <p style="margin: 4px 0;"><strong>Balance Payable:</strong> ${formatINR(balance)}</p>
            <p style="margin: 4px 0;"><strong>Booking Confirmed Date:</strong> ${formatDate(project.booking_confirmed_date)}</p>
            <p style="margin: 4px 0;"><strong>Settlement Date:</strong> ${formatDate(project.settlement_date)}</p>
          </div>
          ${eventsHtml ? `<p><strong>Scheduled Events:</strong></p><ul>${eventsHtml}</ul>` : ""}
          <p style="margin-top: 24px;">Warm regards,<br/><strong>${settings?.signer_name || "Mithilesh Shandy"}</strong><br/>${settings?.company_name || "Indox Media"}</p>
        </div>
      `,
      attachments,
    });

    return NextResponse.json({ message: `Receipt emailed to ${recipient} (CC: ${settings?.company_email || process.env.SMTP_USER}).` });
  } catch (err) {
    console.error("Send receipt email error:", err);
    return NextResponse.json({ error: "Failed to send receipt email. Check SMTP settings." }, { status: 500 });
  }
}
