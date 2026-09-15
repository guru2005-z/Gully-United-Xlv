"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Phone, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
        setError(data.error?.message || "Phone number or password is incorrect.");
        setForm((prev) => ({ ...prev, password: "" }));
        return;
      }

      router.push("/book" as never);

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setForm((prev) => ({ ...prev, password: "" }));
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
          <h1 className="mt-4 text-3xl font-bold">Sign In</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Access your Gully United XLV account
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
                  placeholder="e.g. 9390817811"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="field pl-9 text-sm font-medium text-foreground"
                />
              </div>
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Password
              </label>
              <Link
                href={"/forgot-password" as never}
                className="text-[0.7rem] font-semibold text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-2">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="Enter password"
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
          </div>

          <button type="submit" disabled={loading} className="btn-neon w-full justify-center mt-6">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link href={"/register" as never} className="font-bold text-primary hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
