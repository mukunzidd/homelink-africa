"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Experience } from "@/lib/domain/types";
import { quoteExperience } from "@/lib/domain/pricing";
import { addDays, isIsoDate, today, type IsoDate } from "@/lib/domain/dates";
import { Button } from "@/components/ui/button";
import { MoneyText } from "@/components/ui/money-text";
import { Select } from "@/components/ui/select";
import { UsersIcon } from "@/components/ui/icons";
import { TripActions } from "@/components/cart/trip-actions";
import { cartItemId } from "@/lib/cart-checks";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { SingleDatePicker } from "@/components/ui/single-date-picker";

/**
 * Booking panel for a day out.
 *
 * Priced per person on a single date, so neither the range picker nor the
 * nightly arithmetic applies. The minimum age is stated next to the party
 * size rather than enforced silently — an age limit discovered at the trailhead
 * is a ruined day, and we know it before they book.
 */
export function SeatsPanel({ experience, initialDate, initialParty }: { experience: Experience; initialDate?: IsoDate; initialParty?: number }) {
  const t = useTranslations("experiences");
  const tQuote = useTranslations("quote");
  const router = useRouter();

  const [date, setDate] = useState<IsoDate | null>(initialDate ?? addDays(today(), 10));
  const [party, setParty] = useState(initialParty ?? 2);

  const quote = useMemo(
    () => quoteExperience(experience, party),
    [experience, party],
  );

  function book() {
    if (!date) return;
    const qs = new URLSearchParams({ date, party: String(party) });
    router.push(`/experiences/${experience.slug}/book?${qs.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-baseline gap-1.5">
        <MoneyText
          amount={experience.pricePerPerson}
          className="text-xl font-semibold text-ink"
        />
        <span className="text-sm text-ink-3">{t("perPerson")}</span>
      </div>

      <SingleDatePicker
        value={date}
        onChange={setDate}
        label={t("whenLabel")}
      />

      <Select
        label={t("peopleLabel")}
        value={party}
        onChange={(next) => setParty(Number(next))}
        icon={<UsersIcon size={15} />}
        options={Array.from({ length: experience.groupMax }, (_, i) => i + 1).map(
          (n) => ({ value: n, label: String(n) }),
        )}
      />

      <p className="rounded-ctl bg-surface-2 px-3 py-2.5 text-[13px] text-ink-2">
        {t("ageNotice", { age: experience.minAge })}
      </p>

      {quote && isIsoDate(date) ? (
        <>
          <QuoteBreakdown
            quote={quote}
            unitRate={experience.pricePerPerson}
            units={party}
            className="border-t border-line pt-4"
          />
          <Button onClick={book} fullWidth size="lg">
            {t("book")}
          </Button>
          <TripActions
            item={
              date
                ? {
                    id: cartItemId("experience", experience.slug, date, date, party),
                    kind: "experience",
                    slug: experience.slug,
                    supplyId: experience.id,
                    title: experience.name,
                    start: date,
                    end: date,
                    party,
                    image: experience.images?.[0],
                    imageSeed: experience.imageSeed,
                    quote,
                    supply: experience,
                  }
                : null
            }
          />
          <p className="text-center text-xs text-ink-3">
            {tQuote("noHiddenFees")}
          </p>
        </>
      ) : (
        <p className="border-t border-line pt-4 text-sm text-ink-3">
          {t("whenLabel")}
        </p>
      )}
    </div>
  );
}
