"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, Plus, LogOut, Users, Settings, Wallet, Loader2,
  CheckCircle2, Clock, Search, Download, Edit3, Trash2, Shield, IndianRupee,
} from "lucide-react";
import type { CompanySettings, FinanceTransaction, Project, SessionUser, TeamMember, VendorBooking } from "@/lib/types";
import { DEFAULT_LOGO_URL } from "@/lib/constants";
import { formatDate, formatINR, getProjectFinancials } from "@/lib/format";
import { downloadReceiptPDF } from "@/lib/pdf";
import ProjectFormModal from "./ProjectFormModal";
import ReceiptPreviewModal from "./ReceiptPreviewModal";
import FinanceTab from "./FinanceTab";

interface Props {
  user: SessionUser;
  initialProjects: Project[];
  initialSettings: CompanySettings;
  initialMembers: TeamMember[];
  initialTransactions: FinanceTransaction[];
  initialVendorBookings: VendorBooking[];
}

export default function DashboardClient({
  user, initialProjects, initialSettings, initialMembers, initialTransactions, initialVendorBookings,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"projects" | "finance" | "team" | "settings">("projects");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(initialTransactions);
  const [vendorBookings, setVendorBookings] = useState<VendorBooking[]>(initialVendorBookings);
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [preselectedFinanceProject, setPreselectedFinanceProject] = useState<string | null>(null);

  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [downloadingProjectId, setDownloadingProjectId] = useState<string | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<CompanySettings>(initialSettings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState("");

  const cashHolders = useMemo(() => members.map((m) => m.full_name), [members]);
  const logoSrc = settings.logo_data_url || DEFAULT_LOGO_URL;

  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) =>
        p.client_name.toLowerCase().includes(search.toLowerCase()) ||
        p.project_title.toLowerCase().includes(search.toLowerCase()) ||
        (p.category || "").toLowerCase().includes(search.toLowerCase()) ||
        p.receipt_number.toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Delete this project and its receipt permanently?")) return;
    setDeletingProjectId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) setProjects((prev) => prev.filter((p) => p.id !== id));
    } finally { setDeletingProjectId(null); }
  }

  async function handleQuickDownload(p: Project) {
    setDownloadingProjectId(p.id);
    try { await downloadReceiptPDF(p, settings); } finally { setDownloadingProjectId(null); }
  }

  async function handleToggleMember(id: string, field: "is_approved" | "role", value: boolean | string) {
    setUpdatingMemberId(id);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      const data = await res.json();
      if (res.ok && data.member) setMembers((prev) => prev.map((m) => (m.id === id ? data.member : m)));
    } finally { setUpdatingMemberId(null); }
  }

  function handleImageUpload(field: "logo_data_url" | "signature_data_url", file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSettingsDraft((prev) => ({ ...prev, [field]: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault(); setSavingSettings(true); setSettingsSavedMsg("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settingsDraft),
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings); setSettingsDraft(data.settings);
        setSettingsSavedMsg("Indocs Media defaults saved!");
      }
    } finally { setSavingSettings(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-8">
      {/* Top Navbar */}
      <header className="bg-[#111318] text-white sticky top-0 z-30 shadow-md border-b-2 border-teal-600">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logoSrc} alt="Indocs Media" className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-lg bg-black/30 p-0.5 shrink-0" />
            <div className="truncate">
              <div className="font-bold tracking-tight text-sm sm:text-base leading-tight">INDOCS MEDIA</div>
              <div className="text-[11px] text-zinc-400 truncate">
                Shri Harivansh, <span className="text-white font-semibold">{user.full_name}</span>
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1.5">
            <button onClick={() => setTab("projects")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === "projects" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
              <FileText className="h-4 w-4" /> Projects &amp; Docs
            </button>
            <button onClick={() => setTab("finance")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === "finance" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
              <Wallet className="h-4 w-4" /> Finance &amp; Khata
            </button>
            {user.role === "admin" && (
              <>
                <button onClick={() => setTab("team")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === "team" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                  <Users className="h-4 w-4" /> Team
                </button>
                <button onClick={() => setTab("settings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${tab === "settings" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                  <Settings className="h-4 w-4" /> Defaults
                </button>
              </>
            )}
          </div>

          <button onClick={handleLogout} disabled={loggingOut}
            className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-red-600 text-zinc-200 flex items-center gap-1 shrink-0 disabled:opacity-50">
            {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-8">
        {/* PROJECTS TAB */}
        {tab === "projects" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Shri Harivansh, {user.full_name}</h1>
                <p className="text-xs sm:text-sm text-slate-500">Wedding, Ad Shoot, YouTube &amp; Brand projects — Quotation, Booking &amp; Final Receipts.</p>
              </div>
              <button onClick={() => { setEditingProject(null); setShowForm(true); }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
                <Plus className="h-4 w-4" /> New Client Project
              </button>
            </div>

            <div className="relative w-full sm:max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client, category, receipt #..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-600" />
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden space-y-3">
              {filteredProjects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
                  No projects yet. Tap <strong>New Client Project</strong> to start.
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const f = getProjectFinancials(p);
                  const pExp = transactions.filter((t) => t.project_id === p.id && t.tx_type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
                  return (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-base font-bold text-slate-900">{p.client_name}</div>
                          <div className="text-xs text-slate-500">{p.project_title}</div>
                          <span className="inline-block mt-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                            {p.category || "Creative Production"}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-[11px] font-semibold text-slate-500">{p.receipt_number}</div>
                          <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {p.receipt_type || "Quotation"}
                          </span>
                        </div>
                      </div>

                      {(p.project_events || []).length > 0 && (
                        <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 space-y-1">
                          {p.project_events.map((ev, i) => (
                            <div key={i}><strong>{formatDate(ev.event_date)}</strong> — {ev.event_name}</div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 rounded-xl p-2.5">
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Package</div>
                          <div className="text-xs font-bold text-slate-900">{formatINR(f.total)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Paid</div>
                          <div className="text-xs font-bold text-emerald-700">{formatINR(f.totalPaid)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 uppercase">Kharcha</div>
                          <div className="text-xs font-bold text-rose-600">{formatINR(pExp)}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {f.isPaidInFull ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"><CheckCircle2 className="h-3.5 w-3.5" /> Paid in Full</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700"><Clock className="h-3.5 w-3.5" /> Due: {formatINR(f.remaining)}</span>
                        )}
                        <button onClick={() => { setPreselectedFinanceProject(p.id); setTab("finance"); }}
                          className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                          + Add Kharcha
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                        <button onClick={() => setPreviewProject(p)}
                          className="col-span-2 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold text-center">
                          Docs / PDF
                        </button>
                        <button onClick={() => { setEditingProject(p); setShowForm(true); }}
                          className="py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1">
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDeleteProject(p.id)} disabled={deletingProjectId === p.id}
                          className="py-2 rounded-lg bg-red-50 text-red-600 text-xs font-semibold flex items-center justify-center">
                          {deletingProjectId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Ref / Stage</th>
                    <th className="py-3.5 px-4">Client &amp; Category</th>
                    <th className="py-3.5 px-4">Shoot Dates</th>
                    <th className="py-3.5 px-4 text-right">Package / Paid</th>
                    <th className="py-3.5 px-4 text-right">Kharcha</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-500">No projects yet. Click <strong>New Client Project</strong> to start.</td></tr>
                  ) : (
                    filteredProjects.map((p) => {
                      const f = getProjectFinancials(p);
                      const pExp = transactions.filter((t) => t.project_id === p.id && t.tx_type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4">
                            <div className="font-mono text-xs font-semibold text-teal-700">{p.receipt_number}</div>
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">{p.receipt_type || "Quotation"}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{p.client_name}</div>
                            <div className="text-xs text-slate-500">{p.project_title}</div>
                            <span className="text-[11px] font-medium text-teal-700">{p.category || "Wedding Photography & Film"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-700 space-y-0.5">
                            {(p.project_events || []).map((ev, i) => (
                              <div key={i}><strong>{formatDate(ev.event_date)}</strong> — {ev.event_name}</div>
                            ))}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-bold text-slate-900">{formatINR(f.total)}</div>
                            <div className="text-xs text-emerald-700">Paid: {formatINR(f.totalPaid)}</div>
                            {f.isPaidInFull ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-teal-700"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700"><Clock className="h-3 w-3" /> Due {formatINR(f.remaining)}</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="text-xs font-bold text-rose-600">{formatINR(pExp)}</div>
                            <button onClick={() => { setPreselectedFinanceProject(p.id); setTab("finance"); }}
                              className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-700 hover:underline">
                              <IndianRupee className="h-3 w-3" /> + Add Kharcha
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => setPreviewProject(p)} className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold">Docs / PDF</button>
                              <button onClick={() => handleQuickDownload(p)} disabled={downloadingProjectId === p.id} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-50">
                                {downloadingProjectId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </button>
                              <button onClick={() => { setEditingProject(p); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"><Edit3 className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteProject(p.id)} disabled={deletingProjectId === p.id} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
                                {deletingProjectId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
        )}

        {/* FINANCE TAB */}
        {tab === "finance" && (
          <FinanceTab
            user={user}
            projects={projects}
            transactions={transactions}
            vendorBookings={vendorBookings}
            cashHolders={cashHolders}
            preselectedProjectId={preselectedFinanceProject}
            onClearPreselected={() => setPreselectedFinanceProject(null)}
            onTransactionsChange={setTransactions}
            onVendorBookingsChange={setVendorBookings}
          />
        )}

        {/* TEAM TAB (Mobile Cards + Desktop Table) */}
        {tab === "team" && user.role === "admin" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Shield className="h-5 w-5 text-teal-600" /> Team Access Control</h2>
            </div>

            {/* Mobile Team Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {members.map((m) => {
                const isBusy = updatingMemberId === m.id;
                return (
                  <div key={m.id} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {m.full_name} {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />}
                        </div>
                        <div className="text-xs text-slate-500">@{m.username} • {m.email}</div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.email_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {m.email_verified ? "Verified" : "Unverified"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button disabled={m.id === user.id || isBusy} onClick={() => handleToggleMember(m.id, "is_approved", !m.is_approved)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 ${m.is_approved ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                        {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                        {m.is_approved ? "Approved (Revoke)" : "Approve"}
                      </button>
                      <select disabled={m.id === user.id || isBusy} value={m.role} onChange={(e) => handleToggleMember(m.id, "role", e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white disabled:opacity-50">
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Team Table */}
            <table className="hidden md:table w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Username / Email</th>
                  <th className="py-3 px-4">Verified</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const isBusy = updatingMemberId === m.id;
                  return (
                    <tr key={m.id}>
                      <td className="py-3.5 px-4 font-semibold flex items-center gap-2">
                        {m.full_name} {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />}
                      </td>
                      <td className="py-3.5 px-4 text-xs">@{m.username}<div className="text-slate-500">{m.email}</div></td>
                      <td className="py-3.5 px-4 text-xs">{m.email_verified ? "Verified" : "Unverified"}</td>
                      <td className="py-3.5 px-4">
                        <button disabled={m.id === user.id || isBusy} onClick={() => handleToggleMember(m.id, "is_approved", !m.is_approved)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 ${m.is_approved ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700"}`}>
                          {isBusy && <Loader2 className="h-3 w-3 animate-spin" />}
                          {m.is_approved ? "Approved (Revoke)" : "Approve"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <select disabled={m.id === user.id || isBusy} value={m.role} onChange={(e) => handleToggleMember(m.id, "role", e.target.value)}
                          className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white disabled:opacity-50">
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && user.role === "admin" && (
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 max-w-3xl space-y-4">
            <h2 className="font-bold text-slate-900">Indocs Media Official Defaults</h2>
            {settingsSavedMsg && <div className="p-3 rounded-lg bg-emerald-50 text-sm text-emerald-800">{settingsSavedMsg}</div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input type="text" value={settingsDraft.company_name} onChange={(e) => setSettingsDraft({ ...settingsDraft, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default UPI Account</label>
                <input type="text" value={settingsDraft.default_upi || ""} onChange={(e) => setSettingsDraft({ ...settingsDraft, default_upi: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Numbers</label>
                <input type="text" value={settingsDraft.company_phone} onChange={(e) => setSettingsDraft({ ...settingsDraft, company_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signer Name</label>
                <input type="text" value={settingsDraft.signer_name} onChange={(e) => setSettingsDraft({ ...settingsDraft, signer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Signer Title &amp; Phone</label>
                <input type="text" value={settingsDraft.signer_title} onChange={(e) => setSettingsDraft({ ...settingsDraft, signer_title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Indocs Media Logo</label>
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload("logo_data_url", e.target.files?.[0])} className="text-xs w-full" />
                <img src={settingsDraft.logo_data_url || DEFAULT_LOGO_URL} alt="Logo" className="h-12 mt-2 object-contain bg-zinc-900 p-1.5 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mithilesh Shende Signature (PNG)</label>
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload("signature_data_url", e.target.files?.[0])} className="text-xs w-full" />
                {settingsDraft.signature_data_url && <img src={settingsDraft.signature_data_url} alt="Sig" className="h-12 mt-2 object-contain" />}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Terms &amp; Delivery Notes</label>
              <textarea rows={5} value={settingsDraft.default_terms} onChange={(e) => setSettingsDraft({ ...settingsDraft, default_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
            </div>
            <button type="submit" disabled={savingSettings}
              className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingSettings ? "Saving..." : "Save Indocs Media Defaults"}
            </button>
          </form>
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#111318] border-t border-zinc-800 px-2 py-1.5 shadow-2xl">
        <div className={`grid ${user.role === "admin" ? "grid-cols-4" : "grid-cols-2"} gap-1`}>
          <button onClick={() => setTab("projects")}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold ${tab === "projects" ? "text-teal-400 bg-zinc-800/80" : "text-zinc-400"}`}>
            <FileText className="h-5 w-5 mb-0.5" /> Projects
          </button>
          <button onClick={() => setTab("finance")}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold ${tab === "finance" ? "text-teal-400 bg-zinc-800/80" : "text-zinc-400"}`}>
            <Wallet className="h-5 w-5 mb-0.5" /> Finance
          </button>
          {user.role === "admin" && (
            <>
              <button onClick={() => setTab("team")}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold ${tab === "team" ? "text-teal-400 bg-zinc-800/80" : "text-zinc-400"}`}>
                <Users className="h-5 w-5 mb-0.5" /> Team
              </button>
              <button onClick={() => setTab("settings")}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-semibold ${tab === "settings" ? "text-teal-400 bg-zinc-800/80" : "text-zinc-400"}`}>
                <Settings className="h-5 w-5 mb-0.5" /> Defaults
              </button>
            </>
          )}
        </div>
      </nav>

      {showForm && (
        <ProjectFormModal
          settings={settings}
          cashHolders={cashHolders}
          initialProject={editingProject}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            setProjects((prev) =>
              prev.some((p) => p.id === saved.id) ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev]
            );
            setPreviewProject(saved);
          }}
        />
      )}

      {previewProject && (
        <ReceiptPreviewModal project={previewProject} settings={settings} onClose={() => setPreviewProject(null)} />
      )}
    </div>
  );
}
