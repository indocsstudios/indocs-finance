"use client";

import { useState, useMemo } from "react";
import {
  Plus, Trash2, Edit3, Image as ImageIcon, TrendingUp, TrendingDown,
  Wallet, X, Camera, ArrowRightLeft, Loader2, Users,
} from "lucide-react";
import type { FinanceTransaction, Project, SessionUser } from "@/lib/types";
import { DEFAULT_CASH_HOLDERS } from "@/lib/constants";
import { formatDate, formatINR, getProjectFinancials } from "@/lib/format";

interface Props {
  user: SessionUser;
  projects: Project[];
  transactions: FinanceTransaction[];
  cashHolders: string[];
  preselectedProjectId?: string | null;
  onClearPreselected?: () => void;
  onTransactionsChange: (txs: FinanceTransaction[]) => void;
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
  user, projects, transactions, cashHolders, preselectedProjectId, onClearPreselected, onTransactionsChange,
}: Props) {
  const holders = Array.from(new Set([...DEFAULT_CASH_HOLDERS, ...cashHolders]));
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || "all");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income" | "transfer">("all");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState(Boolean(preselectedProjectId));
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txType, setTxType] = useState<"expense" | "income" | "transfer">("expense");
  const [projectId, setProjectId] = useState<string>(preselectedProjectId || "");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState(user.full_name);
  const [transferTo, setTransferTo] = useState(holders[0]);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  function openAddForProject(pid = "", defaultType: "expense" | "income" | "transfer" = "expense") {
    setEditingTx(null);
    setTxType(defaultType);
    setProjectId(pid);
    setCategory(defaultType === "income" ? INCOME_CATEGORIES[0] : defaultType === "transfer" ? "Team Cash Handover" : EXPENSE_CATEGORIES[0]);
    setTitle(defaultType === "transfer" ? "Cash / UPI Handover" : "");
    setAmount("");
    setTxDate(new Date().toISOString().slice(0, 10));
    setPaidBy(user.full_name);
    setTransferTo(holders.find((h) => h !== user.full_name) || holders[0]);
    setPaymentMode("UPI");
    setNotes("");
    setProofUrl(null);
    setShowModal(true);
  }

  function openEditModal(t: FinanceTransaction) {
    setEditingTx(t);
    setTxType(t.tx_type);
    setProjectId(t.project_id || "");
    setCategory(t.category);
    setTitle(t.title);
    setAmount(String(t.amount));
    setTxDate(t.tx_date);
    setPaidBy(t.paid_by || user.full_name);
    setTransferTo(t.transfer_to || holders[0]);
    setPaymentMode(t.payment_mode || "UPI");
    setNotes(t.notes || "");
    setProofUrl(t.proof_image_url);
    setShowModal(true);
  }

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

  // "Paise Kiske Pass Hai?" — Live Per-Person Cash Custody Balance!
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
        add(p.advance_received_by || "Mithilesh Shende", Number(p.advance_amount), 0);
      }
      if (Number(p.final_payment_amount || 0) > 0) {
        add(p.final_payment_received_by || "Mithilesh Shende", Number(p.final_payment_amount), 0);
      }
    });

    transactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.tx_type === "expense") add(t.paid_by, 0, amt);
      else if (t.tx_type === "income") add(t.paid_by, amt, 0);
      else if (t.tx_type === "transfer") {
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
      const earned = f.totalPaid + pExtra;
      const net = earned - pExpenses;
      return { project: p, agreed: f.total, earned, expenses: pExpenses, net, margin: earned > 0 ? Math.round((net / earned) * 100) : 0 };
    });
  }, [projects, transactions]);

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      const matchProj = selectedProjectId === "all" || (selectedProjectId === "general" && !t.project_id) || t.project_id === selectedProjectId;
      const matchType = typeFilter === "all" || t.tx_type === typeFilter;
      return matchProj && matchType;
    });
  }, [transactions, selectedProjectId, typeFilter]);

  async function handleSaveTx(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const url = editingTx ? `/api/finance/${editingTx.id}` : "/api/finance";
      const res = await fetch(url, {
        method: editingTx ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: txType === "transfer" ? null : projectId || null,
          tx_type: txType,
          category,
          title,
          amount: Number(amount),
          tx_date: txDate,
          paid_by: paidBy,
          transfer_to: txType === "transfer" ? transferTo : null,
          payment_mode: paymentMode,
          notes,
          proof_image_url: proofUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.transaction) {
        if (editingTx) {
          onTransactionsChange(transactions.map((x) => (x.id === editingTx.id ? data.transaction : x)));
        } else {
          onTransactionsChange([data.transaction, ...transactions]);
        }
        setShowModal(false);
        onClearPreselected?.();
      } else {
        alert(data.error || "Failed to save.");
      }
    } finally { setSaving(false); }
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
          <h2 className="text-lg font-bold">Internal Finance, Khata &amp; Cash Custody</h2>
          <p className="text-xs text-zinc-400">
            Kis project mein kitna kharcha hua, kisko paise mile, aur abhi paise kiske pass hain — sab ek jagah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => openAddForProject("", "transfer")}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-semibold">
            <ArrowRightLeft className="h-4 w-4 text-amber-400" /> Team Cash Transfer
          </button>
          <button onClick={() => openAddForProject("", "expense")}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-xs font-semibold">
            <Plus className="h-4 w-4" /> Add Expense / Income
          </button>
        </div>
      </div>

      {/* 4 Main Cashflow KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-600" /> Total Paise Aaye</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatINR(summary.totalInflow)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-rose-600" /> Total Kharcha</div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{formatINR(summary.totalExpenses)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5"><Wallet className="h-4 w-4 text-teal-600" /> Net Profit / Cash in Hand</div>
          <div className={`text-2xl font-extrabold mt-1 ${summary.netProfit >= 0 ? "text-teal-700" : "text-rose-700"}`}>{formatINR(summary.netProfit)}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Clients se Aana Baaki</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{formatINR(summary.clientPending)}</div>
        </div>
      </div>

      {/* PAISE KISKE PASS HAI? (Team Cash Custody Cards) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-600" /> Paise Kiske Pass Hai? (Live Team Cash Custody)
            </h3>
            <p className="text-xs text-slate-500">Client se jo paise mile + transfers received minus jo kharcha/transfer unhone kiya</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {custodyBalances.map((c) => (
            <div key={c.name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="text-xs font-bold text-slate-700">{c.name}</div>
              <div className={`text-xl font-extrabold mt-1 ${c.balance >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                {formatINR(c.balance)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                <span>In: {formatINR(c.received)}</span>
                <span>Out: {formatINR(c.spent)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Project-wise Profit & Loss Table WITH direct "+ Add Kharcha" button */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Project-Wise Kamai &amp; Kharcha (Profit &amp; Loss)</h3>
          <span className="text-xs text-slate-500">Click &ldquo;+ Add Kharcha&rdquo; on any project to log its expenses</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Client / Project</th>
              <th className="py-3 px-4 text-right">Package</th>
              <th className="py-3 px-4 text-right">Received</th>
              <th className="py-3 px-4 text-right">Kharcha</th>
              <th className="py-3 px-4 text-right">Net Profit</th>
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
                  <div className="text-xs text-slate-500">{row.project.project_title} • <span className="text-teal-700">{row.project.category || "Shoot"}</span></div>
                </td>
                <td className="py-3 px-4 text-right text-slate-700">{formatINR(row.agreed)}</td>
                <td className="py-3 px-4 text-right font-semibold text-emerald-700">{formatINR(row.earned)}</td>
                <td className="py-3 px-4 text-right font-semibold text-rose-600">{formatINR(row.expenses)}</td>
                <td className={`py-3 px-4 text-right font-bold ${row.net >= 0 ? "text-teal-700" : "text-rose-700"}`}>
                  {formatINR(row.net)} <span className="text-[11px] font-normal text-slate-400">({row.margin}%)</span>
                </td>
                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openAddForProject(row.project.id, "expense")}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add Kharcha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detailed Ledger WITH Edit & Delete + Photo Proofs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-sm">Detailed Ledger (Expenses, Income &amp; Team Transfers)</h3>
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
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-xs">No entries yet. Click &ldquo;Add Kharcha&rdquo; on any project or above.</td></tr>
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
                      <td className="py-3 px-4 text-xs text-slate-700">
                        {proj ? `${proj.client_name}` : <span className="text-slate-400">{t.tx_type === "transfer" ? "Team Handover" : "Studio / General"}</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {t.tx_type === "transfer" ? (
                          <span className="font-semibold text-indigo-700">{t.paid_by} → {t.transfer_to}</span>
                        ) : (
                          <div>{t.paid_by || "—"} <span className="text-slate-400">({t.payment_mode})</span></div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {t.proof_image_url ? (
                          <button onClick={() => setLightboxImg(t.proof_image_url)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold">
                            <ImageIcon className="h-3.5 w-3.5" /> View
                          </button>
                        ) : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        t.tx_type === "income" ? "text-emerald-700" : t.tx_type === "transfer" ? "text-indigo-700" : "text-rose-600"
                      }`}>
                        {t.tx_type === "income" ? "+ " : t.tx_type === "transfer" ? "⇄ " : "- "}{formatINR(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openEditModal(t)} title="Edit" className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteTx(t.id)} disabled={deletingId === t.id} title="Delete"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
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

      {/* Add / Edit Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#111318] text-white">
              <h3 className="font-semibold text-sm">{editingTx ? "Edit Finance Entry" : "Add Expense / Income / Team Transfer"}</h3>
              <button onClick={() => { setShowModal(false); onClearPreselected?.(); }} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveTx} className="p-6 space-y-4">
              <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
                <button type="button" onClick={() => { setTxType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}
                  className={`flex-1 py-2 rounded-md ${txType === "expense" ? "bg-rose-600 text-white" : "text-slate-600"}`}>Kharcha (-)</button>
                <button type="button" onClick={() => { setTxType("income"); setCategory(INCOME_CATEGORIES[0]); }}
                  className={`flex-1 py-2 rounded-md ${txType === "income" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>Income (+)</button>
                <button type="button" onClick={() => { setTxType("transfer"); setCategory("Team Cash Handover"); }}
                  className={`flex-1 py-2 rounded-md ${txType === "transfer" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Transfer (⇄)</button>
              </div>

              {txType !== "transfer" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project (Kis project ka kharcha?)</label>
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
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {(txType === "expense" ? EXPENSE_CATEGORIES : txType === "income" ? INCOME_CATEGORIES : ["Team Cash Handover"]).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                  <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kya Liya / Description *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sony Lens Rental / Freelancer Payout / Cash given to Mithilesh"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {txType === "transfer" ? "Kisne Diye (From)" : txType === "income" ? "Kisko Mile" : "Kisne Kharch Kiye (Paid By)"}
                  </label>
                  <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {holders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                {txType === "transfer" ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kisko Diye (To)</label>
                    <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      {holders.map((h) => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                    <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
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
