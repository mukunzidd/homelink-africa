import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
import { Link } from "@/i18n/navigation";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";

/**
 * Discovery density.
 *
 * Style guide: warmth on discovery. Photo-led, 14px radius, the listing name
 * set in the display serif, room to breathe. The transaction-density variant
 * of the same listing is a different component on purpose — squarer, tighter,
 * tabular figures — because a card and a result row have different jobs.
 */
export async function ListingCard({ listing }: { listing: Listing }) {
  const t = await getTranslations("listing");
  const tVerify = await getTranslations("verification");
  const tStatus = await getTranslations("status");

  const scarce = listing.unitsAvailable <= 2;

  return (
    <article className="group overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-pop)]">
      <Link href={`/stays/${listing.slug}`} className="block">
        <SupplyImage seed={listing.imageSeed} className="h-44">
          <span className="absolute left-3 top-3">
            <VerifiedBadge label={tVerify("badge")} size="sm" />
          </span>
        </SupplyImage>

        <div className="flex flex-col gap-1.5 p-4 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
            {listing.neighbourhood} · {listing.city}
          </p>

          <h3 className="font-display text-xl font-semibold leading-tight text-ink">
            {listing.name}
          </h3>

          <p className="text-sm text-ink-2">
            {t("bedrooms", { count: listing.bedrooms })} ·{" "}
            {t("sleeps", { count: listing.sleeps })}
          </p>

          <div className="mt-2 flex items-baseline gap-1.5">
            <MoneyText
              amount={listing.nightlyRate}
              className="text-lg font-bold text-ink"
            />
            <span className="text-sm text-ink-3">{t("perNight")}</span>
          </div>

          {scarce && (
            <div className="mt-1.5">
              <StatusPill tone="warn">
                {tStatus("lowAvailability", { count: listing.unitsAvailable })}
              </StatusPill>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
