"use client";

import type { Money } from "@/lib/domain/money";
import { usePreferences } from "@/lib/preferences/context";
import { cn } from "@/lib/cn";

/**
 * The only place a Money value becomes a string.
 *
 * Conversion and formatting both live behind `usePreferences().display`, so no
 * component ever divides by 100 — which is what keeps RWF (a zero-decimal
 * currency) from rendering as one hundredth of its real value.
 */
export function MoneyText({
  amount,
  className,
  rounded,
}: {
  amount: Money;
  className?: string;
  /** Whole units, for a ceiling or a pin. Never for a price someone pays. */
  rounded?: boolean;
}) {
  const { display, displayRounded } = usePreferences();
  return <span className={cn("tnum", className)}>{rounded ? displayRounded(amount) : display(amount)}</span>;
}
