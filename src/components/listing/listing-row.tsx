import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
import type { IsoDate } from "@/lib/domain/dates";
import { quoteStay } from "@/lib/domain/pricing";
import { minutesTo, type LandmarkKey } from "@/lib/domain/landmarks";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { ResultCard, PriceBlock } from "@/components/results/result-card";
import { TravelTime } from "@/components/results/travel-time";

/**
 * A stay or a rental in a result list.
 *
 * With dates the price is a real total for the stay; without them it can only
 * be a nightly rate, and it says so rather than implying a total that has not
 * been calculated. In Rent the unit is the month, because a year of nights is
 * not a price a tenant recognises.
 *
 * Scarcity only appears once dates are chosen. "2 left for these dates" under
 * "Any dates" was a sentence about no dates at all, and on a site whose whole
 * case is honesty it read as a pressure tactic.
 *
 * Without dates the call to action is "Check dates" and lands on the booking
 * panel, because "Reserve" promised a step the page could not take yet.
 */
export async function ListingRow({
  listing,
  from,
  to,
  party,
  nights,
  lease,
  near,
  priority,
  layout = "row",
  moveIn,
}: {
  /** YYYY-MM from the Rent search, carried to the lease panel. */
  moveIn?: string;
  listing: Listing;
  from?: IsoDate | null;
  to?: IsoDate | null;
  party?: number;
  nights?: number;
  /** The Rent mode. Prices by the month and does not offer dates. */
  lease?: boolean;
  /** The landmark the person is measuring from; defaults to the city centre. */
  near?: LandmarkKey;
  priority?: boolean;
  layout?: "row" | "tile";
}) {
  const t = await getTranslations("listing");
  const tResults = await getTranslations("results");
  const tStatus = await getTranslations("status");
  const tList = await getTranslations("list");

  // A lease is not priced by the night, so dates do not produce a total here
  // even when the search carries them.
  const quote = !lease && from && to ? quoteStay(listing, from, to) : null;
  const monthly = lease ? listing.monthlyRate : undefined;

  // The search follows the person into the listing, so the booking panel opens
  // on the dates they already chose rather than asking again.
  const query = new URLSearchParams();
  if (lease) query.set("band", "long");
  if (lease && moveIn) query.set("movein", moveIn);
  if (from && !lease) query.set("from", from);
  if (to && !lease) query.set("to", to);
  if (party && party !== 2) query.set("party", String(party));
  const href = `/stays/${listing.slug}${query.size ? `?${query}` : ""}${!lease && !quote ? "#book" : ""}`;

  const landmark = near ?? "cityCentre";

  return (
    <ResultCard
      layout={layout}
      priority={priority}
      href={href}
      title={listing.name}
      meta={`${listing.neighbourhood} · ${t("bedrooms", { count: listing.bedrooms })} · ${t("sleeps", { count: listing.sleeps })}`}
      summary={layout === "row" ? listing.summary : undefined}
      extra={<TravelTime minutes={minutesTo(listing.location, landmark)} landmark={landmark} />}
      image={{ seed: listing.imageSeed, src: listing.images?.[0], count: listing.images?.length ?? 0 }}
      save={{ id: listing.id, kind: "stay", name: listing.name }}
      inspection={listing.verification}
      tags={
        quote && listing.unitsAvailable <= 2 ? (
          <StatusPill tone="warn">{tStatus("lowAvailability", { count: listing.unitsAvailable })}</StatusPill>
        ) : undefined
      }
      price={
        monthly ? (
          <PriceBlock figure={<MoneyText amount={monthly} rounded />} unit={t("perMonth")} />
        ) : quote ? (
          <PriceBlock
            figure={<MoneyText amount={quote.total} rounded />}
            unit={tResults("totalFor", { count: nights ?? quote.nights })}
          />
        ) : (
          <PriceBlock figure={<MoneyText amount={listing.nightlyRate} rounded />} unit={t("perNight")} />
        )
      }
      cta={lease ? tList("ctaApply") : quote ? t("reserve") : tList("ctaCheckDates")}
    />
  );
}
