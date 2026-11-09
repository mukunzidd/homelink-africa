"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * The booking flow's form controls: a label above, a 44px control, a hint or
 * an error below, and the error wired to the control for screen readers.
 * One set, so every step's fields look and behave the same.
 */
export function Field({
  label,
  hint,
  error,
  children,
  id,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | false;
  children: (a11y: { id: string; "aria-invalid": boolean; "aria-describedby"?: string }) => ReactNode;
  id?: string;
  className?: string;
}) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = error ? `${fid}-error` : hint ? `${fid}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={fid} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children({ id: fid, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error ? (
        <span id={`${fid}-error`} className="text-xs text-crit">
          {error}
        </span>
      ) : hint ? (
        <span id={`${fid}-hint`} className="text-xs leading-relaxed text-ink-3">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export const controlClass = (invalid?: boolean) =>
  cn(
    "min-h-11 w-full rounded-ctl border bg-surface px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-3",
    invalid ? "border-crit" : "border-line focus-visible:border-brand",
  );

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return <input {...rest} className={cn(controlClass(invalid), className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  const { invalid, className, ...rest } = props;
  return <textarea {...rest} className={cn(controlClass(invalid), "min-h-24 resize-y", className)} />;
}

/** A card-like section of a step: a title, an optional line under it, then fields. */
export function StepSection({
  title,
  body,
  children,
  aside,
}: {
  title: string;
  body?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
          {body && <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">{body}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Two or three choices as large tappable cards with a radio look. */
export function ChoiceCards<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 2,
}: {
  name: string;
  value: T | undefined;
  options: { value: T; title: ReactNode; body?: ReactNode; icon?: ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-2", columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-14 cursor-pointer items-start gap-3 rounded-ctl border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              on ? "border-brand bg-brand-tint" : "border-line bg-surface hover:border-ink-3/40",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-[18px] flex-none place-items-center rounded-full border-2",
                on ? "border-brand" : "border-line",
              )}
            >
              {on && <span className="size-2 rounded-full bg-brand" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={cn("flex items-start gap-2 text-[15px] font-semibold leading-snug", on ? "text-brand-deep" : "text-ink")}>
                {o.icon && <span className="mt-[3px] flex-none">{o.icon}</span>}
                <span>{o.title}</span>
              </span>
              {o.body && <span className="text-[13px] leading-snug text-ink-2">{o.body}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
