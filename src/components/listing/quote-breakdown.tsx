"use client";

import { useTranslations } from "next-intl";
import type { Quote } from "@/lib/domain/pricing";
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
 */
export function QuoteBreakdown({
  quote,
  nightlyRate,
  showEscrow = true,
  className,
}: {
  quote: Quote;
  nightlyRate: Money;
  showEscrow?: boolean;
  className?: string;
}) {
  const t = useTranslations("quote");
  const tVerify = useTranslations("verification");
  const { display, currency, fx } = usePreferences();

  const shown = toDisplayQuote(quote, currency, fx);

  return (
    <div className={cn("flex flex-col gap-2 text-sm", className)}>
      {shown.lines.map((line) => (
        <div key={line.key} className="flex items-baseline justify-between gap-4">
          <span className="text-ink-2">
            {line.key === "accommodation"
              ? t("accommodation", {
                  rate: display(nightlyRate),
                  nights: shown.nights,
                })
              : t(line.key)}
          </span>
          <MoneyText amount={line.amount} className="text-ink" />
        </div>
      ))}

      <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-2.5 text-[15px] font-bold">
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
