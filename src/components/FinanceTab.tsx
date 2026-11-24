"use client";

import { useState, useMemo } from "react";
import {
  Plus, Trash2, Edit3, Image as ImageIcon, TrendingUp, TrendingDown,
  Wallet, X, Camera, ArrowRightLeft, Loader2, Users, UserCheck, IndianRupee, CheckCircle2,
} from "lucide-react";
import type { FinanceTransaction, Project, SessionUser, VendorBooking } from "@/lib/types";
import { VENDOR_ROLES } from "@/lib/constants";
import { formatDate, formatINR, getProjectFinancials } from "@/lib/format";

interface Props {
  user: SessionUser;
  projects: Project[];
  transactions: FinanceTransaction[];
  vendorBookings: VendorBooking[];
  cashHolders: string[];
  preselectedProjectId?: string | null;
  onClearPreselected?: () => void;
  onTransactionsChange: (txs: FinanceTransaction[]) => void;
  onVendorBookingsChange: (vbs: VendorBooking[]) => void;
}

const EXPENSE_CATEGORIES = [
  "Crew / Freelancer Payout",
  "Camera / Gear Rental",
  "Equipment Purchase",
  "Travel / Fuel / Cab",
  "Food & Stay",
  "Editing / Post-Production",
  "Album / Printing / Hard Drive",
  "Studio / Software / Misc",
];

