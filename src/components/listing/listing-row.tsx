import { getTranslations } from "next-intl/server";
import type { Listing } from "@/lib/domain/types";
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
 * Same listing as ListingCard, different job: this one is being compared, not
 * discovered.
 */
export async function ListingRow({ listing }: { listing: Listing }) {
  const t = await getTranslations("listing");
  const tVerify = await getTranslations("verification");
  const tStatus = await getTranslations("status");

  return (
    <article className="flex flex-col gap-3 rounded-ctl border border-line bg-surface p-3 sm:flex-row sm:items-stretch sm:gap-4">
      <Link href={`/stays/${listing.slug}`} className="flex-none">
        <SupplyImage
          seed={listing.imageSeed}
          className="h-32 w-full rounded-[6px] sm:h-full sm:w-44"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-1">
        <Link href={`/stays/${listing.slug}`} className="rounded-ctl">
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
          {listing.unitsAvailable <= 2 && (
            <StatusPill tone="warn">
              {tStatus("lowAvailability", { count: listing.unitsAvailable })}
            </StatusPill>
          )}
        </div>
      </div>

      <div className="flex flex-row items-end justify-between gap-2 border-t border-line-soft pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-1">
        <div className="flex flex-col items-start sm:items-end">
          <MoneyText
            amount={listing.nightlyRate}
            className="text-lg font-bold leading-tight text-ink"
          />
          <span className="text-xs text-ink-3">{t("perNight")}</span>
        </div>
        <Button size="sm" className="sm:mt-auto">
          {t("reserve")}
        </Button>
      </div>
    </article>
  );
}
