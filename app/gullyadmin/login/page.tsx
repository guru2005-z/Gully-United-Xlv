"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Lock,
  Phone,
  ArrowRight,
  Sparkles,
  KeyRound,
  Mail,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";

export default function GullyAdminLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot" | "verify" | "reset">("login");
  const [form, setForm] = useState({ phone: "", password: "" });
  const [recoveryInput, setRecoveryInput] = useState("Gullyunitedxlv@gmail.com");
  const [recoveryTarget, setRecoveryTarget] = useState("");
  const [otpToken, setOtpToken] = useState("");
  const [newPasswordForm, setNewPasswordForm] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=/gullyadmin`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (authErr) throw authErr;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate Google sign-in.");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
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

      router.push("/gullyadmin" as never);
      router.refresh();
    } catch {
      setError("Failed to verify administrative authorization. Please try again.");
      setForm((prev) => ({ ...prev, password: "" }));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRecoveryOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recoveryInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to send OTP. Please check your email or phone.");
        return;
      }

      setRecoveryTarget(data.target || recoveryInput.trim());
      setInfoMessage(
        data.message || `6-digit recovery OTP sent to ${data.target || recoveryInput.trim()}.`,
      );
      setMode("verify");
    } catch {
      setError("Failed to send OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyRecoveryOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (otpToken.trim().length < 6) {
      setError("Please enter the 6-digit OTP verification code.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoveryTarget || recoveryInput.trim(),
          token: otpToken.trim(),
          type: "recovery",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Invalid or expired OTP code. Please request a new code.");
        return;
      }

      setInfoMessage("OTP verified! Set your new admin security password below.");
      setMode("reset");
    } catch {
      setError("Failed to verify OTP code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAdminPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (newPasswordForm.newPassword !== newPasswordForm.confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPasswordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPasswordForm),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to update password. Please try again.");
        return;
      }

      setInfoMessage("Admin password updated! Redirecting to Control Suite...");
      setTimeout(() => {
        router.push("/gullyadmin" as never);
        router.refresh();
      }, 1000);
    } catch {
      setError("Failed to update password. Please try again.");
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
            <Sparkles size={12} /> Private Owner Portal
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {mode === "login"
              ? "Super Admin Sign In"
              : mode === "forgot"
                ? "Admin Password Recovery"
                : mode === "verify"
                  ? "Verify Admin OTP"
                  : "Set New Admin Password"}
          </h1>
          <p className="mt-2 text-xs text-neutral-400">
            {mode === "login"
              ? "Authorized Gully United XLV Ground Operations Only"
              : mode === "forgot"
                ? "Receive a 6-digit OTP on your admin email or mobile number"
                : mode === "verify"
                  ? `Enter the 6-digit OTP sent to ${recoveryTarget || recoveryInput}`
                  : "Enter and confirm your new security password"}
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

        {infoMessage && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-[#CCFF00]/40 bg-[#CCFF00]/10 p-4 text-xs font-bold text-[#CCFF00]"
          >
            {infoMessage}
          </div>
        )}

        {mode === "login" && (
          <>
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignIn}
              className="mt-6 w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-neutral-800 bg-black/60 text-xs font-bold uppercase tracking-wider text-white hover:border-[#CCFF00]/60 hover:text-[#CCFF00] transition-all disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {googleLoading ? "Connecting to Google…" : "Continue with Owner Google Account"}
            </button>

            <div className="relative flex items-center justify-center my-6">
              <span className="h-px w-full bg-neutral-800" />
              <span className="absolute bg-neutral-900 px-3 text-[0.6rem] font-bold uppercase tracking-widest text-neutral-500">
                Or Admin Credentials
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
                  Admin Email or Phone Number
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Gullyunitedxlv@gmail.com or 9491501919"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400">
                    Security Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoMessage(null);
                      if (form.phone.trim()) setRecoveryInput(form.phone.trim());
                      setMode("forgot");
                    }}
                    className="text-[0.65rem] font-bold text-[#CCFF00] hover:underline uppercase tracking-wider"
                  >
                    Forgot Password? (Get OTP)
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter admin password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-10 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
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
          </>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleSendRecoveryOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
                Admin Email or Mobile Number
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Gullyunitedxlv@gmail.com or 9491501919"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
                />
              </div>
              <p className="mt-2 text-[0.68rem] text-neutral-400">
                We will send a 6-digit OTP verification code to your admin email or registered phone
                number.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-widest hover:bg-[#b8e600] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#CCFF00]/20 disabled:opacity-50"
            >
              {loading ? "Sending OTP Code…" : "Send 6-Digit OTP"}
              {!loading && <ArrowRight size={16} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfoMessage(null);
                setMode("login");
              }}
              className="w-full py-2.5 text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Admin Sign In
            </button>
          </form>
        )}

        {mode === "verify" && (
          <form onSubmit={handleVerifyRecoveryOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
                Enter 6-Digit OTP Code
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value)}
                  className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-center text-lg font-black tracking-[0.35em] text-[#CCFF00] placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-widest hover:bg-[#b8e600] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#CCFF00]/20 disabled:opacity-50"
            >
              {loading ? "Verifying OTP…" : "Verify OTP & Continue"}
              {!loading && <ShieldCheck size={16} />}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs font-bold text-neutral-400 hover:text-white uppercase tracking-wider"
              >
                ← Change Email/Phone
              </button>
              <button
                type="button"
                onClick={handleSendRecoveryOtp}
                disabled={loading}
                className="text-xs font-bold text-[#CCFF00] hover:underline uppercase tracking-wider"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {mode === "reset" && (
          <form onSubmit={handleResetAdminPassword} className="mt-6 space-y-4">
            <div>
              <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
                New Security Password (Min 6 Chars)
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter new admin password"
                  value={newPasswordForm.newPassword}
                  onChange={(e) =>
                    setNewPasswordForm({ ...newPasswordForm, newPassword: e.target.value })
                  }
                  className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-10 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[0.65rem] font-black uppercase tracking-wider text-neutral-400 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Re-type new admin password"
                  value={newPasswordForm.confirmNewPassword}
                  onChange={(e) =>
                    setNewPasswordForm({
                      ...newPasswordForm,
                      confirmNewPassword: e.target.value,
                    })
                  }
                  className="w-full bg-black/60 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder-neutral-600 focus:border-[#CCFF00] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-[#CCFF00] text-black font-extrabold text-xs uppercase tracking-widest hover:bg-[#b8e600] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#CCFF00]/20 disabled:opacity-50"
            >
              {loading ? "Saving New Password…" : "Save New Admin Password"}
              {!loading && <ShieldCheck size={16} />}
            </button>
          </form>
        )}

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
