import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/** One number that matters, what it is, and (optionally) where it leads. */
export function StatTile({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: ReactNode; href?: string; tone?: "warn" | "crit" }) {
  const body = (
    <div className={cn("flex h-full flex-col gap-1 rounded-card border bg-surface p-4", tone === "crit" ? "border-crit/40" : tone === "warn" ? "border-warn/40" : "border-line", href && "transition-colors hover:border-brand")}>
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className={cn("tnum font-display text-[28px] font-semibold leading-none", tone === "crit" ? "text-crit" : "text-ink")}>{value}</p>
      {hint && <p className="text-[12.5px] text-ink-2">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
