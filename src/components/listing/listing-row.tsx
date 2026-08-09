import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
import type { IsoDate } from "@/lib/domain/dates";
import { quoteStay } from "@/lib/domain/pricing";
import { Link } from "@/i18n/navigation";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { Button } from "@/components/ui/button";

/**
 * Transaction density.
 *
 * Style guide: convention on transaction. Booking.com posture — 8px radius,
 * scannable rows, tabular figures, price where the eye already expects it.
 *
 * With dates the price is a real total for the stay; without them it can only
 * be a nightly rate, and it says so rather than implying a total that has not
 * been calculated.
 *
 * In the Renting lane the unit is the month. That lane exists because a lease
 * is a different transaction from a booking, and it was showing the same six
 * places at the same nightly prices as Stays — so the tab, the key icon and
 * the whole §5-C journey changed nothing anyone could see. A year of nights is
 * not a price a tenant recognises, and it is not what they would be quoted.
 */
export async function ListingRow({
  listing,
  from,
  to,
  party,
  nights,
  lease,
}: {
  listing: Listing;
  from?: IsoDate | null;
  to?: IsoDate | null;
  party?: number;
  nights?: number;
  /** The Renting lane. Prices by the month and does not offer dates. */
  lease?: boolean;
}) {
  const t = await getTranslations("listing");
  const tResults = await getTranslations("results");
  const tVerify = await getTranslations("verification");
  const tStatus = await getTranslations("status");
  const tDetail = await getTranslations("detail");

  // A lease is not priced by the night, so dates do not produce a total here
  // even when the search carries them.
  const quote = !lease && from && to ? quoteStay(listing, from, to) : null;
  const monthly = lease ? listing.monthlyRate : undefined;

  // The search follows the person into the listing, so the booking panel opens
  // on the dates they already chose rather than asking again.
  const query = new URLSearchParams();
  if (lease) query.set("band", "long");
  if (from && !lease) query.set("from", from);
  if (to && !lease) query.set("to", to);
  if (party && party !== 2) query.set("party", String(party));
  const href = `/stays/${listing.slug}${query.size ? `?${query}` : ""}`;

  return (
    <article className="flex flex-col gap-3 rounded-ctl border border-line bg-surface p-3 transition-colors duration-150 hover:border-ink-3/40 sm:flex-row sm:items-stretch sm:gap-4">
      <Link href={href} className="flex-none">
        <SupplyImage
          seed={listing.imageSeed}
          src={listing.images?.[0]}
          alt={listing.name}
          sizes="(max-width: 640px) 100vw, 176px"
          className="h-32 w-full rounded-[6px] sm:h-full sm:w-44"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <Link href={href} className="rounded-ctl">
          <h3 className="text-[15px] font-semibold leading-snug text-ink">
            {listing.name}
          </h3>
        </Link>

        <p className="text-[13px] text-ink-3">
          {listing.neighbourhood} · {t("bedrooms", { count: listing.bedrooms })} ·{" "}
          {t("sleeps", { count: listing.sleeps })}
        </p>

        <p className="line-clamp-2 max-w-[62ch] text-[13px] leading-relaxed text-ink-2">
          {listing.summary}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
          <VerifiedBadge label={tVerify("badge")} size="sm" />
          {!lease && quote?.escrowHeld && (
            <VerifiedBadge label={tVerify("escrow")} size="sm" />
          )}
          {/* "2 left for these dates" is a nightly-availability sentence and
              says nothing true about a tenancy. */}
          {!lease && listing.unitsAvailable <= 2 && (
            <StatusPill tone="warn">
              {tStatus("lowAvailability", { count: listing.unitsAvailable })}
            </StatusPill>
          )}
        </div>
      </div>

      <div className="flex flex-row items-end justify-between gap-2 border-t border-line-soft pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-1">
        <div className="flex flex-col items-start sm:items-end">
          {monthly ? (
            <>
              <MoneyText
                amount={monthly}
                className="text-lg font-bold leading-tight text-ink"
              />
              <span className="text-xs text-ink-3">{t("perMonth")}</span>
            </>
          ) : quote ? (
            <>
              <MoneyText
                amount={quote.total}
                className="text-lg font-bold leading-tight text-ink"
              />
              <span className="text-right text-xs text-ink-3">
                {tResults("totalFor", { count: nights ?? quote.nights })}
              </span>
            </>
          ) : (
            <>
              <MoneyText
                amount={listing.nightlyRate}
                className="text-lg font-bold leading-tight text-ink"
              />
              <span className="text-xs text-ink-3">{t("perNight")}</span>
            </>
          )}
        </div>

        <Link href={href} className="sm:mt-auto">
          <Button size="sm" variant={lease ? "secondary" : "primary"}>
            {lease ? tDetail("applyForLease") : t("reserve")}
          </Button>
        </Link>
      </div>
    </article>
  );
}
