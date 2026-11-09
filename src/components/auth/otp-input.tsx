"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Six boxes for a six-digit code. Typing moves on, Backspace moves back,
 * and pasting the whole code (from an SMS, with or without spaces) fills
 * every box at once. One autocomplete hint on the first box lets a phone
 * offer the code from the message it just received.
 */
export function OtpInput({ value, onChange, invalid, label }: { value: string; onChange: (v: string) => void; invalid?: boolean; label: string }) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");
  const focus = (i: number) => boxes.current[Math.max(0, Math.min(5, i))]?.focus();

  function put(i: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return;
    const next = (value.slice(0, i) + clean + value.slice(i + clean.length)).slice(0, 6);
    onChange(next);
    focus(i + clean.length);
  }

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={i === 0 ? 6 : 1}
          aria-label={`${label} ${i + 1}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => put(i, e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            put(0, e.clipboardData.getData("text"));
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !d) {
              e.preventDefault();
              onChange(value.slice(0, Math.max(0, i - 1)) + value.slice(i));
              focus(i - 1);
            } else if (e.key === "Backspace") {
              e.preventDefault();
              onChange(value.slice(0, i) + value.slice(i + 1));
            } else if (e.key === "ArrowLeft") focus(i - 1);
            else if (e.key === "ArrowRight") focus(i + 1);
          }}
          onFocus={(e) => e.target.select()}
          className={cn(
            "tnum h-14 w-full min-w-0 rounded-ctl border bg-surface text-center text-[22px] font-semibold text-ink focus:border-brand focus:outline-none",
            invalid ? "border-crit" : "border-line",
          )}
        />
      ))}
    </div>
  );
}
