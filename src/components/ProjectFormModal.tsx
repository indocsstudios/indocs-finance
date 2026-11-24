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
  const [clientName, setClientName] = useState(initialProject?.client_name || "");
  const [clientEmail, setClientEmail] = useState(initialProject?.client_email || "");
  const [clientPhone, setClientPhone] = useState(initialProject?.client_phone || "");
  const [projectTitle, setProjectTitle] = useState(initialProject?.project_title || "");
  const [totalAmount, setTotalAmount] = useState(String(initialProject?.total_amount ?? ""));
  const [advanceAmount, setAdvanceAmount] = useState(String(initialProject?.advance_amount ?? ""));
  const [advanceConfirmed, setAdvanceConfirmed] = useState(initialProject?.advance_confirmed ?? false);
  const [advanceReceivedDate, setAdvanceReceivedDate] = useState(initialProject?.advance_received_date || "");
  const [bookingConfirmedDate, setBookingConfirmedDate] = useState(
    initialProject?.booking_confirmed_date || new Date().toISOString().slice(0, 10)
  );
  const [settlementDate, setSettlementDate] = useState(initialProject?.settlement_date || "");
  const [paymentMode, setPaymentMode] = useState(initialProject?.payment_mode || "UPI / Bank Transfer");
  const [notes, setNotes] = useState(initialProject?.notes || "");
  const [terms, setTerms] = useState(initialProject?.terms_and_conditions || settings.default_terms);

  const [events, setEvents] = useState<ProjectEvent[]>(
    initialProject?.project_events && initialProject.project_events.length > 0
      ? initialProject.project_events
      : [{ event_name: "", event_date: "", venue: "", event_budget: null }]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const balance = Math.max(0, Number(totalAmount || 0) - Number(advanceAmount || 0));

  function updateEvent(index: number, field: keyof ProjectEvent, value: string) {
    setEvents((prev) =>
      prev.map((ev, i) =>
        i === index
          ? {
              ...ev,
              [field]: field === "event_budget" ? (value === "" ? null : Number(value)) : value,
            }
          : ev
      )
    );
  }

  function addEventRow() {
    setEvents((prev) => [...prev, { event_name: "", event_date: "", venue: "", event_budget: null }]);
  }

  function removeEventRow(index: number) {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const url = initialProject ? `/api/projects/${initialProject.id}` : "/api/projects";
      const method = initialProject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          project_title: projectTitle,
          total_amount: Number(totalAmount || 0),
          advance_amount: Number(advanceAmount || 0),
          advance_confirmed: advanceConfirmed,
          advance_received_date: advanceReceivedDate || null,
          booking_confirmed_date: bookingConfirmedDate || null,
          settlement_date: settlementDate || null,
          payment_mode: paymentMode,
          notes,
          terms_and_conditions: terms,
          events,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save project.");
      } else {
        onSaved(data.project);
      }
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 text-white">
          <div>
            <h2 className="font-semibold text-base">
              {initialProject ? `Edit Project — ${initialProject.receipt_number}` : "New Client Project & Receipt"}
            </h2>
            <p className="text-xs text-zinc-400">
              Saving will automatically generate the downloadable Indox Media receipt.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Client Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Name *</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Bhavna"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title *</label>
              <input
                type="text"
                required
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Wedding Photography & Film"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Client Phone</label>
              <input
                type="text"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Multi-Event Schedule */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Event Dates &amp; Shoots</h3>
                <p className="text-xs text-slate-500">
                  Add 1, 2, or more event dates (e.g. 19 Feb 2027 &amp; 20 Feb 2027) under this single receipt.
                </p>
              </div>
              <button
                type="button"
                onClick={addEventRow}
                className="flex items-center gap-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition"
              >
                <Plus className="h-3.5 w-3.5" /> Add Event
              </button>
            </div>

            {events.map((ev, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
                <div className="sm:col-span-4">
                  <input
                    type="text"
                    required
                    value={ev.event_name}
                    onChange={(e) => updateEvent(idx, "event_name", e.target.value)}
                    placeholder="Event name (e.g. Haldi & Mehndi)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="date"
                    required
                    value={ev.event_date}
                    onChange={(e) => updateEvent(idx, "event_date", e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    value={ev.venue || ""}
                    onChange={(e) => updateEvent(idx, "venue", e.target.value)}
                    placeholder="Venue (opt)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    value={ev.event_budget ?? ""}
                    onChange={(e) => updateEvent(idx, "event_budget", e.target.value)}
                    placeholder="Budget (opt)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  {events.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEventRow(idx)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Financials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Project Amount (INR) *</label>
              <input
                type="number"
                min="0"
                required
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Amount (INR) *</label>
              <input
                type="number"
                min="0"
                required
                value={advanceAmount}
                onChange={(e) => setAdvanceAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase">Balance Payable</span>
              <span className="text-lg font-bold text-indigo-900">{formatINR(balance)}</span>
            </div>
          </div>

          {/* Dates & Advance Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Booking Confirmed Date</label>
              <input
                type="date"
                value={bookingConfirmedDate}
                onChange={(e) => setBookingConfirmedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Advance Received Date</label>
              <input
                type="date"
                value={advanceReceivedDate}
                onChange={(e) => setAdvanceReceivedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Date</label>
              <input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="UPI / Bank Transfer">UPI / Bank Transfer</option>
                <option value="Bank Transfer (NEFT/IMPS)">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 mt-4 sm:mt-5">
              <input
                type="checkbox"
                checked={advanceConfirmed}
                onChange={(e) => setAdvanceConfirmed(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              <span className="text-sm font-semibold text-slate-800">
                Advance Payment Confirmed
              </span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Project Notes (optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Deliverables summary, team size, special requests..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Terms &amp; Conditions (Pre-filled from Indox Media Defaults)
            </label>
            <textarea
              rows={4}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : initialProject ? "Update & View Receipt" : "Save & Generate Receipt"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
