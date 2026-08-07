"use client";

import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * A select on our tokens.
 *
 * The native `<select>` stays underneath, transparent, filling the control.
 * That keeps keyboard behaviour, type-ahead, form semantics, and the
 * platform's own wheel picker on mobile — all things a hand-rolled listbox
 * gets wrong for months. What we replace is the closed state, which is the
 * part the browser renders as grey chrome that ignores the design system.
 *
 * The OPEN list is still drawn by the OS and cannot be styled cross-browser.
 * It follows `color-scheme`, which the theme sets on `:root`, so it is at
 * least dark in dark mode rather than a white rectangle.
 */
export function Select<T extends string | number>({
  label,
  hideLabel,
  value,
  onChange,
  options,
  icon,
  disabled,
  className,
  size = "md",
}: {
  label: string;
  hideLabel?: boolean;
  value: T;
  onChange: (next: string) => void;
  options: { value: T; label: string }[];
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span
        className={cn(
          "flex items-center gap-1.5 text-[13px] font-semibold text-ink-2",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </span>

      <div
        className={cn(
          "relative flex items-center gap-2 rounded-ctl border border-line bg-surface",
          "transition-colors duration-150 hover:bg-surface-2",
          "focus-within:border-brand focus-within:outline focus-within:outline-2",
          "focus-within:outline-brand focus-within:-outline-offset-2",
          disabled && "opacity-60",
          size === "sm" ? "min-h-9 px-2.5" : "min-h-11 px-3",
        )}
      >
        {icon && <span className="flex-none text-ink-3">{icon}</span>}

        {/* Presentational: the select underneath announces its own value, so
            leaving this readable would have it read out twice. */}
        <span
          aria-hidden="true"
          className={cn(
            "flex-1 truncate font-medium text-ink",
            size === "sm" ? "text-[13px]" : "text-[15px]",
          )}
        >
          {selected?.label ?? ""}
        </span>

        <ChevronDownIcon className="flex-none text-ink-3" />

        <select
          aria-label={label}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full cursor-pointer opacity-0 focus-visible:outline-none disabled:cursor-not-allowed"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}
