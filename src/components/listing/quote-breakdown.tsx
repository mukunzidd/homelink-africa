"use client";

import { useTranslations } from "next-intl";
import type { Quote, QuoteLineKey } from "@/lib/domain/pricing";
import { toDisplayQuote } from "@/lib/domain/pricing";
import type { Money } from "@/lib/domain/money";
import { usePreferences } from "@/lib/preferences/context";
import { MoneyText } from "@/components/ui/money-text";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/cn";

/**
 * Transaction density: tabular figures, tight rows, the total set apart.
 *
 * Every line is shown before the total so the arithmetic is checkable — which
 * only holds because `toDisplayQuote` derives the total from the converted
 * lines rather than converting the total separately. The escrow marker sits
 * here, at the moment money is discussed, rather than on a trust page nobody
 * opens.
 *
 * Shared across stays, cars, and experiences: the shape of a quote is the same
 * everywhere, only the unit differs — nights, days, or seats.
 */
export function QuoteBreakdown({
  quote,
  unitRate,
  units,
  showEscrow = true,
  className,
}: {
  quote: Quote;
  /** The per-unit price, restated on the first line for checkability. */
  unitRate: Money;
  /** Nights, days, or people, depending on what is being booked. */
  units: number;
  showEscrow?: boolean;
  className?: string;
}) {
  const t = useTranslations("quote");
  const tLines = useTranslations("quoteLines");
  const tVerify = useTranslations("verification");
  const tExtras = useTranslations("extras");
  const { display, currency, fx } = usePreferences();

  const shown = toDisplayQuote(quote, currency, fx);

  function label(key: QuoteLineKey, extra?: string): string {
    const rate = display(unitRate);
    switch (key) {
      case "accommodation": {
        // Nights priced differently (a weekend, an event week) do not
        // multiply out from the base rate; restate the average instead, so
        // the line still checks against its own total.
        const line = quote.lines.find((l) => l.key === "accommodation")?.amount;
        if (line && units > 0 && line.currency === unitRate.currency && line.minor !== unitRate.minor * units) {
          return t("accommodationAvg", { rate: display({ minor: Math.round(line.minor / units), currency: line.currency }), nights: units });
        }
        return t("accommodation", { rate, nights: units });
      }
      case "hire":
        return tLines("hire", { rate, days: units });
      case "seats":
        return tLines("seats", { rate, count: units });
      case "driver":
        return tLines("driver");
      case "cleaning":
        return t("cleaning");
      case "serviceFee":
        return t("serviceFee");
      case "extra":
        return extra ? tExtras(`${extra}.name`) : "";
      case "discount":
        return tLines("discount");
      case "rent":
        return tLines("rent");
      case "deposit": {
        const rent = quote.lines.find((l) => l.key === "rent")?.amount.minor ?? 0;
        const deposit = quote.lines.find((l) => l.key === "deposit")?.amount.minor ?? 0;
        return tLines("deposit", { count: rent ? Math.round(deposit / rent) : 0 });
      }
    }
  }

  return (
    <div className={cn("flex flex-col gap-2 text-sm", className)}>
      {shown.lines.map((line, i) => (
        <div key={`${line.key}-${line.extra ?? i}`} className="flex items-baseline justify-between gap-4">
          <span className="text-ink-2">{label(line.key, line.extra)}</span>
          {line.key === "discount" ? (
            <span className="tnum font-medium text-ok">
              −<MoneyText amount={{ ...line.amount, minor: -line.amount.minor }} />
            </span>
          ) : line.key === "extra" && line.amount.minor === 0 ? (
            <span className="text-ink-3">{tLines("free")}</span>
          ) : (
            <MoneyText amount={line.amount} className="text-ink" />
          )}
        </div>
      ))}

      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2.5 text-[15px] font-semibold">
        <span>{t("totalIn", { currency })}</span>
        <MoneyText amount={shown.total} />
      </div>

      {shown.converted && (
        <p className="text-xs leading-relaxed text-ink-3">
          {t("chargedIn", { currency: shown.settledTotal.currency })}
        </p>
      )}

      {showEscrow && quote.escrowHeld && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <VerifiedBadge label={tVerify("escrow")} size="sm" />
          <span className="text-[13px] text-ink-2">{tVerify("escrowShort")}</span>
        </div>
      )}
    </div>
  );
}
