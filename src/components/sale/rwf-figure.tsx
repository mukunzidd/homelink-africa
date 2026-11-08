"use client";

import { useLocale } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { usePreferences } from "@/lib/preferences/context";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/**
 * The price in francs, beside the converted one.
 *
 * A house in Kigali is priced, negotiated and notarised in RWF, and that is
 * the number a Rwandan buyer and the notary will say out loud. "$248,062"
 * alone looked like a machine had converted it, which it had. Hidden when the
 * page is already being read in RWF, so the figure never appears twice.
 */
export function RwfFigure({ amount, className }: { amount: Money; className?: string }) {
  const { currency } = usePreferences();
  const locale = useLocale() as Locale;
  if (currency === "RWF" || amount.currency !== "RWF") return null;
  const label = new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: "currency",
    currency: "RWF",
    currencyDisplay: "code",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount.minor);
  return <span className={cn("tnum block", className)}>{label}</span>;
}