const INCOME_CATEGORIES = ["Other Client Income", "Equipment Rent Out", "Refund Received", "Misc Income"];

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1000;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FinanceTab({
  user, projects, transactions, vendorBookings, cashHolders,
  preselectedProjectId, onClearPreselected, onTransactionsChange, onVendorBookingsChange,
}: Props) {
  // Unique cash holders directly from your Supabase team_members + Company Bank / UPI (zero duplicates!)
  const holders = useMemo(
    () => Array.from(new Set([...cashHolders, "Company Bank / UPI"])).filter(Boolean),
    [cashHolders]
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || "all");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);

  // Expense / Income / Transfer Modal State
  const [showModal, setShowModal] = useState(Boolean(preselectedProjectId));
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txType, setTxType] = useState<"expense" | "income" | "transfer">("expense");
  const [projectId, setProjectId] = useState<string>(preselectedProjectId || "");
  const [vendorBookingId, setVendorBookingId] = useState<string>("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState(user.full_name);
  const [transferTo, setTransferTo] = useState(holders.find((h) => h !== user.full_name) || holders[0] || "");
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add / Edit Cameraman / Vendor Booking Modal State
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorBooking | null>(null);
  const [vProjectId, setVProjectId] = useState<string>("");
  const [vName, setVName] = useState("");
  const [vRole, setVRole] = useState(VENDOR_ROLES[0]);
  const [vPhone, setVPhone] = useState("");
  const [vAgreed, setVAgreed] = useState("");
  const [vInitialPaid, setVInitialPaid] = useState("");
  const [vPaidBy, setVPaidBy] = useState(user.full_name);
  const [vDueDate, setVDueDate] = useState("");
  const [vNotes, setVNotes] = useState("");
  const [vProofUrl, setVProofUrl] = useState<string | null>(null);
  const [savingVendor, setSavingVendor] = useState(false);

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  function openAddForProject(pid = "", defaultType: "expense" | "income" | "transfer" = "expense") {
    setEditingTx(null);
    setVendorBookingId("");
    setTxType(defaultType);
    setProjectId(pid);
    setCategory(defaultType === "income" ? INCOME_CATEGORIES[0] : defaultType === "transfer" ? "Team Cash Handover" : EXPENSE_CATEGORIES[0]);
    setTitle(defaultType === "transfer" ? "Cash / UPI Handover" : "");
    setAmount("");
    setTxDate(new Date().toISOString().slice(0, 10));
    setPaidBy(user.full_name);
    setTransferTo(holders.find((h) => h !== user.full_name) || holders[0] || "");
    setPaymentMode("UPI");
    setNotes("");
    setProofUrl(null);
    setShowModal(true);
  }

  function openPayVendorInstallment(vb: VendorBooking, remainingDue: number) {
    setEditingTx(null);
    setVendorBookingId(vb.id);
    setTxType("expense");
    setProjectId(vb.project_id || "");
    setCategory(vb.role_service || "Crew / Freelancer Payout");
    setTitle(`${vb.vendor_name} (${vb.role_service}) — Payout`);
    setAmount(remainingDue > 0 ? String(remainingDue) : "");
    setTxDate(new Date().toISOString().slice(0, 10));
    setPaidBy(user.full_name);
    setPaymentMode("UPI");
    setNotes("");
    setProofUrl(null);
    setShowModal(true);
  }

  function openEditModal(t: FinanceTransaction) {
    setEditingTx(t);
    setVendorBookingId(t.vendor_booking_id || "");
    setTxType(t.tx_type);
    setProjectId(t.project_id || "");
    setCategory(t.category);
    setTitle(t.title);
    setAmount(String(t.amount));
    setTxDate(t.tx_date);
    setPaidBy(t.paid_by || user.full_name);
    setTransferTo(t.transfer_to || holders[0] || "");
    setPaymentMode(t.payment_mode || "UPI");
    setNotes(t.notes || "");
    setProofUrl(t.proof_image_url);
    setShowModal(true);
  }

  function openNewVendorModal(pid = "") {
    setEditingVendor(null);
    setVProjectId(pid);
    setVName(""); setVRole(VENDOR_ROLES[0]); setVPhone("");
    setVAgreed(""); setVInitialPaid(""); setVPaidBy(user.full_name);
    setVDueDate(""); setVNotes(""); setVProofUrl(null);
    setShowVendorModal(true);
  }

  function openEditVendorModal(vb: VendorBooking) {
    setEditingVendor(vb);
    setVProjectId(vb.project_id || "");
    setVName(vb.vendor_name); setVRole(vb.role_service); setVPhone(vb.phone || "");
    setVAgreed(String(vb.agreed_amount)); setVInitialPaid("");
    setVDueDate(vb.due_date || ""); setVNotes(vb.notes || ""); setVProofUrl(null);
    setShowVendorModal(true);
  }

  // Vendor Payables Stats
  const vendorStats = useMemo(() => {
    return vendorBookings.map((vb) => {
      const paid = transactions
        .filter((t) => t.vendor_booking_id === vb.id && t.tx_type === "expense")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const agreed = Number(vb.agreed_amount || 0);
      const remaining = Math.max(0, agreed - paid);
      return { booking: vb, agreed, paid, remaining, isSettled: agreed > 0 && remaining === 0 };
    });
  }, [vendorBookings, transactions]);

  const totalVendorPayable = useMemo(
    () => vendorStats.reduce((s, v) => s + v.remaining, 0),
    [vendorStats]
  );

  // Company-wide Cashflow Summary
  const summary = useMemo(() => {
    let clientCollected = 0;
    let clientPending = 0;
    projects.forEach((p) => {
      const f = getProjectFinancials(p);
      clientCollected += f.totalPaid;
      clientPending += f.remaining;
    });
    const extraIncome = transactions.filter((t) => t.tx_type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalExpenses = transactions.filter((t) => t.tx_type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
    return {
      totalInflow: clientCollected + extraIncome,
      totalExpenses,
      netProfit: clientCollected + extraIncome - totalExpenses,
      clientPending,
    };
  }, [projects, transactions]);

  // "Paise Kiske Pass Hai?" — Clean Unique Team Custody
  const custodyBalances = useMemo(() => {
    const map = new Map<string, { received: number; spent: number; balance: number }>();
    const add = (person: string | null | undefined, deltaRec: number, deltaSpent: number) => {
      const key = (person || "Unassigned").trim();
      const cur = map.get(key) || { received: 0, spent: 0, balance: 0 };
      cur.received += deltaRec;
      cur.spent += deltaSpent;
      cur.balance = cur.received - cur.spent;
      map.set(key, cur);
    };

    holders.forEach((h) => map.set(h, { received: 0, spent: 0, balance: 0 }));

    projects.forEach((p) => {
      if (p.advance_confirmed && Number(p.advance_amount || 0) > 0) {
        add(p.advance_received_by || holders[0], Number(p.advance_amount), 0);
      }
      if (Number(p.final_payment_amount || 0) > 0) {
        add(p.final_payment_received_by || holders[0], Number(p.final_payment_amount), 0);
      }
    });

    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.tx_type === "expense") add(t.paid_by, 0, amt);
      else if (t.tx_type === "income") add(t.paid_by, amt, 0);
      else if (t.tx_type === "transfer" && t.paid_by !== t.transfer_to) {
        add(t.paid_by, 0, amt);
        add(t.transfer_to, amt, 0);
      }
    });

    return Array.from(map.entries()).map(([name, stats]) => ({ name, ...stats }));
  }, [projects, transactions, holders]);

  const projectPnL = useMemo(() => {
    return projects.map((p) => {
      const f = getProjectFinancials(p);
      const pExpenses = transactions.filter((t) => t.project_id === p.id && t.tx_type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
      const pExtra = transactions.filter((t) => t.project_id === p.id && t.tx_type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
      const pVendorDue = vendorStats.filter((v) => v.booking.project_id === p.id).reduce((s, v) => s + v.remaining, 0);
      const earned = f.totalPaid + pExtra;
      const net = earned - pExpenses;
      return { project: p, agreed: f.total, earned, expenses: pExpenses, vendorDue: pVendorDue, net, margin: earned > 0 ? Math.round((net / earned) * 100) : 0 };
    });
  }, [projects, transactions, vendorStats]);

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      const matchProj = selectedProjectId === "all" || (selectedProjectId === "general" && !t.project_id) || t.project_id === selectedProjectId;
      const matchType = typeFilter === "all" || t.tx_type === typeFilter;
      return matchProj && matchType;
    });
  }, [transactions, selectedProjectId, typeFilter]);

  async function handleSaveTx(e: React.FormEvent) {
    e.preventDefault();
    if (txType === "transfer" && paidBy === transferTo) {
      alert("From aur To same person nahi ho sakte! Alag naam select karein.");
      return;
    }
    setSaving(true);
    try {
      const url = editingTx ? `/api/finance/${editingTx.id}` : "/api/finance";
      const res = await fetch(url, {
        method: editingTx ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: txType === "transfer" ? null : projectId || null,
          vendor_booking_id: vendorBookingId || null,
          tx_type: txType, category, title, amount: Number(amount), tx_date: txDate,
          paid_by: paidBy, transfer_to: txType === "transfer" ? transferTo : null,
          payment_mode: paymentMode, notes, proof_image_url: proofUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.transaction) {
        if (editingTx) onTransactionsChange(transactions.map((x) => (x.id === editingTx.id ? data.transaction : x)));
        else onTransactionsChange([data.transaction, ...transactions]);
        setShowModal(false); onClearPreselected?.();
      } else alert(data.error || "Failed to save.");
    } finally { setSaving(false); }
  }

  async function handleSaveVendor(e: React.FormEvent) {
    e.preventDefault(); setSavingVendor(true);
    try {
      const url = editingVendor ? `/api/vendors/${editingVendor.id}` : "/api/vendors";
      const res = await fetch(url, {
        method: editingVendor ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: vProjectId || null, vendor_name: vName, role_service: vRole,
          phone: vPhone, agreed_amount: Number(vAgreed), due_date: vDueDate || null,
          notes: vNotes, initial_paid: editingVendor ? 0 : Number(vInitialPaid || 0),
          paid_by: vPaidBy, proof_image_url: vProofUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.booking) {
        if (editingVendor) onVendorBookingsChange(vendorBookings.map((x) => (x.id === editingVendor.id ? data.booking : x)));
        else onVendorBookingsChange([data.booking, ...vendorBookings]);
        if (data.transaction) onTransactionsChange([data.transaction, ...transactions]);
        setShowVendorModal(false);
      } else alert(data.error || "Failed to save booking.");
    } finally { setSavingVendor(false); }
  }

  async function handleDeleteVendor(id: string) {
    if (!confirm("Delete this crew/vendor booking?")) return;
    setDeletingVendorId(id);
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      if (res.ok) onVendorBookingsChange(vendorBookings.filter((v) => v.id !== id));
    } finally { setDeletingVendorId(null); }
  }

  async function handleDeleteTx(id: string) {
    if (!confirm("Delete this finance entry?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
      if (res.ok) onTransactionsChange(transactions.filter((t) => t.id !== id));
    } finally { setDeletingId(null); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111318] text-white p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold">Internal Finance, Khata &amp; Crew Payables</h2>
          <p className="text-xs text-zinc-400">
            Kitne paise aaye, kitna kharcha hua, paise kiske pass hain, aur cameraman/vendors ko kitna dena baaki hai — sab ek jagah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openNewVendorModal()}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold">
            <UserCheck className="h-4 w-4" /> + Book Cameraman / Vendor
          </button>
          <button onClick={() => openAddForProject("", "transfer")}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold">
            <ArrowRightLeft className="h-4 w-4 text-teal-400" /> Team Transfer
          </button>
          <button onClick={() => openAddForProject("", "expense")}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold">
            <Plus className="h-4 w-4" /> Add Expense / Income
          </button>
        </div>
      </div>

      {/* 5 Cashflow KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> Paise Aaye</div>
          <div className="text-xl font-extrabold text-emerald-700 mt-1">{formatINR(summary.totalInflow)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1"><TrendingDown className="h-3.5 w-3.5 text-rose-600" /> Total Kharcha</div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">{formatINR(summary.totalExpenses)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1"><Wallet className="h-3.5 w-3.5 text-teal-600" /> Cash in Hand</div>
          <div className={`text-xl font-extrabold mt-1 ${summary.netProfit >= 0 ? "text-teal-700" : "text-rose-700"}`}>{formatINR(summary.netProfit)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase">Clients se Aana Baaki</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{formatINR(summary.clientPending)}</div>
        </div>
        <div className="bg-white rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-rose-700 uppercase">Crew/Vendors ko Dena Baaki</div>
          <div className="text-xl font-extrabold text-rose-700 mt-1">{formatINR(totalVendorPayable)}</div>
        </div>
      </div>

      {/* PAISE KISKE PASS HAI? */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-teal-600" /> Paise Kiske Pass Hai? (Live Team Cash Custody)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {custodyBalances.map((c) => (
            <div key={c.name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-bold text-slate-700">{c.name}</div>
              <div className={`text-xl font-extrabold mt-1 ${c.balance >= 0 ? "text-teal-700" : "text-rose-600"}`}>{formatINR(c.balance)}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>In: {formatINR(c.received)}</span><span>Out: {formatINR(c.spent)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW: CAMERAMAN / CREW / VENDOR BOOKINGS & DENA BAAKI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-amber-600" /> Cameraman, Crew &amp; Vendor Bookings (Kisko Kitna Dena Baaki Hai)
            </h3>
            <p className="text-xs text-slate-500">e.g. Cameraman total ₹25,000, abhi ₹1,000 advance diya → ₹24,000 dena baaki</p>
          </div>
          <button onClick={() => openNewVendorModal()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-semibold">
            <Plus className="h-3.5 w-3.5" /> Add Cameraman / Vendor
          </button>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Cameraman / Vendor</th>
              <th className="py-3 px-4">Project</th>
              <th className="py-3 px-4 text-right">Total Agreed</th>
              <th className="py-3 px-4 text-right">Abhi Tak Diya</th>
              <th className="py-3 px-4 text-right">Dena Baaki</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendorStats.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No crew/vendor bookings yet. Click &ldquo;Add Cameraman / Vendor&rdquo; to track advances &amp; balances payable.</td></tr>
            ) : (
              vendorStats.map(({ booking: vb, agreed, paid, remaining, isSettled }) => {
                const proj = vb.project_id ? projectMap.get(vb.project_id) : null;
                return (
                  <tr key={vb.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{vb.vendor_name}</div>
                      <div className="text-xs text-slate-500">{vb.role_service}{vb.phone ? ` • ${vb.phone}` : ""}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {proj ? `${proj.client_name} (${proj.project_title})` : <span className="text-slate-400">General Studio</span>}
                      {vb.due_date && <div className="text-[11px] text-slate-400">Due: {formatDate(vb.due_date)}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatINR(agreed)}</td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">{formatINR(paid)}</td>
                    <td className="py-3 px-4 text-right">
                      {isSettled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Settled
                        </span>
                      ) : (
                        <span className="font-extrabold text-rose-600">{formatINR(remaining)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {!isSettled && (
                          <button onClick={() => openPayVendorInstallment(vb, remaining)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                            <IndianRupee className="h-3 w-3" /> + Pay
                          </button>
                        )}
                        <button onClick={() => openEditVendorModal(vb)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"><Edit3 className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteVendor(vb.id)} disabled={deletingVendorId === vb.id}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
                          {deletingVendorId === vb.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Project-wise P&L Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Project-Wise Kamai &amp; Kharcha (Profit &amp; Loss)</h3>
          <span className="text-xs text-slate-500">Click a row to filter its ledger entries below</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Client / Project</th>
              <th className="py-3 px-4 text-right">Package</th>
              <th className="py-3 px-4 text-right">Received</th>
              <th className="py-3 px-4 text-right">Kharcha Paid</th>
              <th className="py-3 px-4 text-right">Crew Due</th>
              <th className="py-3 px-4 text-right">Net Cash</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projectPnL.map((row) => (
              <tr key={row.project.id}
                onClick={() => setSelectedProjectId(selectedProjectId === row.project.id ? "all" : row.project.id)}
                className={`cursor-pointer transition ${selectedProjectId === row.project.id ? "bg-teal-50/70" : "hover:bg-slate-50"}`}>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{row.project.client_name}</div>
                  <div className="text-xs text-slate-500">{row.project.project_title}</div>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">{formatINR(row.agreed)}</td>
                <td className="py-3 px-4 text-right font-semibold text-emerald-700">{formatINR(row.earned)}</td>
                <td className="py-3 px-4 text-right font-semibold text-rose-600">{formatINR(row.expenses)}</td>
                <td className="py-3 px-4 text-right font-semibold text-amber-700">{formatINR(row.vendorDue)}</td>
                <td className={`py-3 px-4 text-right font-bold ${row.net >= 0 ? "text-teal-700" : "text-rose-700"}`}>
                  {formatINR(row.net)}
                </td>
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openAddForProject(row.project.id, "expense")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Kharcha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-sm">Detailed Ledger (All Expenses, Payouts &amp; Transfers)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white">
              <option value="all">All Projects &amp; Studio</option>
              <option value="general">General Studio / Transfers</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.client_name} — {p.project_title}</option>)}
            </select>
            <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
              {(["all", "expense", "income", "transfer"] as const).map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-md capitalize ${typeFilter === t ? "bg-zinc-900 text-white" : "text-slate-600"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Item / Details</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Paid By / Transfer</th>
                <th className="py-3 px-4">Proof</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTx.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-xs">No entries yet.</td></tr>
              ) : (
                filteredTx.map((t) => {
                  const proj = t.project_id ? projectMap.get(t.project_id) : null;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">{formatDate(t.tx_date)}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{t.title}</div>
                        <div className="text-xs text-slate-500">{t.category}{t.notes ? ` • ${t.notes}` : ""}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">{proj ? proj.client_name : <span className="text-slate-400">{t.tx_type === "transfer" ? "Team Handover" : "Studio"}</span>}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {t.tx_type === "transfer" ? <span className="font-semibold text-indigo-700">{t.paid_by} → {t.transfer_to}</span> : <div>{t.paid_by || "—"} <span className="text-slate-400">({t.payment_mode})</span></div>}
                      </td>
                      <td className="py-3 px-4">
                        {t.proof_image_url ? (
                          <button onClick={() => setLightboxImg(t.proof_image_url)} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold">
                            <ImageIcon className="h-3.5 w-3.5" /> View
                          </button>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${t.tx_type === "income" ? "text-emerald-700" : t.tx_type === "transfer" ? "text-indigo-700" : "text-rose-600"}`}>
                        {t.tx_type === "income" ? "+ " : t.tx_type === "transfer" ? "⇄ " : "- "}{formatINR(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openEditModal(t)} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"><Edit3 className="h-4 w-4" /></button>
                          <button onClick={() => handleDeleteTx(t.id)} disabled={deletingId === t.id} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
                            {deletingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Cameraman / Vendor Booking Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#111318] text-white">
              <h3 className="font-semibold text-sm">{editingVendor ? "Edit Cameraman / Vendor Booking" : "Book Cameraman / Crew / Rental Vendor"}</h3>
              <button onClick={() => setShowVendorModal(false)} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveVendor} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project (optional)</label>
                <select value={vProjectId} onChange={(e) => setVProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="">General Studio</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.client_name} — {p.project_title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cameraman / Vendor Name *</label>
                  <input type="text" required value={vName} onChange={(e) => setVName(e.target.value)} placeholder="e.g. Rahul Cameraman"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Service</label>
                  <select value={vRole} onChange={(e) => setVRole(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {VENDOR_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Agreed Fee (INR) *</label>
                  <input type="number" min="1" required value={vAgreed} onChange={(e) => setVAgreed(e.target.value)} placeholder="e.g. 25000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (optional)</label>
                  <input type="text" value={vPhone} onChange={(e) => setVPhone(e.target.value)} placeholder="+91 98XXXXXXXX"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>

              {!editingVendor && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-3">
                  <div className="text-xs font-bold text-amber-900">Abhi Kitna Advance Diya? (Auto-logged in Kharcha &amp; Custody)</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Advance Paid Now (INR)</label>
                      <input type="number" min="0" value={vInitialPaid} onChange={(e) => setVInitialPaid(e.target.value)} placeholder="e.g. 1000"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Kisne Diya (Paid By)</label>
                      <select value={vPaidBy} onChange={(e) => setVPaidBy(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                        {holders.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center justify-center gap-2 border border-dashed border-amber-400 rounded-lg p-2.5 cursor-pointer bg-white">
                    <Camera className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-semibold text-slate-600">{vProofUrl ? "Proof attached!" : "Upload advance UPI screenshot (optional)"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) setVProofUrl(await compressImage(e.target.files[0])); }} />
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Balance Due Date</label>
                  <input type="date" value={vDueDate} onChange={(e) => setVDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                  <input type="text" value={vNotes} onChange={(e) => setVNotes(e.target.value)} placeholder="2 days shoot, Sony FX3..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowVendorModal(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button type="submit" disabled={savingVendor}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2 disabled:opacity-60">
                  {savingVendor && <Loader2 className="h-4 w-4 animate-spin" />}
                  {savingVendor ? "Saving..." : editingVendor ? "Update Booking" : "Save Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Finance Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#111318] text-white">
              <h3 className="font-semibold text-sm">{editingTx ? "Edit Finance Entry" : vendorBookingId ? "Pay Cameraman / Vendor Installment" : "Add Expense / Income / Team Transfer"}</h3>
              <button onClick={() => { setShowModal(false); onClearPreselected?.(); }} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveTx} className="p-6 space-y-4">
              {!vendorBookingId && (
                <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
                  <button type="button" onClick={() => { setTxType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}
                    className={`flex-1 py-2 rounded-md ${txType === "expense" ? "bg-rose-600 text-white" : "text-slate-600"}`}>Kharcha (-)</button>
                  <button type="button" onClick={() => { setTxType("income"); setCategory(INCOME_CATEGORIES[0]); }}
                    className={`flex-1 py-2 rounded-md ${txType === "income" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>Income (+)</button>
                  <button type="button" onClick={() => { setTxType("transfer"); setCategory("Team Cash Handover"); }}
                    className={`flex-1 py-2 rounded-md ${txType === "transfer" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Transfer (⇄)</button>
                </div>
              )}

              {txType !== "transfer" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project</label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    <option value="">General Studio Expense</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.client_name} — {p.project_title}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                  <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {txType === "transfer" ? "Kisne Diye (From)" : txType === "income" ? "Kisko Mile" : "Kisne Diye (Paid By)"}
                  </label>
                  <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {holders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {txType === "transfer" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kisko Diye (To)</label>
                    <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      {holders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Photo Proof (Bill / UPI Screenshot)</label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-3.5 cursor-pointer hover:border-teal-500 bg-slate-50">
                  <Camera className="h-5 w-5 text-teal-600" />
                  <span className="text-xs font-semibold text-slate-600">{proofUrl ? "Photo attached! Click to replace" : "Upload bill / payment screenshot"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => { if (e.target.files?.[0]) setProofUrl(await compressImage(e.target.files[0])); }} />
                </label>
                {proofUrl && <img src={proofUrl} alt="Proof" className="h-20 mt-2 rounded-lg border object-contain" />}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); onClearPreselected?.(); }} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : editingTx ? "Update Entry" : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)} className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer">
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxImg(null)} className="absolute -top-10 right-0 text-white flex items-center gap-1 text-sm font-semibold">
              <X className="h-5 w-5" /> Close
            </button>
            <img src={lightboxImg} alt="Proof" className="max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
