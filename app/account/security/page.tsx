"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LogOut, ShieldCheck, User } from "lucide-react";

export default function AccountSecurityPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ phone: string | null; id: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          router.push("/login" as never);
        }
      } catch {
        router.push("/login" as never);
      } finally {
        setLoadingUser(false);
      }
    }
    loadMe();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login" as never);
    router.refresh();
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "We could not update your password. Please try again.");
        return;
      }

      setSuccess("Password updated successfully.");
      setForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch {
      setError("We could not update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingUser) {
    return (
      <div className="mx-auto max-w-xl px-4 pt-28 pb-16 text-center">
        <p className="text-sm font-bold text-muted-foreground">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-28 pb-16">
      <div className="panel p-6 sm:p-8">
        <div className="flex items-center justify-between border-b border-border/60 pb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <User size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Account Security</h1>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {currentUser?.phone || "Authenticated User"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="btn-ghost flex items-center gap-2 text-xs font-bold text-destructive hover:bg-destructive/10"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Change password form */}
        <div className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <ShieldCheck size={20} className="text-primary" /> Change Password
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Update your account password. Must be at least 4 characters.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-primary/40 bg-black/40 px-4 py-3 text-xs font-bold text-primary"
            >
              {success}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Current Password
                <div className="relative mt-2">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="password"
                    required
                    placeholder="Enter current password"
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    className="field pl-9 text-sm font-medium text-foreground"
                  />
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                New Password (Min 4 Chars)
                <div className="relative mt-2">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="password"
                    required
                    placeholder="At least 4 characters"
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="field pl-9 text-sm font-medium text-foreground"
                  />
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
                    type="password"
                    required
                    placeholder="Re-enter new password"
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
              {loading ? "Updating password…" : "Change Password"}
            </button>
          </form>
        </div>

        <div className="mt-8 border-t border-border/60 pt-6 text-center">
          <Link href="/book" className="text-xs font-bold text-primary hover:underline">
            ← Return to Turf Booking
          </Link>
        </div>
      </div>
    </div>
  );
}
