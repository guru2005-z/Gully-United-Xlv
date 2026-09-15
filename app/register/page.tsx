"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Phone, User, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    phone: "",
    displayName: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 4) {
      setError("Use a password with at least 4 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error?.message || "We could not create the account. Check details and try again.",
        );
        return;
      }

      if (data.requiresOtp) {
        router.push(`/verify-phone?phone=${encodeURIComponent(data.phone)}` as never);
      } else {
        router.push("/login?registered=1" as never);
      }
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
            <UserPlus size={24} />
          </span>
          <h1 className="mt-4 text-3xl font-bold">Create Account</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Sign up with your Indian phone number
          </p>
        </div>

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
              Phone Number
              <div className="relative mt-2">
                <Phone
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="field pl-9 text-sm font-medium text-foreground"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Display Name (Optional)
              <div className="relative mt-2">
                <User
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Your Name"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="field pl-9 text-sm font-medium text-foreground"
                />
              </div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Password (Min 4 Chars)
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
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              Confirm Password
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
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="field pl-9 text-sm font-medium text-foreground"
                />
              </div>
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-neon w-full justify-center mt-6">
            {loading ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link href={"/login" as never} className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
