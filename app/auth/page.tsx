"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-auth-client";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/my-bookings";

  const [tab, setTab] = useState<"signin" | "signup" | "forgot">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (authErr) throw authErr;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate Google sign-in.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();

      if (tab === "signin") {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (signInErr) {
          if (signInErr.message.includes("Invalid login credentials")) {
            setError("Incorrect email or password. Please check your credentials.");
          } else {
            setError(signInErr.message);
          }
          return;
        }

        if (data.user) {
          setSuccessMsg("Signed in successfully! Redirecting...");
          setTimeout(() => {
            router.push(redirectTo as never);
            router.refresh();
          }, 600);
        }
      } else if (tab === "signup") {
        if (!form.fullName.trim()) {
          setError("Please enter your full name.");
          setLoading(false);
          return;
        }

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              full_name: form.fullName.trim(),
              phone: form.phone.trim(),
            },
          },
        });

        if (signUpErr) {
          if (
            signUpErr.message.includes("User already registered") ||
            signUpErr.message.includes("already exists")
          ) {
            setError("This email is already registered — sign in instead.");
          } else {
            setError(signUpErr.message);
          }
          return;
        }

        if (data.user) {
          setSuccessMsg(
            "Account created! Please check your email inbox to confirm your address before signing in.",
          );
          setForm({ fullName: "", email: "", phone: "", password: "" });
        }
      } else if (tab === "forgot") {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (resetErr) {
          setError(resetErr.message);
          return;
        }

        setSuccessMsg("Password reset link sent to your email address.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-28 pb-16">
      <div className="bento-card p-6 sm:p-8 space-y-6">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#ccff00]/10 text-[#ccff00]">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white font-display">
            {tab === "signin" ? "Sign In" : tab === "signup" ? "Create Account" : "Reset Password"}
          </h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-gray-400 font-bold">
            Gully United XLV Customer Portal
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === "signin"
                ? "bg-[#ccff00] text-black font-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("signup");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === "signup"
                ? "bg-[#ccff00] text-black font-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("forgot");
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              tab === "forgot"
                ? "bg-[#ccff00] text-black font-black shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Forgot
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-xs font-bold text-red-400"
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            role="status"
            className="rounded-lg border border-[#ccff00]/50 bg-[#ccff00]/10 p-3 text-xs font-bold text-[#ccff00]"
          >
            {successMsg}
          </div>
        )}

        {/* Google Sign-in */}
        {tab !== "forgot" && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider text-white hover:border-[#ccff00]/50 hover:text-[#ccff00] transition-all"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Continue with Google
          </button>
        )}

        <div className="relative flex items-center justify-center my-2">
          <span className="h-px w-full bg-white/10" />
          <span className="absolute bg-[#050505] px-3 text-[0.6rem] font-bold uppercase tracking-widest text-gray-400">
            Or Email
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  required
                  placeholder="Rahul Kumar"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:border-[#ccff00] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:border-[#ccff00] focus:outline-none"
              />
            </div>
          </div>

          {tab === "signup" && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:border-[#ccff00] focus:outline-none"
                />
              </div>
            </div>
          )}

          {tab !== "forgot" && (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white focus:border-[#ccff00] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-neon w-full justify-center text-sm font-black uppercase tracking-wider mt-4"
          >
            {loading
              ? "Processing…"
              : tab === "signin"
                ? "Sign In"
                : tab === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="pt-28 text-center text-gray-400">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
