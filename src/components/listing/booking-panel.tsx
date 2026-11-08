"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Listing } from "@/lib/domain/types";
import { quoteStay } from "@/lib/domain/pricing";
import { addDays, isIsoDate, type IsoDate } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { UsersIcon } from "@/components/ui/icons";
import { Select } from "@/components/ui/select";
import { QuoteBreakdown } from "./quote-breakdown";

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
  defaultParty = 2,
}: {
  listing: Listing;
  defaultFrom: IsoDate;
  defaultTo: IsoDate;
  defaultParty?: number;
}) {
  const t = useTranslations("detail");
  const tListing = useTranslations("listing");
  const tSearch = useTranslations("search");
  const tQuote = useTranslations("quote");
  const router = useRouter();

  const [from, setFrom] = useState<IsoDate | null>(defaultFrom);
  const [to, setTo] = useState<IsoDate | null>(defaultTo);
  const [party, setParty] = useState(Math.min(defaultParty, listing.sleeps));

  const quote = useMemo(() => {
    if (!isIsoDate(from) || !isIsoDate(to)) return null;
    return quoteStay(listing, from, to);
  }, [listing, from, to]);

  function reserve() {
    if (!from || !to) return;
    const qs = new URLSearchParams({ from, to, party: String(party) });
    router.push(`/stays/${listing.slug}/book?${qs.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm text-ink-3">{t("nightlyFrom")}</span>
        <MoneyText
          amount={listing.nightlyRate}
          className="text-xl font-semibold text-ink"
        />
        <span className="text-sm text-ink-3">{tListing("perNight")}</span>
      </div>

      <DateRangePicker
        from={from}
        to={to}
        onChange={(nextFrom, nextTo) => {
          setFrom(nextFrom);
          // A new arrival with no departure yet defaults to three nights, so
          // the panel keeps showing a price instead of blanking out.
          setTo(nextTo ?? (nextFrom ? addDays(nextFrom, 3) : null));
        }}
        labelFrom={tSearch("arriving")}
        labelTo={tSearch("leaving")}
      />

      <Select
        label={tSearch("guests")}
        value={party}
        onChange={(next) => setParty(Number(next))}
        icon={<UsersIcon size={15} />}
        options={Array.from({ length: listing.sleeps }, (_, i) => i + 1).map(
          (n) => ({ value: n, label: tSearch("guestCount", { count: n }) }),
        )}
      />

      {quote ? (
        <>
          <QuoteBreakdown
            quote={quote}
            unitRate={listing.nightlyRate}
            units={quote.nights}
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
