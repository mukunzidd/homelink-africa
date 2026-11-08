"use client";

import { cn } from "@/lib/cn";

/**
 * One choice from a short ordered scale, on one line.
 *
 * Bedrooms were five pill chips that wrapped, leaving "4+" alone on a second
 * row of a 268px sidebar. A scale reads better as a single control anyway: the
 * options are steps of one thing, not independent tags.
 */
export function SegmentedChoice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex w-full rounded-ctl border border-line bg-surface-2 p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "tnum min-h-8 flex-1 cursor-pointer rounded-inner px-1 text-[13px] font-medium transition-colors duration-150",
              on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(12,33,25,0.12)]" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** The top of a filter panel: a quiet label and a Clear link, not a heading. */
export function FilterPanelHeader({ title, clearLabel, onClear }: { title: string; clearLabel: string; onClear?: () => void }) {
  return (
    <div className="flex h-6 items-center justify-between">
      <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
      {onClear && (
        <button type="button" onClick={onClear} className="cursor-pointer rounded-inner text-[13px] font-medium text-brand hover:text-brand-deep">
          {clearLabel}
        </button>
      )}
    </div>
  );
}
