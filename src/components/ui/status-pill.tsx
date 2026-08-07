import { cn } from "@/lib/cn";

/**
 * Tinted, with a dot and a word = a state the system reached.
 *
 * The dot is not decoration: colour alone never conveys state anywhere in this
 * system, so every pill survives colourblindness and a greyscale print of an
 * Ops screen.
 */
export type StatusTone = "ok" | "warn" | "crit" | "idle";

const TONES: Record<StatusTone, string> = {
  ok: "text-ok bg-ok-tint",
  warn: "text-warn bg-warn-tint",
  crit: "text-crit bg-crit-tint",
  idle: "text-ink-3 bg-surface-2",
};

export function StatusPill({
  tone = "idle",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        TONES[tone],
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
