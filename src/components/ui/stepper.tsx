"use client";

import { cn } from "@/lib/cn";

/**
 * Minus / value / plus, with the label and its qualifier stacked on the left.
 *
 * Chosen over a dropdown of numbers because the qualifier matters: "Children"
 * alone is ambiguous, "Ages 2–12" is not, and a select has nowhere to put that.
 * It also lets zero be a real, visible state rather than an absent one.
 */
export function StepperRow({
  label,
  hint,
  value,
  min = 0,
  max = 16,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  disabled?: boolean;
}) {
  const canDecrement = !disabled && value > min;
  const canIncrement = !disabled && value < max;

  const button = cn(
    "grid size-9 place-items-center rounded-full border border-line text-ink-2",
    "transition-colors duration-150",
    "enabled:cursor-pointer enabled:hover:border-ink-3 enabled:hover:text-ink",
    "disabled:cursor-not-allowed disabled:opacity-35",
  );

  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink">{label}</span>
        {hint && <span className="text-[13px] text-ink-3">{hint}</span>}
      </div>

      <div className="flex flex-none items-center gap-3">
        <button
          type="button"
          aria-label={`${label}: −`}
          disabled={!canDecrement}
          onClick={() => onChange(value - 1)}
          className={button}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <span
          aria-live="polite"
          className="tnum w-7 text-center text-[15px] font-semibold text-ink"
        >
          {value}
        </span>

        <button
          type="button"
          aria-label={`${label}: +`}
          disabled={!canIncrement}
          onClick={() => onChange(value + 1)}
          className={button}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * The big-number variant, for durations rather than counts.
 *
 * Turo uses this for "I want a car for N months" and it is the right shape for
 * HomeLink's long lease lane too: a lease is chosen in months, and a date-range
 * calendar is the wrong instrument for picking "about a year".
 */
export function BigStepper({
  value,
  unit,
  min = 1,
  max = 24,
  onChange,
}: {
  value: number;
  unit: string;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
}) {
  const button = cn(
    "grid size-11 place-items-center rounded-full border border-line text-ink-2",
    "transition-colors duration-150",
    "enabled:cursor-pointer enabled:hover:border-ink-3 enabled:hover:text-ink",
    "disabled:cursor-not-allowed disabled:opacity-35",
  );

  return (
    <div className="flex items-center justify-center gap-8 py-2">
      <button
        type="button"
        aria-label="−"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={button}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      <div className="flex flex-col items-center">
        <span className="tnum font-display text-6xl font-semibold leading-none text-ink">
          {value}
        </span>
        <span className="mt-1 text-[15px] font-semibold text-ink-2">{unit}</span>
      </div>

      <button
        type="button"
        aria-label="+"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className={button}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
