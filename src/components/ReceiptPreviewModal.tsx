"use client";

import { useState } from "react";
import { Download, Mail, Printer, X, CheckCircle2, Clock } from "lucide-react";
import type { CompanySettings, Project } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/format";
import { downloadReceiptPDF, generateReceiptPDF } from "@/lib/pdf";

interface Props {
  project: Project;
  settings: CompanySettings;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ project, settings, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string>("");

  const total = Number(project.total_amount || 0);
  const advance = Number(project.advance_amount || 0);
  const balance = Math.max(0, total - advance);
  const events = project.project_events || [];
  const hasEventBudgets = events.some((e) => e.event_budget && Number(e.event_budget) > 0);

  async function handleEmailReceipt() {
    setSending(true);
    setEmailStatus("");
    try {
      const pdfDoc = generateReceiptPDF(project, settings);
      const dataUri = pdfDoc.output("datauristring");
      const pdfBase64 = dataUri.split(",")[1];

      const res = await fetch(`/api/projects/${project.id}/send-receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailStatus(`Error: ${data.error || "Could not send email"}`);
      } else {
        setEmailStatus(data.message);
      }
    } catch {
      setEmailStatus("Error: Failed to send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 px-6 py-4 bg-zinc-900 text-white">
          <div>
            <h2 className="font-semibold text-base">Receipt Preview — {project.receipt_number}</h2>
            <p className="text-xs text-zinc-400">Ready to download as PDF or email to {project.client_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadReceiptPDF(project, settings)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </button>
            <button
              onClick={handleEmailReceipt}
              disabled={sending || !project.client_email}
              title={!project.client_email ? "Add client email to send via SMTP" : "Send receipt via indoxmedia@gmail.com"}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition"
            >
              <Mail className="h-4 w-4" />
              {sending ? "Sending..." : "Email Client"}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-2 rounded-lg text-xs font-medium transition"
            >
              <Printer className="h-4 w-4" />
              Print
            </button>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {emailStatus && (
          <div className={`no-print px-6 py-2.5 text-xs font-medium ${emailStatus.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
            {emailStatus}
          </div>
        )}

        {/* Receipt Paper Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800">
          {/* Brand Header */}
          <div className="flex flex-wrap justify-between items-start gap-4 border-b border-slate-200 pb-6">
            <div>
              {settings.logo_data_url ? (
                <img src={settings.logo_data_url} alt={settings.company_name} className="h-12 object-contain mb-2" />
              ) : (
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold">
                    IM
                  </div>
                  <div>
                    <div className="text-xl font-extrabold tracking-tight text-zinc-900 uppercase">
                      {settings.company_name}
                    </div>
                    <div className="text-[10px] tracking-widest text-slate-500 uppercase">
                      Visual Production &amp; Media Studio
                    </div>
                  </div>
                </div>
              )}
              <div className="text-xs text-slate-500 space-y-0.5">
                <div>{settings.company_email}</div>
                {settings.company_phone && <div>{settings.company_phone}</div>}
                {settings.company_address && <div>{settings.company_address}</div>}
                {settings.gst_number && <div>GSTIN: {settings.gst_number}</div>}
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-indigo-700 tracking-wide">PAYMENT RECEIPT</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">{project.receipt_number}</div>
              <div className="text-xs text-slate-500">Issued: {formatDate(project.created_at)}</div>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-opacity-90 border"
                style={{
                  backgroundColor: project.advance_confirmed ? "#dcfce7" : "#fef3c7",
                  color: project.advance_confirmed ? "#166534" : "#92400e",
                  borderColor: project.advance_confirmed ? "#86efac" : "#fde68a",
                }}
              >
                {project.advance_confirmed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                {project.advance_confirmed ? "Advance Confirmed" : "Advance Pending"}
              </div>
            </div>
          </div>

          {/* Client & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Billed To</div>
              <div className="text-base font-bold text-slate-900">{project.client_name}</div>
              <div className="text-slate-600">{project.project_title}</div>
              {project.client_phone && <div className="text-xs text-slate-500 mt-1">Phone: {project.client_phone}</div>}
              {project.client_email && <div className="text-xs text-slate-500">Email: {project.client_email}</div>}
            </div>
            <div className="sm:text-right space-y-1 text-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Key Dates</div>
              <div><span className="text-slate-500">Booking Confirmed:</span> <strong>{formatDate(project.booking_confirmed_date)}</strong></div>
              <div><span className="text-slate-500">Advance Received:</span> <strong>{formatDate(project.advance_received_date)}</strong></div>
              <div><span className="text-slate-500">Settlement Date:</span> <strong>{formatDate(project.settlement_date)}</strong></div>
              {project.payment_mode && (
                <div><span className="text-slate-500">Payment Mode:</span> <strong>{project.payment_mode}</strong></div>
              )}
            </div>
          </div>

          {/* Multi-Event Schedule Table */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Event Schedule ({events.length} {events.length === 1 ? "Event" : "Events"})
            </div>
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
              <thead className="bg-zinc-900 text-white text-xs">
                <tr>
                  <th className="py-2.5 px-3 text-left w-10">#</th>
                  <th className="py-2.5 px-3 text-left">Event / Shoot</th>
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-3 text-left">Venue</th>
                  {hasEventBudgets && <th className="py-2.5 px-3 text-right">Budget</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {events.length > 0 ? (
                  events.map((ev, i) => (
                    <tr key={i} className="bg-white">
                      <td className="py-2.5 px-3 text-slate-500">{i + 1}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{ev.event_name}</td>
                      <td className="py-2.5 px-3 text-slate-700">{formatDate(ev.event_date)}</td>
                      <td className="py-2.5 px-3 text-slate-600">{ev.venue || "—"}</td>
                      {hasEventBudgets && (
                        <td className="py-2.5 px-3 text-right font-medium">
                          {ev.event_budget ? formatINR(ev.event_budget) : "Included"}
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-2.5 px-3">1</td>
                    <td className="py-2.5 px-3 font-medium">{project.project_title}</td>
                    <td className="py-2.5 px-3">—</td>
                    <td className="py-2.5 px-3">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div>
              {project.notes && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <div className="text-xs font-bold uppercase text-slate-400 mb-1">Notes</div>
                  <p className="text-xs text-slate-600 whitespace-pre-line">{project.notes}</p>
                </div>
              )}
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Total Project Amount</span>
                <span className="font-bold text-slate-900">{formatINR(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">
                  Advance ({project.advance_confirmed ? "Confirmed" : "Pending"})
                </span>
                <span className="font-bold text-emerald-700">{formatINR(advance)}</span>
              </div>
              <div className="border-t border-slate-300 pt-2 flex justify-between text-base">
                <span className="font-bold text-indigo-700">Balance Payable</span>
                <span className="font-bold text-indigo-700">{formatINR(balance)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="border-t border-slate-200 pt-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Terms &amp; Conditions
            </div>
            <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {project.terms_and_conditions || settings.default_terms}
            </p>
          </div>

          {/* Signature Block */}
          <div className="flex justify-end pt-6">
            <div className="text-center w-56">
              {settings.signature_data_url ? (
                <img
                  src={settings.signature_data_url}
                  alt={settings.signer_name}
                  className="h-12 mx-auto object-contain mb-1"
                />
              ) : (
                <div className="font-serif italic text-2xl text-slate-800 mb-1">
                  {settings.signer_name}
                </div>
              )}
              <div className="border-t border-slate-400 pt-1.5">
                <div className="text-sm font-bold text-slate-900">{settings.signer_name}</div>
                <div className="text-xs text-slate-500">{settings.signer_title}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
