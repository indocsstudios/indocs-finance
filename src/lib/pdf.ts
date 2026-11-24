import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CompanySettings, Project } from "./types";
import { formatDate } from "./format";

function formatRs(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
}

export function generateReceiptPDF(project: Project, settings: CompanySettings): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;

  // Top Accent Bar
  doc.setFillColor(24, 24, 27); // zinc-900
  doc.rect(0, 0, pageWidth, 6, "F");

  // Header: Logo or Indox Media Brand Wordmark
  let headerY = 18;
  if (settings.logo_data_url && settings.logo_data_url.startsWith("data:image/")) {
    try {
      const fmt = settings.logo_data_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.logo_data_url, fmt, margin, 12, 34, 14);
      headerY = 30;
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(24, 24, 27);
      doc.text(settings.company_name.toUpperCase(), margin, 22);
      headerY = 27;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(24, 24, 27);
    doc.text(settings.company_name.toUpperCase(), margin, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("VISUAL PRODUCTION & MEDIA STUDIO", margin, 27);
    headerY = 32;
  }

  // Company Contact Details (Left)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(settings.company_email || "indoxmedia@gmail.com", margin, headerY);
  if (settings.company_phone) {
    doc.text(settings.company_phone, margin, headerY + 4.5);
  }
  if (settings.company_address) {
    doc.text(settings.company_address, margin, headerY + 9);
  }
  if (settings.gst_number && settings.gst_number.trim() !== "") {
    doc.text(`GSTIN: ${settings.gst_number}`, margin, headerY + 13.5);
  }

  // Receipt Meta (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(67, 56, 202); // indigo-700
  doc.text("PAYMENT RECEIPT", pageWidth - margin, 21, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Receipt No: ${project.receipt_number}`, pageWidth - margin, 28, { align: "right" });
  doc.text(`Issued On: ${formatDate(project.created_at)}`, pageWidth - margin, 33, { align: "right" });

  // Status Pill
  const statusText = project.advance_confirmed ? "ADVANCE CONFIRMED" : "ADVANCE PENDING";
  doc.setFillColor(
    project.advance_confirmed ? 220 : 254,
    project.advance_confirmed ? 252 : 243,
    project.advance_confirmed ? 231 : 199
  );
  doc.roundedRect(pageWidth - margin - 44, 36.5, 44, 7, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(
    project.advance_confirmed ? 22 : 180,
    project.advance_confirmed ? 101 : 83,
    project.advance_confirmed ? 52 : 9
  );
  doc.text(statusText, pageWidth - margin - 22, 41.2, { align: "center" });

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 49, pageWidth - margin, 49);

  // Client & Booking Info Grid
  const infoY = 56;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("BILLED TO", margin, infoY);
  doc.text("BOOKING & PAYMENT DATES", pageWidth / 2 + 4, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(project.client_name, margin, infoY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Project: ${project.project_title}`, margin, infoY + 11.5);
  if (project.client_phone) doc.text(`Phone: ${project.client_phone}`, margin, infoY + 16.5);
  if (project.client_email) doc.text(`Email: ${project.client_email}`, margin, infoY + 21.5);

  // Dates column
  const col2X = pageWidth / 2 + 4;
  doc.setFontSize(9.5);
  doc.text(`Booking Confirmed: ${formatDate(project.booking_confirmed_date)}`, col2X, infoY + 6);
  doc.text(`Advance Received: ${formatDate(project.advance_received_date)}`, col2X, infoY + 11.5);
  doc.text(`Settlement Date: ${formatDate(project.settlement_date)}`, col2X, infoY + 17);
  if (project.payment_mode) {
    doc.text(`Payment Mode: ${project.payment_mode}`, col2X, infoY + 22.5);
  }

  // Events Schedule Table
  const events = project.project_events || [];
  const hasEventBudgets = events.some((e) => e.event_budget && Number(e.event_budget) > 0);

  const tableHead = hasEventBudgets
    ? [["#", "Event / Shoot Details", "Event Date", "Venue", "Budget"]]
    : [["#", "Event / Shoot Details", "Event Date", "Venue"]];

  const tableBody =
    events.length > 0
      ? events.map((ev, idx) =>
          hasEventBudgets
            ? [
                String(idx + 1),
                ev.event_name,
                formatDate(ev.event_date),
                ev.venue || "—",
                ev.event_budget ? formatRs(ev.event_budget) : "Included",
              ]
            : [String(idx + 1), ev.event_name, formatDate(ev.event_date), ev.venue || "—"]
        )
      : [
          hasEventBudgets
            ? ["1", project.project_title, "—", "—", formatRs(project.total_amount)]
            : ["1", project.project_title, "—", "—"],
        ];

  autoTable(doc, {
    startY: 86,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      ...(hasEventBudgets ? { 4: { halign: "right" } } : {}),
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Financial Summary Box (Right-aligned)
  const total = Number(project.total_amount || 0);
  const advance = Number(project.advance_amount || 0);
  const balance = Math.max(0, total - advance);

  const boxWidth = 82;
  const boxX = pageWidth - margin - boxWidth;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(boxX, currentY, boxWidth, 30, 2, 2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Total Project Amount", boxX + 4, currentY + 7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(formatRs(total), boxX + boxWidth - 4, currentY + 7, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Advance (${project.advance_confirmed ? "Confirmed" : "Pending"})`,
    boxX + 4,
    currentY + 14.5
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52);
  doc.text(formatRs(advance), boxX + boxWidth - 4, currentY + 14.5, { align: "right" });

  doc.setDrawColor(203, 213, 225);
  doc.line(boxX + 4, currentY + 18.5, boxX + boxWidth - 4, currentY + 18.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(67, 56, 202);
  doc.text("Balance Payable", boxX + 4, currentY + 25.5);
  doc.text(formatRs(balance), boxX + boxWidth - 4, currentY + 25.5, { align: "right" });

  // Notes (Left of summary box if present)
  if (project.notes && project.notes.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT NOTES", margin, currentY + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(project.notes, pageWidth - margin * 2 - boxWidth - 8);
    doc.text(splitNotes, margin, currentY + 10);
  }

  currentY += 40;

  // Terms & Conditions
  const terms = project.terms_and_conditions || settings.default_terms;
  if (terms) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("TERMS & CONDITIONS", margin, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    const splitTerms = doc.splitTextToSize(terms, pageWidth - margin * 2);
    doc.text(splitTerms, margin, currentY + 5);
    currentY += 8 + splitTerms.length * 4;
  }

  // Authorized Signature Block (Mithilesh Shandy)
  const sigY = Math.max(currentY + 10, 242);
  const sigX = pageWidth - margin - 58;

  if (settings.signature_data_url && settings.signature_data_url.startsWith("data:image/")) {
    try {
      const fmt = settings.signature_data_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.signature_data_url, fmt, sigX + 6, sigY - 14, 42, 13);
    } catch {
      doc.setFont("times", "italic");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text(settings.signer_name || "Mithilesh Shandy", sigX + 29, sigY - 3, { align: "center" });
    }
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.signer_name || "Mithilesh Shandy", sigX + 29, sigY - 3, { align: "center" });
  }

  doc.setDrawColor(148, 163, 184);
  doc.line(sigX, sigY, sigX + 58, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.signer_name || "Mithilesh Shandy", sigX + 29, sigY + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.signer_title || "Authorized Signatory, Indox Media", sigX + 29, sigY + 9.5, {
    align: "center",
  });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Thank you for choosing ${settings.company_name}. This is a computer-generated receipt.`,
    pageWidth / 2,
    286,
    { align: "center" }
  );

  return doc;
}

export function downloadReceiptPDF(project: Project, settings: CompanySettings) {
  const doc = generateReceiptPDF(project, settings);
  const safeClient = project.client_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`${project.receipt_number}_${safeClient}_Receipt.pdf`);
}
