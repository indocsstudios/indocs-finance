import nodemailer from "nodemailer";

export function getTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER and SMTP_PASS must be set in .env to send emails.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendMail(options: {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}) {
  const transporter = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || "Indox Media";
  const fromEmail = process.env.SMTP_USER || "indoxmedia@gmail.com";

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: options.to,
    cc: options.cc,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  });
}
