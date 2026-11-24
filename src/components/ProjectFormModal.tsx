"use client";

import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { CompanySettings, Project, ProjectEvent } from "@/lib/types";
import { formatINR } from "@/lib/format";

interface Props {
  settings: CompanySettings;
  initialProject?: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export default function ProjectFormModal({ settings, initialProject, onClose, onSaved }: Props) {
  const [receiptType, setReceiptType] = useState(initialProject?.receipt_type || "Final Payment Receipt");
  const [clientName, setClientName] = useState(initialProject?.client_name || "");
  const [clientEmail, setClientEmail] = useState(initialProject?.client_email || "");
  const [clientPhone, setClientPhone] = useState(initialProject?.client_phone || "");
  const [projectTitle, setProjectTitle] = useState(initialProject?.project_title || "");
  const [purpose, setPurpose] = useState(initialProject?.purpose || "Final Wedding Shoot Balance Settlement");

  const [originalAmount, setOriginalAmount] = useState(String(initialProject?.original_amount ?? ""));
  const [discountAmount, setDiscountAmount] = useState(String(initialProject?.discount_amount ?? "0"));
  const [totalAmount, setTotalAmount] = useState(String(initialProject?.total_amount ?? ""));
  const [advanceAmount, setAdvanceAmount] = useState(String(initialProject?.advance_amount ?? ""));
  const [advanceConfirmed, setAdvanceConfirmed] = useState(initialProject?.advance_confirmed ?? true);
  const [advanceReceivedDate, setAdvanceReceivedDate] = useState(initialProject?.advance_received_date || "");
  const [finalPaymentAmount, setFinalPaymentAmount] = useState(String(initialProject?.final_payment_amount ?? "0"));
  const [finalPaymentDate, setFinalPaymentDate] = useState(initialProject?.final_payment_date || "");
  const [bookingConfirmedDate, setBookingConfirmedDate] = useState(
    initialProject?.booking_confirmed_date || new Date().toISOString().slice(0, 10)
  );
  const [settlementDate, setSettlementDate] = useState(initialProject?.settlement_date || "");
  const [paymentAccount, setPaymentAccount] = useState(
    initialProject?.payment_account || settings.default_upi || "9310895844@kotakbank"
  );
  const [terms, setTerms] = useState(initialProject?.terms_and_conditions || settings.default_terms);

  const [events, setEvents] = useState<ProjectEvent[]>(
    initialProject?.project_events && initialProject.project_events.length > 0
      ? initialProject.project_events
      : [{ event_name: "", event_date: "", day_label: "Full Day", venue: "", deliverables: "" }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const totalNum = Number(totalAmount || 0);
  const paidNum = (advanceConfirmed ? Number(advanceAmount || 0) : 0) + Number(finalPaymentAmount || 0);
  const remaining = Math.max(0, totalNum - paidNum);

  function handleOriginalOrDiscountChange(origVal: string, discVal: string) {
    setOriginalAmount(origVal);
    setDiscountAmount(discVal);
    if (origVal !== "") {
      const calc = Math.max(0, Number(origVal || 0) - Number(discVal || 0));
      setTotalAmount(String(calc));
    }
  }

  function updateEvent(index: number, field: keyof ProjectEvent, value: string) {
    setEvents((prev) => prev.map((ev, i) => (i === index ? { ...ev, [field]: value } : ev)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const url = initialProject ? `/api/projects/${initialProject.id}` : "/api/projects";
      const method = initialProject ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_type: receiptType,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          project_title: projectTitle,
          purpose,
          original_amount: originalAmount ? Number(originalAmount) : null,
          discount_amount: Number(discountAmount || 0),
          total_amount: Number(totalAmount || 0),
          advance_amount: Number(advanceAmount || 0),
          advance_confirmed: advanceConfirmed,
          advance_received_date: advanceReceivedDate || null,
          final_payment_amount: Number(finalPaymentAmount || 0),
          final_payment_date: finalPaymentDate || null,
          booking_confirmed_date: bookingConfirmedDate || null,
          settlement_date: settlementDate || null,
          payment_account: paymentAccount,
          terms_and_conditions: terms,
          events,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed to save.");
      else onSaved(data.project);
    } catch { setError("Network error."); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#111318] text-white border-b-2 border-teal-600">
          <div>
            <h2 className="font-semibold text-base">
              {initialProject ? `Edit Project — ${initialProject.receipt_number}` : "New Client Project & Detailed Receipt"}
            </h2>
            <p className="text-xs text-zinc-400">Matches Indocs Media official receipt format with full deliverables &amp; settlement breakdown</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Type</label>
              <select value={receiptType} onChange={(e) => setReceiptType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="Booking Advance Receipt">Booking Advance Receipt</option>
                <option value="Final Payment Receipt">Final Payment Receipt</option>
                <option value="Payment Receipt">Payment Receipt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
              <input type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Bhawna Kanojia" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Contact *</label>
              <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 87008 16608" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title *</label>
              <input type="text" required value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Wedding Package" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose (shown on receipt)</label>
              <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Final Wedding Shoot Balance Settlement" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Email (optional)</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
            </div>
          </div>

          {/* Financials */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Package Pricing &amp; Payment Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Original Price (opt)</label>
                <input type="number" min="0" value={originalAmount}
                  onChange={(e) => handleOriginalOrDiscountChange(e.target.value, discountAmount)}
                  placeholder="e.g. 48000" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Discount (opt)</label>
                <input type="number" min="0" value={discountAmount}
                  onChange={(e) => handleOriginalOrDiscountChange(originalAmount, e.target.value)}
                  placeholder="e.g. 3000" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Agreed Package Total *</label>
                <input type="number" min="0" required value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)}
                  placeholder="e.g. 45000" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold" />
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase text-teal-700">Remaining Balance</span>
                <span className="text-lg font-extrabold text-teal-900">
                  {remaining === 0 && totalNum > 0 ? "₹0 (Paid in Full)" : formatINR(remaining)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Advance (INR)</label>
                <input type="number" min="0" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="e.g. 15000" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Date</label>
                <input type="date" value={advanceReceivedDate} onChange={(e) => setAdvanceReceivedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Final Balance Paid (INR)</label>
                <input type="number" min="0" value={finalPaymentAmount} onChange={(e) => setFinalPaymentAmount(e.target.value)}
                  placeholder="e.g. 30000" className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Final Payment Date</label>
                <input type="date" value={finalPaymentDate} onChange={(e) => setFinalPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Date</label>
                <input type="date" value={settlementDate} onChange={(e) => setSettlementDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Confirmed Date</label>
                <input type="date" value={bookingConfirmedDate} onChange={(e) => setBookingConfirmedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Account (UPI)</label>
                <input type="text" value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
              </div>
              <label className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg mt-4 cursor-pointer">
                <input type="checkbox" checked={advanceConfirmed} onChange={(e) => setAdvanceConfirmed(e.target.checked)}
                  className="h-4 w-4 accent-teal-600" />
                <span className="text-xs font-semibold text-slate-800">Advance Confirmed</span>
              </label>
            </div>
          </div>

          {/* Multi-Event Coverage & Deliverables */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Event Coverage &amp; Deliverables</h3>
                <p className="text-xs text-slate-500">Add each shoot day, venue address, and covered camera/deliverables</p>
              </div>
              <button type="button"
                onClick={() => setEvents((p) => [...p, { event_name: "", event_date: "", day_label: "Main Event", venue: "", deliverables: "" }])}
                className="flex items-center gap-1 text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 px-3 py-1.5 rounded-lg">
                <Plus className="h-3.5 w-3.5" /> Add Event Day
              </button>
            </div>

            {events.map((ev, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                  <div className="sm:col-span-3">
                    <input type="date" required value={ev.event_date} onChange={(e) => updateEvent(idx, "event_date", e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <input type="text" value={ev.day_label || ""} onChange={(e) => updateEvent(idx, "day_label", e.target.value)}
                      placeholder="Full Day / Main Event" className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
                  </div>
                  <div className="sm:col-span-6">
                    <input type="text" required value={ev.event_name} onChange={(e) => updateEvent(idx, "event_name", e.target.value)}
                      placeholder="Event Name (e.g. Haldi & Mehandi / Wedding Day)"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-semibold" />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    {events.length > 1 && (
                      <button type="button" onClick={() => setEvents((p) => p.filter((_, i) => i !== idx))} className="text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input type="text" value={ev.venue || ""} onChange={(e) => updateEvent(idx, "venue", e.target.value)}
                    placeholder="Full Venue Address (e.g. Mystique Banquet, Shivaji Marg, New Delhi)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
                  <input type="text" value={ev.deliverables || ""} onChange={(e) => updateEvent(idx, "deliverables", e.target.value)}
                    placeholder="Covered Services & Deliverables (e.g. 1 Camera Traditional Photo, 2 Reels...)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs" />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Notes &amp; Delivery Terms</label>
            <textarea rows={4} value={terms} onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60">
              {saving ? "Saving..." : initialProject ? "Update & View Receipt" : "Save & Generate Receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
