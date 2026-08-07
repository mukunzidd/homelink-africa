"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Listing } from "@/lib/domain/types";
import { quoteStay } from "@/lib/domain/pricing";
import { addDays, isBefore, isIsoDate, type IsoDate } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { QuoteBreakdown } from "./quote-breakdown";
import { cn } from "@/lib/cn";

/**
 * The booking panel on a listing page.
 *
 * The page around it is discovery density — serif, photography, room. This
 * panel is transaction density, because the moment someone starts choosing
 * dates they have stopped browsing and started transacting. Both densities on
 * one screen is the style guide rule working as intended, not a mistake.
 */
export function BookingPanel({
  listing,
  defaultFrom,
  defaultTo,
}: {
  listing: Listing;
  defaultFrom: IsoDate;
  defaultTo: IsoDate;
}) {
  const t = useTranslations("detail");
  const tListing = useTranslations("listing");
  const tSearch = useTranslations("search");
  const tQuote = useTranslations("quote");
  const router = useRouter();

  const [from, setFrom] = useState<IsoDate>(defaultFrom);
  const [to, setTo] = useState<IsoDate>(defaultTo);
  const [party, setParty] = useState(2);

  const quote = useMemo(() => {
    if (!isIsoDate(from) || !isIsoDate(to)) return null;
    return quoteStay(listing, from, to);
  }, [listing, from, to]);

  /** Check-out must follow check-in; nudge it rather than showing an error. */
  function changeFrom(next: string) {
    setFrom(next);
    if (isIsoDate(next) && !isBefore(next, to)) setTo(addDays(next, 3));
  }

  function reserve() {
    const qs = new URLSearchParams({ from, to, party: String(party) });
    router.push(`/stays/${listing.slug}/book?${qs.toString()}`);
  }

  const fieldClass = cn(
    "w-full rounded-ctl border border-line bg-surface px-3 py-2.5 text-[15px] text-ink",
    "min-h-11 focus-visible:border-brand",
  );

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm text-ink-3">{t("nightlyFrom")}</span>
        <MoneyText
          amount={listing.nightlyRate}
          className="text-xl font-bold text-ink"
        />
        <span className="text-sm text-ink-3">{tListing("perNight")}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-2">
            {tSearch("arriving")}
          </span>
          <input
            type="date"
            value={from}
            onChange={(e) => changeFrom(e.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-2">
            {tSearch("leaving")}
          </span>
          <input
            type="date"
            value={to}
            min={addDays(from, 1)}
            onChange={(e) => setTo(e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">
          {tSearch("guests")}
        </span>
        <select
          value={party}
          onChange={(e) => setParty(Number(e.target.value))}
          className={cn(fieldClass, "cursor-pointer")}
        >
          {Array.from({ length: listing.sleeps }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {tSearch("guestCount", { count: n })}
            </option>
          ))}
        </select>
      </label>

      {quote ? (
        <>
          <QuoteBreakdown
            quote={quote}
            nightlyRate={listing.nightlyRate}
            className="border-t border-line pt-4"
          />
          <Button onClick={reserve} fullWidth size="lg">
            {tListing("reserve")}
          </Button>
          <p className="text-center text-xs text-ink-3">{tQuote("noHiddenFees")}</p>
        </>
      ) : (
        <p className="border-t border-line pt-4 text-sm text-ink-3">
          {t("unavailable")}
        </p>
      )}
    </div>
  );
}
