import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { addDays, today } from "@/lib/domain/dates";
import { parseStaySearch, type RawParams } from "@/lib/search-params";
import { quoteStay } from "@/lib/domain/pricing";
import { Gallery } from "@/components/ui/gallery";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { BookingPanel } from "@/components/listing/booking-panel";
import { VerificationRecordPanel } from "@/components/listing/verification-record";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await repos().stays.bySlug(slug);
  if (!listing) return {};

  return {
    title: `${listing.name}, ${listing.neighbourhood}`,
    description: listing.summary,
  };
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawParams>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = await repos().stays.bySlug(slug);
  if (!listing) notFound();

  const search = parseStaySearch(await searchParams);

  const t = await getTranslations("detail");
  const tListing = await getTranslations("listing");
  const tVerify = await getTranslations("verification");
  const tAmenities = await getTranslations("amenities");
  const tStatus = await getTranslations("status");

  // Dates the person already chose in search win. Otherwise default to three
  // nights a week out, so the price is concrete on arrival rather than asking
  // for input before showing anything at all.
  const defaultFrom = search.from ?? addDays(today(), 7);
  const defaultTo = search.to ?? addDays(defaultFrom, 3);

  // Whether escrow applies depends on the total, so it is decided from a
  // representative quote rather than from the nightly rate alone.
  const sampleQuote = quoteStay(listing, defaultFrom, defaultTo);
  const escrowApplies = sampleQuote?.escrowHeld ?? false;

  const canLease = listing.modes.includes("lease") && listing.monthlyRate;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-8">
      <Link
        href="/stays"
        className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← {t("backToStays")}
      </Link>

      {/* Discovery density: photography leads, the name is set in the serif. */}
      <header className="flex flex-col gap-4">
        <Gallery seed={listing.imageSeed} verifiedLabel={tVerify("badge")} />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
              {listing.neighbourhood} · {listing.city}
            </p>
            <h1 className="max-w-[20ch] text-balance font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink">
              {listing.name}
            </h1>
            <p className="text-[15px] text-ink-2">
              {tListing("bedrooms", { count: listing.bedrooms })} ·{" "}
              {tListing("sleeps", { count: listing.sleeps })}
            </p>
          </div>

          {listing.unitsAvailable <= 2 && (
            <StatusPill tone="warn">
              {tStatus("lowAvailability", { count: listing.unitsAvailable })}
            </StatusPill>
          )}
        </div>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("about")}
            </h2>
            <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
              {listing.summary}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
              {tAmenities("label")}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {listing.amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="flex items-center gap-2.5 text-[15px] text-ink-2"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 flex-none rounded-full bg-brand"
                  />
                  {tAmenities(amenity)}
                </li>
              ))}
            </ul>
          </section>

          <VerificationRecordPanel
            record={listing.verification}
            escrowApplies={escrowApplies}
          />

          {canLease && (
            <section className="flex flex-col gap-2.5 rounded-card border border-line bg-surface p-6">
              <h2 className="font-display text-xl font-semibold text-ink">
                {t("leaseAvailable")}
              </h2>
              <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
                {t("leaseBody")}
              </p>
              <p className="flex items-baseline gap-1.5 pt-1">
                <span className="text-sm text-ink-3">{t("monthlyFrom")}</span>
                <MoneyText
                  amount={listing.monthlyRate!}
                  className="text-lg font-bold text-ink"
                />
                <span className="text-sm text-ink-3">
                  {tListing("perMonth")}
                </span>
              </p>
            </section>
          )}
        </div>

        {/* Transaction density inside a discovery page. Intentional. */}
        <aside className="lg:sticky lg:top-20">
          <BookingPanel
            listing={listing}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
            defaultParty={search.party}
          />
        </aside>
      </div>
    </div>
  );
}
