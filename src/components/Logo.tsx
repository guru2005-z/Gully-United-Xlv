"use client";

import logoAsset from "@/assets/logo.asset.json";

/**
 * Official Gully United XLV lockup (crown + GU emblem + wordmark) on black.
 */
export function LogoMark({ className = "h-10" }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Gully United XLV"
      className={`${className} w-auto object-contain`}
      loading="eager"
      decoding="async"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = "/favicon.png";
      }}
    />
  );
}

/**
 * Emblem-only crop of the same logo file (left portion of the lockup),
 * used where a compact circular mark is needed.
 */
export function Emblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Gully United XLV emblem"
      className={`relative block overflow-hidden rounded-full ${className}`}
    >
      <img
        src={logoAsset.url}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[290%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
        style={{ marginLeft: "-31.5%" }}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = "/favicon.png";
        }}
      />
    </span>
  );
}

export function Logo({ className = "" }: { className?: string; compact?: boolean }) {
  return <LogoMark className={`h-9 sm:h-11 ${className}`} />;
}
