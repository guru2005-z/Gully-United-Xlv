"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ newPassword: "", confirmNewPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.newPassword.length < 4) {
      setError("Use a password with at least 4 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Your password reset session expired. Start again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=1" as never);
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-28 pb-16">
      <div className="panel p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={24} />
          </span>
          <h1 className="mt-4 text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Enter your new password
          </p>
        </div>

        {success ? (
          <div className="mt-6 rounded-lg border border-primary/40 bg-black/40 p-4 text-center">
            <p className="text-xs font-bold text-primary">
              Your password was updated. Please sign in with your new password.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  New Password (Min 4 Chars)
                  <div className="relative mt-2">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="At least 4 characters"
                      value={form.newPassword}
                      onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                      className="field pl-9 pr-10 text-sm font-medium text-foreground"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Confirm New Password
                  <div className="relative mt-2">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Re-enter password"
                      value={form.confirmNewPassword}
                      onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
                      className="field pl-9 text-sm font-medium text-foreground"
                    />
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-neon w-full justify-center mt-6"
              >
                {loading ? "Updating password…" : "Update Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
