import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CompanySettings, Project } from "./types";
import { amountToIndianWords, formatDate, formatEventDateRange, getProjectFinancials } from "./format";

function rs(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
}

function pct(part: number, total: number): string {
  if (!total || total <= 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function generateReceiptPDF(project: Project, settings: CompanySettings): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const { total, advance, finalPay, totalPaid, remaining, isPaidInFull } = getProjectFinancials(project);
  const events = project.project_events || [];

  // 1. DARK HEADER BANNER (#111318) + TEAL STRIP (#0d9488)
  doc.setFillColor(17, 19, 24);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 34, pageWidth, 1.8, "F");

  // Logo + Brand Name (Left)
  let brandX = margin;
  if (settings.logo_data_url && settings.logo_data_url.startsWith("data:image/")) {
    try {
      const fmt = settings.logo_data_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.logo_data_url, fmt, margin, 7, 18, 18);
      brandX = margin + 21;
    } catch {
      brandX = margin;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text((settings.company_name || "INDOCS MEDIA").toUpperCase(), brandX, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(180, 190, 205);
  const tagline = (settings.company_tagline || "WEDDING PHOTOGRAPHY, VIDEOGRAPHY & CREATIVE PRODUCTION").toUpperCase();
  const tagLines = doc.splitTextToSize(tagline, 82);
  doc.text(tagLines, brandX, 18);

  doc.setFontSize(7.5);
  doc.setTextColor(210, 220, 232);
  const phoneLine = doc.splitTextToSize(`Phone: ${settings.company_phone || "+91 9310895844"}`, 86);
  doc.text(phoneLine, brandX, 18 + tagLines.length * 3.4 + 1.5);

  // Right Header: Receipt Title (Gold), Status Pill, Dates
  const receiptTitle = (project.receipt_type || (isPaidInFull ? "FINAL PAYMENT RECEIPT" : "BOOKING PAYMENT RECEIPT")).toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(212, 168, 83); // warm gold
  const titleLines = doc.splitTextToSize(receiptTitle, 65);
  doc.text(titleLines, pageWidth - margin, 11, { align: "right" });

  // Status Badge
  const badgeText = isPaidInFull
    ? "PAID IN FULL"
    : project.advance_confirmed
    ? "ADVANCE CONFIRMED"
    : "ADVANCE PENDING";
  const badgeY = 11 + titleLines.length * 4.8;
  doc.setFillColor(isPaidInFull ? 13 : 202, isPaidInFull ? 148 : 138, isPaidInFull ? 136 : 4);
  doc.roundedRect(pageWidth - margin - 34, badgeY - 3.5, 34, 5.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, pageWidth - margin - 17, badgeY + 0.2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(210, 220, 232);
  doc.text(`Settlement Date: ${formatDate(project.settlement_date)}`, pageWidth - margin, badgeY + 5.8, { align: "right" });
  doc.text(`Event Dates: ${formatEventDateRange(events)}`, pageWidth - margin, badgeY + 9.6, { align: "right" });

  // 2. TEAL PAYMENT ACKNOWLEDGMENT BANNER
  let y = 40;
  const ackAmount = finalPay > 0 ? finalPay : advance;
  const ackHeading = isPaidInFull
    ? "FINAL SETTLEMENT PAYMENT ACKNOWLEDGED"
    : "PAYMENT RECEIVED ACKNOWLEDGMENT";

  doc.setFillColor(236, 253, 245);
  doc.rect(margin, y, contentWidth, 16, "F");
  doc.setFillColor(13, 148, 136);
  doc.rect(margin, y, 1.6, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(15, 118, 110);
  doc.text(ackHeading, margin + 4.5, y + 5.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(30, 41, 59);
  const ackSub = `Received with thanks from ${project.client_name} — ${amountToIndianWords(ackAmount)} (${isPaidInFull ? `Settling ${rs(total)} Package in Full` : `Towards ${rs(total)} Package`})`;
  const ackSubLines = doc.splitTextToSize(ackSub, contentWidth - 46);
  doc.text(ackSubLines, margin + 4.5, y + 9.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 118, 110);
  doc.text(rs(ackAmount), pageWidth - margin - 4, y + 10.5, { align: "right" });

  // 3. TWO-COLUMN INFO CARDS (Gold Left Border)
  y += 20;
  const colGap = 4;
  const colW = (contentWidth - colGap) / 2;
  const cardH = 23;

  // Left Card: Client
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, colW, cardH, "FD");
  doc.setFillColor(201, 154, 59);
  doc.rect(margin, y, 1.3, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(161, 115, 29);
  doc.text("RECEIVED FROM (CLIENT)", margin + 4, y + 4.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(project.client_name, margin + 4, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Contact: ${project.client_phone || project.client_email || "—"}`, margin + 4, y + 14.8);
  const purposeText = doc.splitTextToSize(`Purpose: ${project.purpose || project.project_title}`, colW - 7);
  doc.text(purposeText[0] || "", margin + 4, y + 19.3);

  // Right Card: Payment & Settlement Details
  const rx = margin + colW + colGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(rx, y, colW, cardH, "FD");
  doc.setFillColor(201, 154, 59);
  doc.rect(rx, y, 1.3, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(161, 115, 29);
  doc.text("PAYMENT & SETTLEMENT DETAILS", rx + 4, y + 4.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Payment Account: ${project.payment_account || settings.default_upi || project.payment_mode || "—"}`, rx + 4, y + 10);
  doc.text(`Settlement Date: ${formatDate(project.settlement_date, true)}`, rx + 4, y + 14.8);
  doc.text(
    `Account Status: ${isPaidInFull ? "Paid in Full (Rs. 0 Balance Due)" : `Balance Due: ${rs(remaining)}`}`,
    rx + 4,
    y + 19.3
  );

  // 4. PAYMENT SUMMARY & FULL SETTLEMENT STATEMENT
  y += cardH + 6;
  doc.setFillColor(201, 154, 59);
  doc.rect(margin, y - 3.2, 1.2, 4.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("PAYMENT SUMMARY & FULL SETTLEMENT STATEMENT", margin + 3.5, y);

  const orig = Number(project.original_amount || 0);
  const disc = Number(project.discount_amount || 0);
  const packageDesc =
    orig > total && disc > 0
      ? `Agreed Package Total (Original ${rs(orig)} less ${rs(disc)} Discount)`
      : `Agreed Package Total (${project.project_title})`;

  const payRows: Array<Array<string>> = [
    [packageDesc, "100.0%", rs(total)],
    [
      `Less: Booking Advance ${project.advance_received_date ? `(${formatDate(project.advance_received_date, true)})` : "(Non-Refundable)"}`,
      pct(advance, total),
      `- ${rs(advance)}`,
    ],
  ];

  if (finalPay > 0) {
    payRows.push([
      `Less: Final Balance Payment Received${project.final_payment_date ? ` (${formatDate(project.final_payment_date, true)})` : ""}`,
      pct(finalPay, total),
      `- ${rs(finalPay)}`,
    ]);
  }

  payRows.push([
    `Total Amount Paid to Date (${pct(totalPaid, total)} Cleared)`,
    pct(totalPaid, total),
    rs(totalPaid),
  ]);
  payRows.push([
    "Remaining Balance Due",
    pct(remaining, total),
    isPaidInFull ? "Rs. 0 (Paid in Full)" : rs(remaining),
  ]);

  autoTable(doc, {
    startY: y + 2.5,
    head: [["DESCRIPTION", "SHARE", "AMOUNT (INR)"]],
    body: payRows,
    theme: "grid",
    headStyles: { fillColor: [17, 19, 24], textColor: [255, 255, 255], fontSize: 7.8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.2, textColor: [30, 41, 59], cellPadding: 2.6 },
    columnStyles: {
      1: { halign: "right", cellWidth: 22 },
      2: { halign: "right", cellWidth: 38, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const lastIdx = payRows.length - 1;
        const paidIdx = payRows.length - 2;
        if (data.row.index === paidIdx) {
          data.cell.styles.fillColor = [236, 253, 245];
          data.cell.styles.textColor = [15, 118, 110];
          data.cell.styles.fontStyle = "bold";
        }
        if (data.row.index === lastIdx) {
          data.cell.styles.fillColor = [17, 19, 24];
          data.cell.styles.textColor = [255, 255, 255];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 7;

  // 5. EVENT COVERAGE & DELIVERABLES TABLE
  doc.setFillColor(201, 154, 59);
  doc.rect(margin, y - 3.2, 1.2, 4.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("EVENT COVERAGE & DELIVERABLES", margin + 3.5, y);

  const eventRows =
    events.length > 0
      ? events.map((ev) => [
          `${formatDate(ev.event_date)}${ev.day_label ? `\n${ev.day_label}` : ""}`,
          `${ev.event_name}${ev.venue ? `\n${ev.venue}` : ""}`,
          ev.deliverables || "As per agreed package",
        ])
      : [["—", project.project_title, "As per agreed package"]];

  autoTable(doc, {
    startY: y + 2.5,
    head: [["DATE", "EVENT & VENUE", "COVERED SERVICES & DELIVERABLES"]],
    body: eventRows,
    theme: "grid",
    headStyles: { fillColor: [248, 250, 252], textColor: [30, 41, 59], fontSize: 7.5, fontStyle: "bold", lineColor: [226, 232, 240] },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.8, valign: "top" },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: 66 },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 7;

  // 6. SETTLEMENT NOTES & DELIVERY TERMS
  const terms = project.terms_and_conditions || settings.default_terms;
  if (terms) {
    doc.setFillColor(201, 154, 59);
    doc.rect(margin, y - 3.2, 1.2, 4.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("SETTLEMENT NOTES & DELIVERY TERMS", margin + 3.5, y);

    const splitTerms = doc.splitTextToSize(terms, contentWidth - 8);
    const boxH = Math.max(18, splitTerms.length * 3.7 + 6);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y + 2.5, contentWidth, boxH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(splitTerms, margin + 4, y + 7);
    y += boxH + 8;
  }

  // 7. DUAL SIGNATURE FOOTER (Client Left, Mithilesh Shende Right)
  const sigY = Math.max(y + 12, 266);
  const sigW = 62;

  // Client Left
  doc.setDrawColor(148, 163, 184);
  doc.line(margin, sigY, margin + sigW, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Client Acknowledgement", margin, sigY + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(project.client_name, margin, sigY + 8.5);

  // Authorized Signer Right
  const sigRightX = pageWidth - margin - sigW;
  if (settings.signature_data_url && settings.signature_data_url.startsWith("data:image/")) {
    try {
      const fmt = settings.signature_data_url.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(settings.signature_data_url, fmt, pageWidth - margin - 38, sigY - 13, 36, 11);
    } catch {
      doc.setFont("times", "italic");
      doc.setFontSize(15);
      doc.setTextColor(30, 41, 59);
      doc.text(settings.signer_name || "Mithilesh Shende", pageWidth - margin, sigY - 3, { align: "right" });
    }
  } else {
    doc.setFont("times", "italic");
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.signer_name || "Mithilesh Shende", pageWidth - margin, sigY - 3, { align: "right" });
  }

  doc.line(sigRightX, sigY, pageWidth - margin, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(settings.signer_name || "Mithilesh Shende", pageWidth - margin, sigY + 4.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(settings.signer_title || "Co-Founder, Indocs Media | +91 7972929641", pageWidth - margin, sigY + 8.5, { align: "right" });

  // Bottom Contact Line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.3);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Thank you for choosing ${settings.company_name || "Indocs Media"}! For any queries, contact ${settings.company_phone || "+91 9310895844"}.`,
    pageWidth / 2,
    289,
    { align: "center" }
  );

  return doc;
}

export function downloadReceiptPDF(project: Project, settings: CompanySettings) {
  const doc = generateReceiptPDF(project, settings);
  const safeClient = project.client_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`Indocs_Media_Receipt_${safeClient}_${project.receipt_number}.pdf`);
}
