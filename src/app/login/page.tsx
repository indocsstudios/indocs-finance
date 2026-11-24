"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, User, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { DEFAULT_LOGO_URL } from "@/lib/constants";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const verifiedStatus = params.get("verified");

  const [mode, setMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Login failed.");
      else { router.push("/dashboard"); router.refresh(); }
    } catch { setError("Network error."); } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, username, email }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Registration failed.");
      else { setSuccess(data.message); setFullName(""); setUsername(""); setEmail(""); }
    } catch { setError("Network error."); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-teal-950 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-[#111318] px-8 py-6 text-white border-b-4 border-teal-600">
          <div className="flex items-center gap-3.5">
            <img src={DEFAULT_LOGO_URL} alt="Indocs Media" className="h-11 w-11 object-contain rounded-lg bg-black/40 p-1" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">INDOCS MEDIA</h1>
              <p className="text-xs text-zinc-400">Shri Harivansh — Admin &amp; Finance Portal</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          {verifiedStatus === "success" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /><span>Email verified! Wait for Admin approval to log in.</span>
            </div>
          )}
          {verifiedStatus === "invalid" && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /><span>Invalid verification link.</span>
            </div>
          )}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
            <button type="button" onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md ${mode === "login" ? "bg-white text-zinc-900 shadow-sm" : "text-slate-600"}`}>
              Team Login
            </button>
            <button type="button" onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md ${mode === "register" ? "bg-white text-zinc-900 shadow-sm" : "text-slate-600"}`}>
              Request Access
            </button>
          </div>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
          {success && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">{success}</div>}
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email or Username</label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="mithilesh, devansh, anav or email"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-600" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Master Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Indocs Media shared password"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-600" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Signing in..." : "Sign In to Admin Panel"}
              </button>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                Email verification + Admin approval + .env password protected.
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
              <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-[#111318] hover:bg-zinc-800 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Sending..." : "Verify Email & Request Approval"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}><LoginContent /></Suspense>;
}
