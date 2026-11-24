import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { sendMail } from "@/lib/mailer";
import { formatINR, getProjectFinancials } from "@/lib/format";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();
    const { data: project } = await supabase.from("projects").select("*, project_events(*)").eq("id", params.id).single();
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
    const recipient = body.toEmail || project.client_email;
    if (!recipient) return NextResponse.json({ error: "Client email is missing." }, { status: 400 });
    const { data: settings } = await supabase.from("company_settings").select("*").eq("id", 1).single();
    const { total, totalPaid, remaining } = getProjectFinancials(project);
    const stageName = body.stage || project.receipt_type || "Receipt";

    await sendMail({
      to: recipient,
      cc: settings?.company_email || process.env.SMTP_USER,
      subject: `${stageName} (${project.receipt_number}) — Indocs Media`,
      html: `<p>Dear <strong>${project.client_name}</strong>,</p><p>Please find attached your official <strong>${stageName}</strong> for <strong>${project.project_title}</strong>.</p><p>Package Total: ${formatINR(total)} | Paid: ${formatINR(totalPaid)} | Balance: ${formatINR(remaining)}</p><p>Regards,<br/><strong>${settings?.signer_name || "Mithilesh Shende"}</strong><br/>Indocs Media</p>`,
      attachments: body.pdfBase64
        ? [{ filename: `Indocs_Media_${stageName.replace(/\s+/g, "_")}_${project.client_name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`, content: Buffer.from(body.pdfBase64, "base64"), contentType: "application/pdf" }]
        : undefined,
    });
    return NextResponse.json({ message: `${stageName} emailed to ${recipient}!` });
  } catch {
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
