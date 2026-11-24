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

  // Loading states for background actions
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#111318] text-white sticky top-0 z-30 shadow-md border-b-2 border-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="Indocs Media" className="h-9 w-9 object-contain rounded-lg bg-black/30 p-0.5" />
            <div>
              <div className="font-bold tracking-tight text-sm sm:text-base">INDOCS MEDIA</div>
              <div className="text-[11px] text-zinc-400">
                Shri Harivansh, <span className="text-white font-semibold">{user.full_name}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button onClick={() => setTab("projects")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === "projects" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
              <FileText className="h-4 w-4" /> Projects &amp; Docs
            </button>
            <button onClick={() => setTab("finance")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === "finance" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
              <Wallet className="h-4 w-4" /> Finance &amp; Khata
            </button>
            {user.role === "admin" && (
              <>
                <button onClick={() => setTab("team")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === "team" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                  <Users className="h-4 w-4" /> Team
                </button>
                <button onClick={() => setTab("settings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${tab === "settings" ? "bg-teal-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}>
                  <Settings className="h-4 w-4" /> Defaults
                </button>
              </>
            )}
            <button onClick={handleLogout} disabled={loggingOut}
              className="ml-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-red-600 text-zinc-200 flex items-center gap-1 disabled:opacity-50">
              {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === "projects" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Shri Harivansh, {user.full_name}</h1>
                <p className="text-sm text-slate-500">Manage Wedding, Ad Shoot, YouTube &amp; Brand projects — generate Quotation, Booking Confirmation &amp; Final Receipts.</p>
              </div>
              <button onClick={() => { setEditingProject(null); setShowForm(true); }}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
                <Plus className="h-4 w-4" /> New Client Project
              </button>
            </div>

            <div className="relative max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search client, category (Ad Shoot, Wedding), receipt #..."
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-teal-600" />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
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
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {p.receipt_type || "Quotation"}
                            </span>
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
                            <button
                              onClick={() => { setPreselectedFinanceProject(p.id); setTab("finance"); }}
                              className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-700 hover:underline">
                              <IndianRupee className="h-3 w-3" /> + Add Kharcha
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button onClick={() => setPreviewProject(p)}
                                className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 text-xs font-semibold">
                                Docs / PDF
                              </button>
                              <button onClick={() => handleQuickDownload(p)} disabled={downloadingProjectId === p.id} title="Download PDF"
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 disabled:opacity-50">
                                {downloadingProjectId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </button>
                              <button onClick={() => { setEditingProject(p); setShowForm(true); }} title="Edit" className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200">
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteProject(p.id)} disabled={deletingProjectId === p.id} title="Delete"
                                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
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

        {tab === "finance" && (
          <FinanceTab
            user={user}
            projects={projects}
            transactions={transactions}
            cashHolders={cashHolders}
            preselectedProjectId={preselectedFinanceProject}
            onClearPreselected={() => setPreselectedFinanceProject(null)}
            vendorBookings={vendorBookings}
            onVendorBookingsChange={setVendorBookings}
            onTransactionsChange={setTransactions}
          />
        )}

        {tab === "team" && user.role === "admin" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 flex items-center gap-2"><Shield className="h-5 w-5 text-teal-600" /> Team Access Control</h2>
            </div>
            <table className="w-full text-sm text-left">
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
                        {m.full_name}
                        {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" />}
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

        {tab === "settings" && user.role === "admin" && (
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl space-y-4">
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Indocs Media Logo (default loaded from indocsmedia.vercel.app)</label>
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload("logo_data_url", e.target.files?.[0])} className="text-xs" />
                <img src={settingsDraft.logo_data_url || DEFAULT_LOGO_URL} alt="Logo" className="h-12 mt-2 object-contain bg-zinc-900 p-1.5 rounded-lg" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mithilesh Shende Signature (PNG)</label>
                <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleImageUpload("signature_data_url", e.target.files?.[0])} className="text-xs" />
                {settingsDraft.signature_data_url && <img src={settingsDraft.signature_data_url} alt="Sig" className="h-12 mt-2 object-contain" />}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Terms &amp; Delivery Notes</label>
              <textarea rows={5} value={settingsDraft.default_terms} onChange={(e) => setSettingsDraft({ ...settingsDraft, default_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs" />
            </div>
            <button type="submit" disabled={savingSettings}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              {savingSettings ? "Saving..." : "Save Indocs Media Defaults"}
            </button>
          </form>
        )}
      </main>

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
