import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.35em] text-primary">
      <span className="h-px w-8 bg-primary" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={80}>
        <h2 className="mt-4 text-[clamp(2.4rem,7vw,5.5rem)]">{title}</h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={140}>
          <p
            className={`mt-4 max-w-2xl text-base text-muted-foreground ${align === "center" ? "mx-auto" : ""}`}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
