import { useEffect, useState } from "react";
import { Emblem } from "./Logo";

export function Loader() {
  const [stage, setStage] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.sessionStorage.getItem("guxlv.loaded")) {
      setGone(true);
      return;
    }
    const t1 = setTimeout(() => setStage(1), 420);
    const t2 = setTimeout(() => setStage(2), 1150);
    const t3 = setTimeout(() => {
      setGone(true);
      window.sessionStorage.setItem("guxlv.loaded", "1");
    }, 1750);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${
        stage === 2 ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="text-center">
        <Emblem className="mx-auto h-16 w-16 animate-pulse-glow text-primary" />
        <p
          className={`display mt-6 text-2xl tracking-[0.3em] transition-all duration-500 ${
            stage >= 1 ? "opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          Gully United <span className="text-primary">XLV</span>
        </p>
        <div className="mx-auto mt-6 h-px w-56 overflow-hidden bg-border">
          <div
            className="h-full bg-primary transition-[width] duration-1000 ease-out"
            style={{ width: stage >= 1 ? "100%" : "8%" }}
          />
        </div>
      </div>
    </div>
  );
}
