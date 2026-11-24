"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Image as ImageIcon, TrendingUp, TrendingDown, Wallet, X, Camera } from "lucide-react";
import type { FinanceTransaction, Project, SessionUser } from "@/lib/types";
import { formatDate, formatINR, getProjectFinancials } from "@/lib/format";

interface Props {
  user: SessionUser;
  projects: Project[];
  transactions: FinanceTransaction[];
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

// Compress uploaded bill/UPI screenshot in browser so it loads super fast from Supabase
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
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FinanceTab({ user, projects, transactions, onTransactionsChange }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Add Entry Form State
  const [showAdd, setShowAdd] = useState(false);
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [projectId, setProjectId] = useState<string>("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState(user.full_name);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const projectMap = useMemo(() => {
    const m = new Map<string, Project>();
    projects.forEach((p) => m.set(p.id, p));
    return m;
  }, [projects]);

  // Company-wide totals: Client Payments (from Projects) + Manual Income - Expenses
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
    const totalInflow = clientCollected + extraIncome;
    return {
      totalInflow,
      totalExpenses,
      netProfit: totalInflow - totalExpenses,
      clientPending,
    };
  }, [projects, transactions]);

  // Project-wise Profit & Loss Breakdown
  const projectPnL = useMemo(() => {
    return projects.map((p) => {
      const f = getProjectFinancials(p);
      const pExpenses = transactions
        .filter((t) => t.project_id === p.id && t.tx_type === "expense")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const pExtraIncome = transactions
        .filter((t) => t.project_id === p.id && t.tx_type === "income")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const earned = f.totalPaid + pExtraIncome;
      const net = earned - pExpenses;
      const margin = earned > 0 ? Math.round((net / earned) * 100) : 0;
      return { project: p, agreed: f.total, earned, pending: f.remaining, expenses: pExpenses, net, margin };
    });
  }, [projects, transactions]);

  const filteredTx = useMemo(() => {
    return transactions.filter((t) => {
      const matchProj =
        selectedProjectId === "all" ||
        (selectedProjectId === "general" && !t.project_id) ||
        t.project_id === selectedProjectId;
      const matchType = typeFilter === "all" || t.tx_type === typeFilter;
      return matchProj && matchType;
    });
  }, [transactions, selectedProjectId, typeFilter]);

  async function handleProofFile(file: File | undefined) {
    if (!file) return;
    const compressed = await compressImage(file);
    setProofUrl(compressed);
  }

  async function handleAddTx(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId || null,
          tx_type: txType,
          category,
          title,
          amount: Number(amount),
          tx_date: txDate,
          paid_by: paidBy,
          payment_mode: paymentMode,
          notes,
          proof_image_url: proofUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.transaction) {
        onTransactionsChange([data.transaction, ...transactions]);
        setShowAdd(false);
        setTitle(""); setAmount(""); setNotes(""); setProofUrl(null);
      } else {
        alert(data.error || "Failed to save entry");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTx(id: string) {
    if (!confirm("Delete this finance entry?")) return;
    const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
    if (res.ok) onTransactionsChange(transactions.filter((t) => t.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900 text-white p-5 rounded-2xl">
        <div>
          <h2 className="text-lg font-bold">Internal Finance &amp; Profit Ledger (Private)</h2>
          <p className="text-xs text-zinc-400">
            Kitne paise aaye, kitna kharcha hua, kis project mein kitna profit bacha — photo bills ke saath ek hi jagah.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold">
          <Plus className="h-4 w-4" /> Add Expense / Purchase / Income
        </button>
      </div>

      {/* 4 Cashflow KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-600" /> Total Paise Aaye (Inflow)
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatINR(summary.totalInflow)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Client payments + extra income</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-rose-600" /> Total Kharcha (Outflow)
          </div>
          <div className="text-2xl font-extrabold text-rose-600 mt-1">{formatINR(summary.totalExpenses)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Project + studio expenses</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-teal-600" /> Net Profit / Cash in Hand
          </div>
          <div className={`text-2xl font-extrabold mt-1 ${summary.netProfit >= 0 ? "text-teal-700" : "text-rose-700"}`}>
            {formatINR(summary.netProfit)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Total Inflow minus Outflow</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase">Clients se Aana Baaki</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">{formatINR(summary.clientPending)}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Unpaid client balances</div>
        </div>
      </div>

      {/* Project-wise Profit & Loss Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Project-Wise Kamai &amp; Kharcha (Profit &amp; Loss)</h3>
          <span className="text-xs text-slate-500">Click a project to filter its expenses below</span>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Client / Project</th>
              <th className="py-3 px-4 text-right">Agreed Package</th>
              <th className="py-3 px-4 text-right">Received</th>
              <th className="py-3 px-4 text-right">Kharcha (Expenses)</th>
              <th className="py-3 px-4 text-right">Net Profit</th>
              <th className="py-3 px-4 text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {projectPnL.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-slate-400 text-xs">No projects yet.</td></tr>
            ) : (
              projectPnL.map((row) => (
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
                  <td className={`py-3 px-4 text-right font-bold ${row.net >= 0 ? "text-teal-700" : "text-rose-700"}`}>
                    {formatINR(row.net)}
                  </td>
                  <td className="py-3 px-4 text-right text-xs font-semibold text-slate-600">{row.margin}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expense & Cashflow Ledger with Photo Proofs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900 text-sm">Detailed Expense &amp; Purchase Ledger (with Photo Proofs)</h3>
          <div className="flex flex-wrap items-center gap-2">
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white">
              <option value="all">All Projects &amp; Studio</option>
              <option value="general">General Studio Expenses Only</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.client_name} — {p.project_title}</option>
              ))}
            </select>
            <div className="flex bg-slate-100 rounded-lg p-0.5 text-xs font-semibold">
              {(["all", "expense", "income"] as const).map((t) => (
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
                <th className="py-3 px-4">Item / Kya Liya</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Paid By / Mode</th>
                <th className="py-3 px-4">Photo Proof</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTx.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400 text-xs">No entries yet. Click &ldquo;Add Expense / Purchase / Income&rdquo; to log bills &amp; photo proofs.</td></tr>
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
                        {proj ? `${proj.client_name} (${proj.project_title})` : <span className="text-slate-400">Studio / General</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <div>{t.paid_by || "—"}</div>
                        <div className="text-slate-400">{t.payment_mode}</div>
                      </td>
                      <td className="py-3 px-4">
                        {t.proof_image_url ? (
                          <button onClick={() => setLightboxImg(t.proof_image_url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold">
                            <ImageIcon className="h-3.5 w-3.5" /> View Proof
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No photo</span>
                        )}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold whitespace-nowrap ${t.tx_type === "income" ? "text-emerald-700" : "text-rose-600"}`}>
                        {t.tx_type === "income" ? "+ " : "- "}{formatINR(t.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => handleDeleteTx(t.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense / Income Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#111318] text-white">
              <h3 className="font-semibold text-sm">Log Expense, Purchase or Income</h3>
              <button onClick={() => setShowAdd(false)} className="text-zinc-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleAddTx} className="p-6 space-y-4">
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button type="button" onClick={() => { setTxType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md ${txType === "expense" ? "bg-rose-600 text-white" : "text-slate-600"}`}>
                  Kharcha / Expense (-)
                </button>
                <button type="button" onClick={() => { setTxType("income"); setCategory(INCOME_CATEGORIES[0]); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-md ${txType === "income" ? "bg-emerald-600 text-white" : "text-slate-600"}`}>
                  Extra Income (+)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Link to Project (optional)</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                  <option value="">General Studio / No Specific Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.client_name} — {p.project_title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                    {(txType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (INR) *</label>
                  <input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 3500" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kya Liya / Description *</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sony FX3 Lens Rental / Candid Photographer Payout / Cab"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Paid By</label>
                  <input type="text" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
                  <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs bg-white">
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Photo Proof (Bill / UPI Screenshot / Receipt Photo)
                </label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-teal-500 bg-slate-50">
                  <Camera className="h-5 w-5 text-teal-600" />
                  <span className="text-xs font-semibold text-slate-600">
                    {proofUrl ? "Photo attached! Click to replace" : "Click to upload bill or payment screenshot"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProofFile(e.target.files?.[0])} />
                </label>
                {proofUrl && <img src={proofUrl} alt="Proof" className="h-24 mt-2 rounded-lg border object-contain" />}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Vendor name, invoice #, extra details..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-60">
                  {saving ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Proof Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer">
          <div className="relative max-w-3xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightboxImg(null)}
              className="absolute -top-10 right-0 text-white hover:text-teal-400 flex items-center gap-1 text-sm font-semibold">
              <X className="h-5 w-5" /> Close
            </button>
            <img src={lightboxImg} alt="Bill Proof" className="max-h-[85vh] rounded-xl shadow-2xl object-contain bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
