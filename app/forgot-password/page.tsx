"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Phone } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      setSubmitted(true);
      setTimeout(() => {
        router.push(`/verify-phone?phone=${encodeURIComponent(phone)}&type=recovery` as never);
      }, 2000);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-28 pb-16">
      <div className="panel p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <KeyRound size={24} />
          </span>
          <h1 className="mt-4 text-3xl font-bold">Forgot Password</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Recover your account using your phone number
          </p>
        </div>

        {submitted ? (
          <div className="mt-6 rounded-lg border border-primary/40 bg-black/40 p-4 text-center">
            <p className="text-xs font-bold text-primary">
              If an account exists for that number, we sent recovery instructions.
            </p>
            <p className="mt-2 text-[0.7rem] text-muted-foreground">
              Redirecting to code verification...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Registered Phone Number
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
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
              {loading ? "Sending code…" : "Send Recovery Code"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Remember your password?{" "}
          <Link href={"/login" as never} className="font-bold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
