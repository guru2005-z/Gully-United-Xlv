import { useEffect, useRef, useState } from "react";
import intro from "@/assets/intro.asset.json";
import { LogoMark } from "./Logo";

/**
 * Opening intro: plays the Gully United XLV brand video full-screen once per
 * session, then fades into the homepage. Skip + reduced-motion friendly.
 */
export function Loader() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const [seen, setSeen] = useState(
    () => typeof window !== "undefined" && !!window.sessionStorage.getItem("guxlv.loaded"),
  );
  const [leaving, setLeaving] = useState(false);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    videoRef.current?.pause();
    window.sessionStorage.setItem("guxlv.loaded", "1");
    setLeaving(true);
    setTimeout(() => setSeen(true), 450);
  }

  useEffect(() => {
    if (seen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    // Failsafe: never hold the intro longer than the clip length.
    const t = setTimeout(finish, 12000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);

  useEffect(() => {
    if (!seen) videoRef.current?.play().catch(() => finish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen]);

  if (seen) return null;

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-[100] bg-black transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      onClick={finish}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        preload="auto"
        onEnded={finish}
        onError={finish}
      >
        <source src={intro.url} type="video/mp4" />
        <source src="/intro-fallback.webm" type="video/webm" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-5">
        <LogoMark className="h-10 opacity-90" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="pointer-events-auto cursor-pointer rounded-full border border-foreground/40 px-8 py-3.5 text-xs font-extrabold uppercase tracking-[0.25em] text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          Skip Intro
        </button>
      </div>
    </div>
  );
}
