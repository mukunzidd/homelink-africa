"use client";

import { cn } from "@/lib/cn";

export function FilterChip({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium",
        "transition-colors duration-150 ease-out cursor-pointer min-h-9",
        pressed
          ? "bg-brand-tint border-brand text-brand"
          : "bg-surface border-line text-ink-2 hover:bg-surface-2 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
