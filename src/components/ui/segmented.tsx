"use client";

import { cn } from "@/lib/cn";

/**
 * Two or three exclusive modes, shown as a pill with a sliding-looking thumb.
 *
 * Used where a panel has genuinely different instruments behind it — exact
 * dates versus a flexible span — rather than as a decorative tab strip. The
 * modes are peers, so a tab underline would overstate the hierarchy.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold",
              "transition-colors duration-150",
              active
                ? "bg-surface text-ink shadow-[var(--shadow-card)]"
                : "text-ink-2 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
