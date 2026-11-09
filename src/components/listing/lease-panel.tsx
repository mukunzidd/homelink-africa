"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Money } from "@/lib/domain/money";
import { addMonths, startOfMonth, formatMonthTitle, today } from "@/lib/domain/dates";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { MoneyText } from "@/components/ui/money-text";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";

/**
 * The Rent mode's action, in place of the nightly booking panel.
 *
 * Arriving from "Apply for a lease" used to land on a panel asking for check-in
 * dates and quoting per night — the exact transaction the tenant had just
 * said they did not want. A lease is applied for: a move-in month, a term,
 * and a person on the Kigali team who sends the documents.
 *
 * Messaging is not live, so submitting says so rather than pretending.
 */
export function LeasePanel({
  monthly,
  slug,
  name,
  initialMoveIn,
  availableFrom,
}: {
  monthly: Money;
  slug: string;
  name: string;
  initialMoveIn?: string;
  /** ISO date the home is free from, from the listing's lease terms. */
  availableFrom?: string;
}) {
  const t = useTranslations("lease");
  const locale = useLocale() as Locale;
  const [term, setTerm] = useState<12 | 24>(12);
  const first = startOfMonth(addMonths(today(), 1));
  // The first month that starts on or after the day the home is free. The
  // panel used to open on next month whatever the lease said, so a home
  // "free from 1 January" offered a December move-in beside that sentence.
  const freeMonth = availableFrom
    ? availableFrom.endsWith("-01")
      ? availableFrom
      : startOfMonth(addMonths(availableFrom, 1))
    : first;
  const openFrom = freeMonth > first ? freeMonth : first;
  // Earlier months stay in the list, disabled, so the reason the choice
  // starts later is visible rather than a list that silently skips ahead.
  const earlier: string[] = [];
  for (let m = first; m < openFrom && earlier.length < 6; m = addMonths(m, 1)) earlier.push(m);
  const choosable = Array.from({ length: 6 }, (_, i) => addMonths(openFrom, i));
  const months = [...earlier, ...choosable];
  // The month chosen in the Rent search, when it is one this panel offers.
  const [moveIn, setMoveIn] = useState(choosable.find((m) => initialMoveIn && m.startsWith(initialMoveIn)) ?? choosable[0]);
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <p className="flex items-baseline gap-1.5">
        <MoneyText amount={monthly} className="text-2xl font-semibold text-ink" />
        <span className="text-[13px] text-ink-3">{t("perMonth")}</span>
      </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            // The application, the agreement and the deposit now happen in
            // the renting flow; this panel only picks the month and length.
            router.push(`/stays/${slug}/rent?moveIn=${moveIn}&months=${term}`);
          }}
          className="flex flex-col gap-3"
        >
          <Select
            label={t("moveIn")}
            value={moveIn}
            onChange={(v) => setMoveIn(v)}
            options={months.map((m) => ({
              value: m,
              label: formatMonthTitle(m, INTL_LOCALES[locale]),
              disabled: m < openFrom,
              hint: m < openFrom ? t("notFreeYet") : undefined,
            }))}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="pb-1.5 text-[13px] font-medium text-ink-2">{t("term")}</legend>
            <div className="grid grid-cols-2 gap-1 rounded-ctl bg-surface-2 p-1">
              {([12, 24] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={term === n}
                  onClick={() => setTerm(n)}
                  className={cn(
                    "h-9 cursor-pointer rounded-inner text-[13px] transition-colors duration-150",
                    term === n ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgba(12,33,25,0.08)]" : "text-ink-3 hover:text-ink",
                  )}
                >
                  {t("months", { count: n })}
                </button>
              ))}
            </div>
          </fieldset>
          <Button type="submit" size="lg" fullWidth>
            {t("apply")}
          </Button>
          <p className="text-center text-[12px] leading-relaxed text-ink-3">{t("whatNext")}</p>
        </form>

      <Link href={`/stays/${slug}`} className="self-center rounded-ctl text-[13px] font-semibold text-brand hover:text-brand-deep" aria-label={t("shorterLabel", { name })}>
        {t("shorter")}
      </Link>
    </div>
  );
}
