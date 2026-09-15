"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, PhoneCall } from "lucide-react";

export default function VerifyPhonePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone") || "";
  const typeParam = searchParams.get("type") || "signup";

  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (token.trim().length < 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneParam, token: token.trim(), type: typeParam }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error?.message ||
            "That code is invalid or expired. Request a new code and try again.",
        );
        return;
      }

      if (typeParam === "recovery") {
        router.push("/reset-password" as never);
      } else {
        router.push("/book?verified=1" as never);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setError(null);
    setResendCountdown(60);

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneParam }),
      });
    } catch {
      // resend notification
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-28 pb-16">
      <div className="panel p-6 sm:p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <PhoneCall size={24} />
        </span>
        <h1 className="mt-4 text-3xl font-bold">Verify Phone OTP</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Enter the code sent to {phoneParam || "your phone"}
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive text-left"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              6-Digit Code
              <div className="relative mt-2">
                <KeyRound
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="field pl-9 text-center text-lg font-bold tracking-[0.3em] text-foreground"
                />
              </div>
            </label>
          </div>

          <button type="submit" disabled={loading} className="btn-neon w-full justify-center mt-6">
            {loading ? "Verifying…" : "Verify Code"}
          </button>
        </form>

        <div className="mt-6 text-xs text-muted-foreground">
          Didn't receive the code?{" "}
          <button
            type="button"
            disabled={resendCountdown > 0}
            onClick={handleResend}
            className="font-bold text-primary hover:underline disabled:opacity-50"
          >
            {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
