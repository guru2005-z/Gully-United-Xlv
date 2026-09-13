import { useEffect, useRef, useState } from "react";

/**
 * CSS 3D turf environment — floodlights, boundary, stumps, ball and player
 * silhouettes. Pure transforms/opacity so it stays GPU friendly on mobile.
 */
export function TurfScene({
  interactive = true,
  compact = false,
}: {
  interactive?: boolean;
  compact?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (!interactive || reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = wrapRef.current;
    if (!el) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        setTilt({ x: px * 10, y: py * 6 });
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [interactive, reduced]);

  const lights = Array.from({ length: 7 });

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden ${compact ? "h-[380px]" : "h-[520px] sm:h-[620px]"}`}
      style={{ perspective: "1100px" }}
      aria-hidden="true"
    >
      {/* fog / atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_100%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_65%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,var(--background),transparent)]" />

      {/* floodlight beams */}
      <div className="absolute inset-x-0 top-0 flex justify-between px-[6%]">
        {lights.map((_, i) => (
          <div key={i} className="relative">
            <div
              className="h-3 w-8 rounded-sm bg-primary animate-pulse-glow"
              style={{ animationDelay: `${i * 240}ms` }}
            />
            <div
              className="absolute left-1/2 top-3 h-[300px] w-[140px] -translate-x-1/2 opacity-[0.16]"
              style={{
                background: "linear-gradient(to bottom, var(--primary), transparent 78%)",
                clipPath: "polygon(42% 0, 58% 0, 100% 100%, 0% 100%)",
                animation: reduced ? undefined : `pulse-glow ${4 + i * 0.4}s ease-in-out infinite`,
              }}
            />
          </div>
        ))}
      </div>

      {/* pitch */}
      <div
        className="absolute inset-x-[6%] bottom-[6%] top-[34%] transition-transform duration-300 ease-out"
        style={{
          transform: `rotateX(${58 - tilt.y}deg) rotateZ(${tilt.x * 0.4}deg) translateZ(-40px)`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="relative h-full w-full rounded-[8px] border border-primary/60 bg-[linear-gradient(180deg,oklch(0.2_0.06_140/.55),oklch(0.13_0.03_140/.5))] shadow-[0_0_80px_-10px_color-mix(in_oklab,var(--primary)_60%,transparent)]">
          {/* turf stripes */}
          <div className="absolute inset-0 rounded-[6px] bg-[repeating-linear-gradient(90deg,transparent_0_38px,color-mix(in_oklab,var(--primary)_9%,transparent)_38px_76px)]" />
          {/* inner boundary */}
          <div className="absolute inset-[8%] rounded-[4px] border border-dashed border-primary/40" />
          {/* central cricket strip and the two popping creases */}
          <div className="absolute left-1/2 top-1/2 h-[70%] w-[19%] -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-primary/40 bg-[linear-gradient(90deg,color-mix(in_oklab,var(--primary)_8%,transparent),color-mix(in_oklab,var(--primary)_17%,transparent),color-mix(in_oklab,var(--primary)_8%,transparent))]" />
          {[18, 82].map((top) => (
            <div
              key={top}
              className="absolute left-1/2 h-px w-[38%] -translate-x-1/2 bg-foreground/55"
              style={{ top: `${top}%` }}
            >
              <span className="absolute left-1/2 top-0 h-3 w-px -translate-y-1/2 bg-foreground/45" />
              <span className="absolute left-[22%] top-0 h-2 w-px -translate-y-1/2 bg-foreground/35" />
              <span className="absolute right-[22%] top-0 h-2 w-px -translate-y-1/2 bg-foreground/35" />
            </div>
          ))}
          {/* full wickets: three stumps with two bails resting across the tops */}
          {[18, 82].map((top) => (
            <div
              key={top}
              className="absolute left-1/2 h-9 w-8 -translate-x-1/2 sm:h-10 sm:w-9"
              style={{ top: `calc(${top}% - 0.3rem)` }}
            >
              <div className="absolute left-1/2 top-0 h-2 w-7 -translate-x-1/2">
                <span className="absolute left-[12%] top-0 h-1 w-[42%] rounded-full bg-foreground shadow-[0_0_6px_var(--primary)]" />
                <span className="absolute right-[12%] top-0 h-1 w-[42%] rounded-full bg-foreground shadow-[0_0_6px_var(--primary)]" />
              </div>
              <div className="absolute bottom-0 left-1/2 flex h-8 w-7 -translate-x-1/2 items-end justify-between sm:h-9">
                {[0, 1, 2].map((s) => (
                  <span
                    key={s}
                    className="h-full w-[2px] rounded-full bg-primary shadow-[0_0_8px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
                  />
                ))}
              </div>
              <div className="absolute bottom-0 left-1/2 h-px w-8 -translate-x-1/2 rounded-full bg-primary/45 blur-[1px]" />
            </div>
          ))}
          {/* player silhouettes */}
          {[
            [30, 32],
            [68, 44],
            [44, 72],
            [22, 62],
            [78, 70],
          ].map(([l, t], i) => (
            <span
              key={i}
              className="absolute h-4 w-2 rounded-full bg-foreground/25"
              style={{ left: `${l}%`, top: `${t}%` }}
            />
          ))}
        </div>
      </div>

      {/* ball */}
      <div
        className={`absolute left-[16%] top-[42%] h-8 w-8 rounded-full bg-[radial-gradient(circle_at_32%_30%,oklch(0.35_0_0),oklch(0.12_0_0))] ring-1 ring-primary/60 ${
          reduced ? "" : "animate-floaty"
        }`}
        style={{ boxShadow: "0 0 26px -4px color-mix(in oklab, var(--primary) 70%, transparent)" }}
      />

      {/* particles */}
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/50"
          style={{
            left: `${(i * 37) % 96}%`,
            top: `${20 + ((i * 53) % 70)}%`,
            animation: reduced
              ? undefined
              : `floaty ${6 + (i % 5)}s ease-in-out ${i * 0.3}s infinite`,
          }}
        />
      ))}
    </div>
  );
}
