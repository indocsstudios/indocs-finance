"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  LogOut,
  Users,
  Settings,
  IndianRupee,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Edit3,
  Trash2,
  Shield,
} from "lucide-react";
import type { CompanySettings, Project, SessionUser, TeamMember } from "@/lib/types";
import { formatDate, formatINR } from "@/lib/format";
import { downloadReceiptPDF } from "@/lib/pdf";
import ProjectFormModal from "./ProjectFormModal";
import ReceiptPreviewModal from "./ReceiptPreviewModal";

interface Props {
  user: SessionUser;
  initialProjects: Project[];
  initialSettings: CompanySettings;
  initialMembers: TeamMember[];
}

export default function DashboardClient({
  user,
  initialProjects,
  initialSettings,
  initialMembers,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"projects" | "team" | "settings">("projects");
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending">("all");

  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);

  const [settingsDraft, setSettingsDraft] = useState<CompanySettings>(initialSettings);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState("");

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.client_name.toLowerCase().includes(search.toLowerCase()) ||
        p.project_title.toLowerCase().includes(search.toLowerCase()) ||
        p.receipt_number.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filterStatus === "all" ||
        (filterStatus === "confirmed" && p.advance_confirmed) ||
        (filterStatus === "pending" && !p.advance_confirmed);
      return matchesSearch && matchesFilter;
    });
  }, [projects, search, filterStatus]);

  const kpis = useMemo(() => {
    const totalRevenue = projects.reduce((s, p) => s + Number(p.total_amount || 0), 0);
    const totalAdvance = projects.reduce((s, p) => s + Number(p.advance_amount || 0), 0);
    const confirmedCount = projects.filter((p) => p.advance_confirmed).length;
    return {
      totalRevenue,
      totalAdvance,
      totalBalance: Math.max(0, totalRevenue - totalAdvance),
      confirmedCount,
    };
  }, [projects]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("Delete this project and its receipt permanently?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function handleToggleMember(id: string, field: "is_approved" | "role", value: boolean | string) {
    const res = await fetch("/api/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    const data = await res.json();
    if (res.ok && data.member) {
      setMembers((prev) => prev.map((m) => (m.id === id ? data.member : m)));
    }
  }

  function handleImageUpload(field: "logo_data_url" | "signature_data_url", file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSettingsDraft((prev) => ({ ...prev, [field]: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSettingsSavedMsg("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsDraft),
    });
    const data = await res.json();
    if (res.ok && data.settings) {
      setSettings(data.settings);
      setSettingsDraft(data.settings);
      setSettingsSavedMsg("Indox Media default settings saved!");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-zinc-950 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold">
              IM
            </div>
            <div>
              <div className="font-bold tracking-tight text-sm sm:text-base">INDOX MEDIA</div>
              <div className="text-[11px] text-zinc-400">
                Logged in as <span className="text-white font-semibold">{user.full_name}</span> ({user.role})
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("projects")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                tab === "projects" ? "bg-indigo-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <FileText className="h-4 w-4" /> Projects
            </button>
            {user.role === "admin" && (
              <>
                <button
                  onClick={() => setTab("team")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    tab === "team" ? "bg-indigo-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <Users className="h-4 w-4" /> Team Access
                </button>
                <button
                  onClick={() => setTab("settings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    tab === "settings" ? "bg-indigo-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <Settings className="h-4 w-4" /> Company Defaults
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white flex items-center gap-1.5 transition"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome, {user.full_name}
            </h1>
            <p className="text-sm text-slate-500">
              Manage Indox Media client projects, multi-date shoots, payments, and PDF receipts.
            </p>
          </div>
          {tab === "projects" && (
            <button
              onClick={() => { setEditingProject(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> New Client Project
            </button>
          )}
        </div>

        {/* PROJECTS TAB */}
        {tab === "projects" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Total Project Value</div>
                <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-1">
                  <IndianRupee className="h-5 w-5 text-indigo-600" />
                  {formatINR(kpis.totalRevenue).replace("₹", "")}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Total Advance Received</div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {formatINR(kpis.totalAdvance)}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Balance Pending</div>
                <div className="text-2xl font-bold text-amber-700 mt-1">
                  {formatINR(kpis.totalBalance)}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">Confirmed Bookings</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {kpis.confirmedCount} / {projects.length}
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by client name (e.g. Bhavna), project, or receipt #..."
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 text-xs font-semibold">
                {(["all", "confirmed", "pending"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg capitalize transition ${
                      filterStatus === status ? "bg-zinc-900 text-white" : "text-slate-600"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Receipt #</th>
                    <th className="py-3.5 px-4">Client &amp; Project</th>
                    <th className="py-3.5 px-4">Event Dates</th>
                    <th className="py-3.5 px-4 text-right">Total / Advance</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Settlement</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No projects yet. Click <strong>New Client Project</strong> to add your first client and generate a PDF receipt.
                      </td>
                    </tr>
                  ) : (
                    filteredProjects.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-indigo-700">
                          {p.receipt_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{p.client_name}</div>
                          <div className="text-xs text-slate-500">{p.project_title}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          {(p.project_events || []).length > 0 ? (
                            <div className="space-y-0.5">
                              {p.project_events.map((ev, i) => (
                                <div key={i}>
                                  <span className="font-medium">{formatDate(ev.event_date)}</span> — {ev.event_name}
                                </div>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900">{formatINR(p.total_amount)}</div>
                          <div className="text-xs text-emerald-700">Adv: {formatINR(p.advance_amount)}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {p.advance_confirmed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3.5 w-3.5" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {formatDate(p.settlement_date)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewProject(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold"
                            >
                              Receipt
                            </button>
                            <button
                              onClick={() => downloadReceiptPDF(p, settings)}
                              title="Download PDF"
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => { setEditingProject(p); setShowForm(true); }}
                              title="Edit"
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TEAM ACCESS CONTROL TAB */}
        {tab === "team" && user.role === "admin" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-5 w-5 text-indigo-600" /> Team Access &amp; Admin Approvals
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                No one can log in unless their email is verified AND approved here. The shared password is managed strictly in .env.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Username / Email</th>
                    <th className="py-3 px-4">Email Verified</th>
                    <th className="py-3 px-4">Admin Approval</th>
                    <th className="py-3 px-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{m.full_name}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">@{m.username}</div>
                        <div>{m.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.email_verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {m.email_verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          disabled={m.id === user.id}
                          onClick={() => handleToggleMember(m.id, "is_approved", !m.is_approved)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition disabled:opacity-50 ${
                            m.is_approved
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-slate-200 text-slate-700 hover:bg-indigo-600 hover:text-white"
                          }`}
                        >
                          {m.is_approved ? "Approved (Revoke)" : "Approve Login"}
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          disabled={m.id === user.id}
                          value={m.role}
                          onChange={(e) => handleToggleMember(m.id, "role", e.target.value)}
                          className="border border-slate-300 rounded-md px-2 py-1 text-xs bg-white disabled:opacity-50"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPANY SETTINGS TAB */}
        {tab === "settings" && user.role === "admin" && (
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl space-y-5">
            <div>
              <h2 className="font-bold text-slate-900">Indox Media Default Receipt Details</h2>
              <p className="text-xs text-slate-500">
                These details auto-populate on every generated receipt (logo, Mithilesh Shandy signature, default Terms &amp; Conditions).
              </p>
            </div>

            {settingsSavedMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
                {settingsSavedMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={settingsDraft.company_name}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Email</label>
                <input
                  type="email"
                  value={settingsDraft.company_email}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, company_email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={settingsDraft.company_phone}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, company_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  value={settingsDraft.company_address}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, company_address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signer Name</label>
                <input
                  type="text"
                  value={settingsDraft.signer_name}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, signer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Signer Title</label>
                <input
                  type="text"
                  value={settingsDraft.signer_title}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, signer_title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Number (Leave blank to hide GST on receipts)
              </label>
              <input
                type="text"
                value={settingsDraft.gst_number || ""}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, gst_number: e.target.value })}
                placeholder="Optional — add later whenever needed"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Indox Media Logo (PNG/JPG)</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => handleImageUpload("logo_data_url", e.target.files?.[0])}
                  className="text-xs text-slate-600"
                />
                {settingsDraft.logo_data_url && (
                  <img src={settingsDraft.logo_data_url} alt="Logo" className="h-10 mt-2 object-contain" />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mithilesh Shandy Signature Image (PNG)
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => handleImageUpload("signature_data_url", e.target.files?.[0])}
                  className="text-xs text-slate-600"
                />
                {settingsDraft.signature_data_url && (
                  <img src={settingsDraft.signature_data_url} alt="Signature" className="h-10 mt-2 object-contain" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Default Terms &amp; Conditions</label>
              <textarea
                rows={5}
                value={settingsDraft.default_terms}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, default_terms: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
            >
              Save Indox Media Defaults
            </button>
          </form>
        )}
      </main>

      {showForm && (
        <ProjectFormModal
          settings={settings}
          initialProject={editingProject}
          onClose={() => setShowForm(false)}
          onSaved={(saved) => {
            setShowForm(false);
            setProjects((prev) => {
              const exists = prev.some((p) => p.id === saved.id);
              return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
            });
            setPreviewProject(saved);
          }}
        />
      )}

      {previewProject && (
        <ReceiptPreviewModal
          project={previewProject}
          settings={settings}
          onClose={() => setPreviewProject(null)}
        />
      )}
    </div>
  );
}
