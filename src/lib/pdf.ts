import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { CompanySettings, Project } from "./types";
import { DEFAULT_LOGO_URL, PROJECT_CATEGORIES, type ReceiptStage } from "./constants";
import { amountToIndianWords, formatDate, formatEventDateRange, getProjectFinancials } from "./format";

function rs(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
}

function pct(part: number, total: number): string {
  if (!total || total <= 0) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

async function resolveImageToDataUrl(urlOrData: string | null | undefined): Promise<string | null> {
  if (!urlOrData) return null;
  if (urlOrData.startsWith("data:image/")) return urlOrData;
  try {
    const res = await fetch(urlOrData);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateReceiptPDF(
  project: Project,
  settings: CompanySettings,
  stageOverride?: ReceiptStage
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  const { total, advance, finalPay, totalPaid, remaining, isPaidInFull } = getProjectFinancials(project);
  const events = project.project_events || [];

  const stage: ReceiptStage =
    stageOverride ||
    (project.receipt_type === "Quotation"
      ? "Quotation"
      : project.receipt_type === "Booking Confirmation"
      ? "Booking Confirmation"
      : "Final Payment Receipt");

  const catObj = PROJECT_CATEGORIES.find((c) => c.label === project.category);
  const tagline = (
    catObj?.tagline ||
    settings.company_tagline ||
    "AD SHOOTS, WEDDINGS, VIDEO DIRECTION & CREATIVE PRODUCTION"
  ).toUpperCase();

  // 1. DARK HEADER BANNER (#111318) + TEAL STRIP (#0d9488)
  doc.setFillColor(17, 19, 24);
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 34, pageWidth, 1.8, "F");

  // Load Indocs Media Logo (uploaded or official https://indocsmedia.vercel.app/assets/logo.png)
  const logoData = await resolveImageToDataUrl(settings.logo_data_url || DEFAULT_LOGO_URL);
  let brandX = margin;
  if (logoData && logoData.startsWith("data:image/")) {
    try {
      const fmt = logoData.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(logoData, fmt, margin, 7, 18, 18);
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
  doc.setFontSize(7.2);
  doc.setTextColor(180, 190, 205);
  const tagLines = doc.splitTextToSize(tagline, 84);
  doc.text(tagLines, brandX, 18);

  doc.setFontSize(7.4);
  doc.setTextColor(210, 220, 232);
  const phoneLines = doc.splitTextToSize(`Phone: ${settings.company_phone || "+91 9310895844"}`, 86);
  doc.text(phoneLines, brandX, 18 + tagLines.length * 3.3 + 1.5);

  // Right Header: Stage Title + Badge + Dates
  const headerTitle =
    stage === "Quotation"
      ? "PROJECT QUOTATION"
      : stage === "Booking Confirmation"
      ? "BOOKING CONFIRMATION"
      : "FINAL PAYMENT RECEIPT";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(212, 168, 83);
  const titleLines = doc.splitTextToSize(headerTitle, 65);
  doc.text(titleLines, pageWidth - margin, 11, { align: "right" });

  const badgeText =
    stage === "Quotation"
      ? "ESTIMATE / PROPOSAL"
      : stage === "Booking Confirmation"
      ? project.advance_confirmed
        ? "BOOKING CONFIRMED"
        : "ADVANCE PENDING"
      : isPaidInFull
      ? "PAID IN FULL"
      : "PARTIAL SETTLEMENT";

  const badgeColor: [number, number, number] =
    stage === "Quotation"
      ? [79, 70, 229]
      : stage === "Booking Confirmation"
      ? [202, 138, 4]
      : [13, 148, 136];

  const badgeY = 11 + titleLines.length * 4.8;
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(pageWidth - margin - 38, badgeY - 3.5, 38, 5.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);
  doc.text(badgeText, pageWidth - margin - 19, badgeY + 0.2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(210, 220, 232);
  doc.text(
    stage === "Quotation"
      ? `Quote Ref: ${project.receipt_number}`
      : `Settlement Date: ${formatDate(project.settlement_date)}`,
    pageWidth - margin,
    badgeY + 5.8,
    { align: "right" }
  );
  doc.text(`Shoot Dates: ${formatEventDateRange(events)}`, pageWidth - margin, badgeY + 9.6, { align: "right" });

  // 2. HIGHLIGHT BANNER
  let y = 40;
  const bannerAmt =
    stage === "Quotation"
      ? total
      : stage === "Booking Confirmation"
      ? advance
      : finalPay > 0
      ? finalPay
      : totalPaid;

  const bannerHeading =
    stage === "Quotation"
      ? "PROPOSED PACKAGE QUOTATION"
      : stage === "Booking Confirmation"
      ? "BOOKING ADVANCE ACKNOWLEDGED"
      : "FINAL SETTLEMENT PAYMENT ACKNOWLEDGED";

  const bannerSub =
    stage === "Quotation"
      ? `Prepared for ${project.client_name} — ${amountToIndianWords(total)} (Category: ${project.category || "Creative Production"})`
      : stage === "Booking Confirmation"
      ? `Booking advance received with thanks from ${project.client_name} — ${amountToIndianWords(advance)} (Locking dates for ${rs(total)} package)`
      : `Received with thanks from ${project.client_name} — ${amountToIndianWords(bannerAmt)} (${isPaidInFull ? `Settling ${rs(total)} Package in Full` : `Towards ${rs(total)} Package`})`;

  doc.setFillColor(stage === "Quotation" ? 238 : 236, stage === "Quotation" ? 242 : 253, stage === "Quotation" ? 255 : 245);
  doc.rect(margin, y, contentWidth, 16, "F");
  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.rect(margin, y, 1.6, 16, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(bannerHeading, margin + 4.5, y + 5.2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.1);
  doc.setTextColor(30, 41, 59);
  doc.text(doc.splitTextToSize(bannerSub, contentWidth - 46), margin + 4.5, y + 9.8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.text(rs(bannerAmt), pageWidth - margin - 4, y + 10.5, { align: "right" });

  // 3. TWO-COLUMN INFO CARDS
  y += 20;
  const colGap = 4;
  const colW = (contentWidth - colGap) / 2;
  const cardH = 23;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, colW, cardH, "FD");
  doc.setFillColor(201, 154, 59);
  doc.rect(margin, y, 1.3, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(161, 115, 29);
  doc.text(stage === "Quotation" ? "PREPARED FOR (CLIENT)" : "RECEIVED FROM (CLIENT)", margin + 4, y + 4.8);
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(project.client_name, margin + 4, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Contact: ${project.client_phone || project.client_email || "—"}`, margin + 4, y + 14.8);
  doc.text(doc.splitTextToSize(`Purpose: ${project.purpose || project.project_title}`, colW - 7)[0] || "", margin + 4, y + 19.3);

  const rx = margin + colW + colGap;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(rx, y, colW, cardH, "FD");
  doc.setFillColor(201, 154, 59);
  doc.rect(rx, y, 1.3, cardH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(161, 115, 29);
  doc.text("PAYMENT & PROJECT DETAILS", rx + 4, y + 4.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`Payment Account (UPI): ${project.payment_account || settings.default_upi || "—"}`, rx + 4, y + 10);
  doc.text(`Category: ${project.category || "Creative Production"}`, rx + 4, y + 14.8);
  doc.text(
    stage === "Quotation"
      ? `Proposed Advance to Lock: ${rs(advance)}`
      : `Account Status: ${isPaidInFull ? "Paid in Full (Rs. 0 Due)" : `Balance Due: ${rs(remaining)}`}`,
    rx + 4,
    y + 19.3
  );

  // 4. PAYMENT SUMMARY TABLE
  y += cardH + 6;
  doc.setFillColor(201, 154, 59);
  doc.rect(margin, y - 3.2, 1.2, 4.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    stage === "Quotation" ? "QUOTATION & PAYMENT SCHEDULE" : "PAYMENT SUMMARY & SETTLEMENT STATEMENT",
    margin + 3.5,
    y
  );

  const orig = Number(project.original_amount || 0);
  const disc = Number(project.discount_amount || 0);
  const pkgDesc =
    orig > total && disc > 0
      ? `Agreed Package Total (Original ${rs(orig)} less ${rs(disc)} Discount)`
      : `Agreed Package Total (${project.project_title})`;

  const payRows: Array<Array<string>> = [[pkgDesc, "100.0%", rs(total)]];

  if (stage === "Quotation") {
    const balAfterAdv = Math.max(0, total - advance);
    payRows.push(["Booking Advance Required (To Confirm Dates)", pct(advance, total), rs(advance)]);
    payRows.push([
      `Balance Payable on Settlement${project.settlement_date ? ` (${formatDate(project.settlement_date, true)})` : ""}`,
      pct(balAfterAdv, total),
      rs(balAfterAdv),
    ]);
    payRows.push(["Total Quoted Package Value", "100.0%", rs(total)]);
  } else if (stage === "Booking Confirmation") {
    const balAfterAdv = Math.max(0, total - (project.advance_confirmed ? advance : 0));
    payRows.push([
      `Less: Booking Advance Received${project.advance_received_date ? ` (${formatDate(project.advance_received_date, true)})` : ""}`,
      pct(advance, total),
      `- ${rs(advance)}`,
    ]);
    payRows.push([
      `Balance Payable on Settlement${project.settlement_date ? ` (${formatDate(project.settlement_date, true)})` : ""}`,
      pct(balAfterAdv, total),
      rs(balAfterAdv),
    ]);
  } else {
    payRows.push([
      `Less: Booking Advance${project.advance_received_date ? ` (${formatDate(project.advance_received_date, true)})` : " (Non-Refundable)"}`,
      pct(advance, total),
      `- ${rs(advance)}`,
    ]);
    if (finalPay > 0) {
      payRows.push([
        `Less: Final Balance Received${project.final_payment_date ? ` (${formatDate(project.final_payment_date, true)})` : ""}`,
        pct(finalPay, total),
        `- ${rs(finalPay)}`,
      ]);
    }
    payRows.push([`Total Amount Paid to Date (${pct(totalPaid, total)} Cleared)`, pct(totalPaid, total), rs(totalPaid)]);
    payRows.push(["Remaining Balance Due", pct(remaining, total), isPaidInFull ? "Rs. 0 (Paid in Full)" : rs(remaining)]);
  }

  autoTable(doc, {
    startY: y + 2.5,
    head: [["DESCRIPTION", "SHARE", "AMOUNT (INR)"]],
    body: payRows,
    theme: "grid",
    headStyles: { fillColor: [17, 19, 24], textColor: [255, 255, 255], fontSize: 7.8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.2, textColor: [30, 41, 59], cellPadding: 2.6 },
    columnStyles: { 1: { halign: "right", cellWidth: 22 }, 2: { halign: "right", cellWidth: 38, fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section === "body") {
        const lastIdx = payRows.length - 1;
        if (stage === "Final Payment Receipt" && data.row.index === lastIdx - 1) {
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

  // 5. EVENT / SHOOT COVERAGE & DELIVERABLES
  doc.setFillColor(201, 154, 59);
  doc.rect(margin, y - 3.2, 1.2, 4.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("SHOOT SCHEDULE & DELIVERABLES", margin + 3.5, y);

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
    head: [["DATE", "SHOOT / EVENT & VENUE", "COVERED SERVICES & DELIVERABLES"]],
    body: eventRows,
    theme: "grid",
    headStyles: { fillColor: [248, 250, 252], textColor: [30, 41, 59], fontSize: 7.5, fontStyle: "bold" },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.8, valign: "top" },
    columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" }, 1: { cellWidth: 66 } },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 7;

  // 6. NOTES & TERMS
  const terms = project.terms_and_conditions || settings.default_terms;
  if (terms) {
    doc.setFillColor(201, 154, 59);
    doc.rect(margin, y - 3.2, 1.2, 4.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("TERMS & DELIVERY NOTES", margin + 3.5, y);

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

  // 7. DUAL SIGNATURE FOOTER
  const sigY = Math.max(y + 12, 266);
  const sigW = 62;
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

  const sigRightX = pageWidth - margin - sigW;
  const sigImg = await resolveImageToDataUrl(settings.signature_data_url);
  if (sigImg && sigImg.startsWith("data:image/")) {
    try {
      const fmt = sigImg.includes("image/png") ? "PNG" : "JPEG";
      doc.addImage(sigImg, fmt, pageWidth - margin - 38, sigY - 13, 36, 11);
    } catch {
      doc.setFont("times", "italic"); doc.setFontSize(15); doc.setTextColor(30, 41, 59);
      doc.text(settings.signer_name || "Mithilesh Shende", pageWidth - margin, sigY - 3, { align: "right" });
    }
  } else {
    doc.setFont("times", "italic"); doc.setFontSize(15); doc.setTextColor(30, 41, 59);
    doc.text(settings.signer_name || "Mithilesh Shende", pageWidth - margin, sigY - 3, { align: "right" });
  }

  doc.line(sigRightX, sigY, pageWidth - margin, sigY);
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
  doc.text(settings.signer_name || "Mithilesh Shende", pageWidth - margin, sigY + 4.5, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(71, 85, 105);
  doc.text(settings.signer_title || "Co-Founder, Indocs Media | +91 7972929641", pageWidth - margin, sigY + 8.5, { align: "right" });

  doc.setFont("helvetica", "normal"); doc.setFontSize(7.3); doc.setTextColor(100, 116, 139);
  doc.text(
    `Thank you for choosing ${settings.company_name || "Indocs Media"}! For queries, contact ${settings.company_phone || "+91 9310895844"}.`,
    pageWidth / 2, 289, { align: "center" }
  );

  return doc;
}

export async function downloadReceiptPDF(project: Project, settings: CompanySettings, stage?: ReceiptStage) {
  const doc = await generateReceiptPDF(project, settings, stage);
  const safeClient = project.client_name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeStage = (stage || project.receipt_type || "Receipt").replace(/\s+/g, "_");
  doc.save(`Indocs_Media_${safeStage}_${safeClient}_${project.receipt_number}.pdf`);
}
