"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Phone, ArrowRight, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Invalid administrative credentials.");
        setForm((prev) => ({ ...prev, password: "" }));
        return;
      }

      // Check admin status
      const adminCheckRes = await fetch("/api/admin/bookings");
      if (adminCheckRes.status === 403) {
        setError(
          "Your account authenticated successfully, but does not have super-admin privileges.",
        );
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Failed to verify administrative authorization. Please try again.");
      setForm((prev) => ({ ...prev, password: "" }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Glow background elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#CCFF00]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-neutral-900/90 border border-neutral-800 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="h-10 mb-4" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCFF00]/10 border border-[#CCFF00]/30 text-[#CCFF00] text-[0.65rem] font-bold uppercase tracking-widest mb-2">
            <Sparkles size={12} /> Restricted Control Center
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Super Admin Sign In</h1>
          <p className="mt-2 text-xs text-neutral-400">
            Authorized Gully United XLV Ground Operations
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-500/40 bg-red-950/40 p-4 text-xs font-bold text-red-400"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
              Admin Phone Number or Email
            </label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                required
                placeholder="e.g. 9491501919 or Gullyunitedxlv@gmail.com"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
              Security Password
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-3.5 px-6 rounded-xl bg-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-widest hover:bg-[#b8e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#CCFF00]/20 disabled:opacity-50"
          >
            {loading ? "Authenticating Admin…" : "Access Control Suite"}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-neutral-800/80 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-neutral-500 hover:text-neutral-300 transition-colors uppercase tracking-wider"
          >
            ← Return to Gully United Website
          </Link>
        </div>
      </div>
    </div>
  );
}
