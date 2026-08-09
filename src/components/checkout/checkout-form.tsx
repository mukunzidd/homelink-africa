"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { ServiceKind } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import { bookingReference, toDisplayQuote } from "@/lib/domain/pricing";
import { usePreferences } from "@/lib/preferences/context";
import { Button } from "@/components/ui/button";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/cn";

type Rail = "card" | "mobileMoney";

/** What is being paid for, reduced to what the pay step actually needs. */
export type CheckoutItem = {
  kind: ServiceKind;
  id: string;
  slug: string;
  name: string;
  unitRate: Money;
};

/**
 * The pay step, shared by stays, cars, and experiences.
 *
 * A checkout is the worst place to introduce variety: people have learned one
 * shape and any deviation reads as a trick. So the three modules differ only
 * in what they hand in — the rail choice, the escrow statement, the price
 * breakdown, and the button that names the amount are identical.
 *
 * Nothing is charged; payment rails land in Phase 2.
 */
export function CheckoutForm({
  item,
  quote,
  units,
  confirmQuery,
  referenceSeed,
  cancellationDate,
}: {
  item: CheckoutItem;
  quote: Quote;
  units: number;
  detailHref?: string;
  /** Carried to the confirmation screen, which has no store to read from yet. */
  confirmQuery: Record<string, string>;
  referenceSeed: string;
  cancellationDate?: string;
}) {
  const t = useTranslations("checkout");
  const tQuote = useTranslations("quote");
  const tVerify = useTranslations("verification");
  const router = useRouter();

  const { rail: defaultRail, display, currency, fx } = usePreferences();

  // The button must name the same number the breakdown above it totals to.
  const shownTotal = toDisplayQuote(quote, currency, fx).total;

  const [rail, setRail] = useState<Rail>(defaultRail);
  const [momoNumber, setMomoNumber] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const momoDigits = momoNumber.replace(/\D/g, "");
  const momoInvalid = rail === "mobileMoney" && momoDigits.length !== 9;
  const showMomoError = touched && momoInvalid;

  function submit() {
    setTouched(true);
    if (momoInvalid) return;

    setSubmitting(true);
    const reference = bookingReference(referenceSeed);
    const qs = new URLSearchParams({ kind: item.kind, ...confirmQuery });
    router.push(`/bookings/${reference}?${qs.toString()}`);
  }

  const fieldClass = cn(
    "w-full rounded-ctl border bg-surface px-3 py-2.5 text-[15px] text-ink min-h-11",
    showMomoError ? "border-crit" : "border-line focus-visible:border-brand",
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
          {t("payWith")}
        </h2>

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "card", label: t("card"), hint: t("cardHint") },
              {
                value: "mobileMoney",
                label: t("mobileMoney"),
                hint: t("mobileMoneyHint"),
              },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={rail === option.value}
              onClick={() => setRail(option.value)}
              className={cn(
                "flex min-h-11 flex-col items-start gap-0.5 rounded-ctl border px-4 py-3 text-left",
                "cursor-pointer transition-colors duration-150 ease-out",
                rail === option.value
                  ? "border-brand bg-brand-tint"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "text-[15px] font-semibold",
                  rail === option.value ? "text-brand" : "text-ink",
                )}
              >
                {option.label}
              </span>
              <span className="text-xs text-ink-3">{option.hint}</span>
            </button>
          ))}
        </div>

        {rail === "mobileMoney" ? (
          <label className="mt-1 flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">
              {t("mobileNumber")}
            </span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={showMomoError}
              aria-describedby={showMomoError ? "momo-error" : undefined}
              placeholder="078 000 0000"
              className={fieldClass}
            />
            {showMomoError && (
              <span id="momo-error" className="text-xs text-crit">
                {t("mobileNumberError")}
              </span>
            )}
          </label>
        ) : (
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">
                {t("cardNumber")}
              </span>
              <input
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                className="min-h-11 w-full rounded-ctl border border-line bg-surface px-3 py-2.5 text-[15px] text-ink focus-visible:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">
                {t("cardHolder")}
              </span>
              <input
                autoComplete="cc-name"
                className="min-h-11 w-full rounded-ctl border border-line bg-surface px-3 py-2.5 text-[15px] text-ink focus-visible:border-brand"
              />
            </label>
          </div>
        )}
      </section>

      {/* The promise, stated in money terms, where money is being asked for. */}
      <section
        className={cn(
          "flex flex-col gap-2 rounded-card p-5",
          quote.escrowHeld
            ? "border border-trust/30 bg-trust-tint/40"
            : "border border-line bg-surface",
        )}
      >
        {quote.escrowHeld ? (
          <>
            <VerifiedBadge label={tVerify("escrow")} className="self-start" />
            <h2 className="font-display text-xl font-semibold leading-snug text-ink">
              {t("escrowTitle")}
            </h2>
            <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
              {t("escrowBody")}
            </p>
          </>
        ) : (
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
            {/* "This stay is below our escrow threshold" was being said over a
                Land Cruiser. Stay copy stays the default and the other two
                lanes override it, the same way the verification panel does. */}
            {item.kind === "stay"
              ? t("noEscrowBody")
              : t(`kinds.${item.kind}.noEscrowBody`)}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
        <QuoteBreakdown
          quote={quote}
          unitRate={item.unitRate}
          units={units}
          showEscrow={false}
        />

        {cancellationDate && (
          <p className="text-xs leading-relaxed text-ink-3">
            {t("cancellation", { date: cancellationDate })}
          </p>
        )}

        <Button size="lg" fullWidth onClick={submit} disabled={submitting}>
          {submitting
            ? t("processing")
            : t("payNow", { amount: display(shownTotal) })}
        </Button>

        <p className="text-center text-xs text-ink-3">{t("agree")}</p>
        <p className="rounded-ctl bg-warn-tint px-3 py-2 text-center text-xs font-medium text-warn">
          {t("stubNotice")}
        </p>
        <p className="text-center text-xs text-ink-3">{tQuote("noHiddenFees")}</p>
      </section>
    </div>
  );
}
