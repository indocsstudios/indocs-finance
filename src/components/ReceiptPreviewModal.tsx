"use client";

import { useState } from "react";
import { Download, Mail, Printer, X } from "lucide-react";
import type { CompanySettings, Project } from "@/lib/types";
import { amountToIndianWords, formatDate, formatEventDateRange, formatINR, getProjectFinancials } from "@/lib/format";
import { downloadReceiptPDF, generateReceiptPDF } from "@/lib/pdf";

interface Props {
  project: Project;
  settings: CompanySettings;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ project, settings, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  const { total, advance, finalPay, totalPaid, remaining, isPaidInFull } = getProjectFinancials(project);
  const events = project.project_events || [];
  const ackAmount = finalPay > 0 ? finalPay : advance;
  const orig = Number(project.original_amount || 0);
  const disc = Number(project.discount_amount || 0);

  const pct = (part: number) => (total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "0.0%");

  async function handleEmailReceipt() {
    setSending(true); setEmailStatus("");
    try {
      const pdfDoc = generateReceiptPDF(project, settings);
      const pdfBase64 = pdfDoc.output("datauristring").split(",")[1];
      const res = await fetch(`/api/projects/${project.id}/send-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const data = await res.json();
      setEmailStatus(res.ok ? data.message : `Error: ${data.error}`);
    } catch {
      setEmailStatus("Error: Failed to send email.");
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 px-6 py-3.5 bg-[#111318] text-white border-b border-zinc-800">
          <div>
            <h2 className="font-semibold text-sm">Indocs Media Receipt — {project.receipt_number}</h2>
            <p className="text-xs text-zinc-400">Exact A4 PDF layout ready to download or email</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => downloadReceiptPDF(project, settings)}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold">
              <Download className="h-4 w-4" /> Download PDF
            </button>
            <button onClick={handleEmailReceipt} disabled={sending || !project.client_email}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3.5 py-2 rounded-lg text-xs font-semibold">
              <Mail className="h-4 w-4" /> {sending ? "Sending..." : "Email Client"}
            </button>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-xs font-medium">
              <Printer className="h-4 w-4" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {emailStatus && (
          <div className={`no-print px-6 py-2 text-xs font-medium ${emailStatus.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
            {emailStatus}
          </div>
        )}

        {/* Receipt Paper */}
        <div className="overflow-y-auto bg-white text-slate-800">
          {/* Dark Header Banner */}
          <div className="bg-[#111318] text-white px-8 py-6 border-b-4 border-teal-600 flex flex-wrap justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              {settings.logo_data_url ? (
                <img src={settings.logo_data_url} alt="Logo" className="h-14 w-14 object-contain rounded" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-teal-600/20 border border-teal-500/40 flex items-center justify-center font-black text-teal-400 text-lg">
                  IM
                </div>
              )}
              <div>
                <h1 className="text-2xl font-extrabold tracking-wide uppercase">{settings.company_name || "INDOCS MEDIA"}</h1>
                <p className="text-[10px] tracking-widest text-zinc-400 uppercase mt-0.5 max-w-xs">
                  {settings.company_tagline || "WEDDING PHOTOGRAPHY, VIDEOGRAPHY & CREATIVE PRODUCTION"}
                </p>
                <p className="text-xs text-zinc-300 mt-1.5">Phone: {settings.company_phone}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-extrabold text-[#d4a853] tracking-wide uppercase leading-tight">
                {project.receipt_type || (isPaidInFull ? "FINAL PAYMENT RECEIPT" : "BOOKING PAYMENT RECEIPT")}
              </div>
              <div className="mt-2 inline-block px-3 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase text-white"
                style={{ backgroundColor: isPaidInFull ? "#0d9488" : "#ca8a04" }}>
                {isPaidInFull ? "PAID IN FULL" : project.advance_confirmed ? "ADVANCE CONFIRMED" : "ADVANCE PENDING"}
              </div>
              <div className="text-xs text-zinc-300 mt-2 space-y-0.5">
                <div><span className="text-zinc-400">Settlement Date:</span> <strong>{formatDate(project.settlement_date)}</strong></div>
                <div><span className="text-zinc-400">Event Dates:</span> <strong>{formatEventDateRange(events)}</strong></div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Teal Payment Acknowledgment Banner */}
            <div className="bg-emerald-50 border-l-4 border-teal-600 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-extrabold tracking-wider uppercase text-teal-800">
                  {isPaidInFull ? "FINAL SETTLEMENT PAYMENT ACKNOWLEDGED" : "PAYMENT RECEIVED ACKNOWLEDGMENT"}
                </div>
                <p className="text-sm text-slate-700 mt-1">
                  Received with thanks from <strong>{project.client_name}</strong> —{" "}
                  <em className="text-slate-600">{amountToIndianWords(ackAmount)}</em>{" "}
                  ({isPaidInFull ? `Settling ${formatINR(total)} Package in Full` : `Towards ${formatINR(total)} Package`})
                </p>
              </div>
              <div className="text-3xl font-black text-teal-800">{formatINR(ackAmount)}</div>
            </div>

