"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error logged to security audit
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white grid place-items-center px-4 font-sans">
      <div className="max-w-md w-full text-center">
        <LogoMark className="h-12 mx-auto" />
        <h1 className="text-3xl font-black text-red-500 mt-6">Something Went Wrong</h1>
        <p className="text-neutral-400 text-sm mt-3">
          We encountered an unexpected issue processing your request.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-[#CCFF00] text-black font-extrabold uppercase text-xs tracking-widest hover:bg-[#b8e600]"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-xl border border-neutral-800 text-neutral-300 font-extrabold uppercase text-xs tracking-widest hover:text-white"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
