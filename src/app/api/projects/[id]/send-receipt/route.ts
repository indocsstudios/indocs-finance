import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendMail } from "@/lib/mailer";
import { formatDate, formatINR, getProjectFinancials } from "@/lib/format";

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
    if (!recipient) return NextResponse.json({ error: "Client email is missing." }, { status: 400 });

    const { data: settings } = await supabase.from("company_settings").select("*").eq("id", 1).single();
    const { total, totalPaid, remaining } = getProjectFinancials(project);

    const attachments = pdfBase64
      ? [{
          filename: `Indocs_Media_Receipt_${project.client_name.replace(/[^a-zA-Z0-9_-]/g, "_")}_${project.receipt_number}.pdf`,
          content: Buffer.from(pdfBase64, "base64"),
          contentType: "application/pdf",
        }]
      : undefined;

    await sendMail({
      to: recipient,
      cc: settings?.company_email || process.env.SMTP_USER,
      subject: `${project.receipt_type || "Payment Receipt"} (${project.receipt_number}) — Indocs Media`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b;">
          <h2 style="margin-bottom:4px;">Indocs Media</h2>
          <p>Dear <strong>${project.client_name}</strong>,</p>
          <p>Please find attached your official receipt for <strong>${project.project_title}</strong>.</p>
          <p><strong>Package Total:</strong> ${formatINR(total)}<br/>
          <strong>Total Paid:</strong> ${formatINR(totalPaid)}<br/>
          <strong>Balance Due:</strong> ${formatINR(remaining)}<br/>
          <strong>Settlement Date:</strong> ${formatDate(project.settlement_date)}</p>
          <p>Warm regards,<br/><strong>${settings?.signer_name || "Mithilesh Shende"}</strong><br/>${settings?.company_name || "Indocs Media"}</p>
        </div>
      `,
      attachments,
    });

    return NextResponse.json({ message: `Receipt emailed to ${recipient} (CC: ${settings?.company_email || process.env.SMTP_USER}).` });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send email. Check SMTP settings." }, { status: 500 });
  }
}