            {/* 2-Column Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#c99a3b] p-4 space-y-1">
                <div className="text-[11px] font-bold tracking-wider uppercase text-[#a1731d]">RECEIVED FROM (CLIENT)</div>
                <div className="text-base font-bold text-slate-900">{project.client_name}</div>
                <div className="text-xs text-slate-600"><strong>Contact:</strong> {project.client_phone || project.client_email || "—"}</div>
                <div className="text-xs text-slate-600"><strong>Purpose:</strong> {project.purpose || project.project_title}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 border-l-4 border-l-[#c99a3b] p-4 space-y-1">
                <div className="text-[11px] font-bold tracking-wider uppercase text-[#a1731d]">PAYMENT &amp; SETTLEMENT DETAILS</div>
                <div className="text-xs text-slate-700"><strong>Payment Account (UPI):</strong> {project.payment_account || settings.default_upi || "—"}</div>
                <div className="text-xs text-slate-700"><strong>Settlement Date:</strong> {formatDate(project.settlement_date, true)}</div>
                <div className="text-xs text-slate-700">
                  <strong>Account Status:</strong> {isPaidInFull ? "Paid in Full (₹0 Balance Due)" : `Balance Due (${formatINR(remaining)})`}
                </div>
              </div>
            </div>

            {/* Payment Summary Table */}
            <div>
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 border-l-4 border-[#c99a3b] pl-2.5 mb-2.5">
                PAYMENT SUMMARY &amp; FULL SETTLEMENT STATEMENT
              </h3>
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-[#111318] text-white uppercase">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Description</th>
                    <th className="py-2.5 px-3 text-right w-20">Share</th>
                    <th className="py-2.5 px-3 text-right w-36">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2.5 px-3 font-medium">
                      {orig > total && disc > 0
                        ? `Agreed Package Total (Original ${formatINR(orig)} less ${formatINR(disc)} Discount)`
                        : `Agreed Package Total (${project.project_title})`}
                    </td>
                    <td className="py-2.5 px-3 text-right">100.0%</td>
                    <td className="py-2.5 px-3 text-right font-semibold">{formatINR(total)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3">
                      Less: Booking Advance {project.advance_received_date ? `(${formatDate(project.advance_received_date, true)})` : "(Non-Refundable)"}
                    </td>
                    <td className="py-2.5 px-3 text-right">{pct(advance)}</td>
                    <td className="py-2.5 px-3 text-right">- {formatINR(advance)}</td>
                  </tr>
                  {finalPay > 0 && (
                    <tr className="text-teal-800 font-semibold">
                      <td className="py-2.5 px-3">
                        Less: Final Balance Payment Received{project.final_payment_date ? ` (${formatDate(project.final_payment_date, true)})` : ""}
                      </td>
                      <td className="py-2.5 px-3 text-right">{pct(finalPay)}</td>
                      <td className="py-2.5 px-3 text-right">- {formatINR(finalPay)}</td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50 text-teal-800 font-bold">
                    <td className="py-2.5 px-3">Total Amount Paid to Date ({pct(totalPaid)} Cleared)</td>
                    <td className="py-2.5 px-3 text-right">{pct(totalPaid)}</td>
                    <td className="py-2.5 px-3 text-right">{formatINR(totalPaid)}</td>
                  </tr>
                  <tr className="bg-[#111318] text-white font-bold">
                    <td className="py-2.5 px-3">Remaining Balance Due</td>
                    <td className="py-2.5 px-3 text-right">{pct(remaining)}</td>
                    <td className="py-2.5 px-3 text-right">{isPaidInFull ? "₹0 (Paid in Full)" : formatINR(remaining)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Event Coverage & Deliverables */}
            <div>
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 border-l-4 border-[#c99a3b] pl-2.5 mb-2.5">
                EVENT COVERAGE &amp; DELIVERABLES
              </h3>
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50 text-slate-700 uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-left w-32">Date</th>
                    <th className="py-2.5 px-3 text-left w-64">Event &amp; Venue</th>
                    <th className="py-2.5 px-3 text-left">Covered Services &amp; Deliverables</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {events.map((ev, i) => (
                    <tr key={i} className="align-top">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{formatDate(ev.event_date)}</div>
                        {ev.day_label && <div className="text-slate-500">{ev.day_label}</div>}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{ev.event_name}</div>
                        {ev.venue && <div className="text-slate-600 mt-0.5">{ev.venue}</div>}
                      </td>
                      <td className="py-3 px-3 text-slate-700 whitespace-pre-line">
                        {ev.deliverables || "As per agreed package"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Terms */}
            <div>
              <h3 className="text-xs font-extrabold tracking-wider uppercase text-slate-900 border-l-4 border-[#c99a3b] pl-2.5 mb-2">
                SETTLEMENT NOTES &amp; DELIVERY TERMS
              </h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {project.terms_and_conditions || settings.default_terms}
              </div>
            </div>

            {/* Dual Signature Footer */}
            <div className="flex flex-wrap justify-between items-end pt-8 gap-6">
              <div className="w-56">
                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-slate-900">Client Acknowledgement</div>
                  <div className="text-xs text-slate-500">{project.client_name}</div>
                </div>
              </div>
              <div className="w-64 text-right">
                {settings.signature_data_url ? (
                  <img src={settings.signature_data_url} alt={settings.signer_name} className="h-12 ml-auto object-contain mb-1" />
                ) : (
                  <div className="font-serif italic text-2xl text-slate-800 mb-1">{settings.signer_name}</div>
                )}
                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-slate-900">{settings.signer_name}</div>
                  <div className="text-[11px] text-slate-500">{settings.signer_title}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
