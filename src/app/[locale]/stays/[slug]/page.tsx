import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addDays, formatDate, today } from "@/lib/domain/dates";
import { parseStaySearch, type RawParams } from "@/lib/search-params";
import { quoteStay } from "@/lib/domain/pricing";
import { Gallery } from "@/components/ui/gallery";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { AmenityIcon } from "@/components/listing/amenity-icon";
import { BookingPanel } from "@/components/listing/booking-panel";
import { Highlights } from "@/components/listing/highlights";
import { InspectorRow } from "@/components/listing/inspector-row";
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
  const tCheckout = await getTranslations("checkout");

  // Dates already chosen in search win; otherwise three nights a week out, so
  // the panel opens on a real price rather than asking before showing anything.
  const defaultFrom = search.from ?? addDays(today(), 7);
  const defaultTo = search.to ?? addDays(defaultFrom, 3);

  const sampleQuote = quoteStay(listing, defaultFrom, defaultTo);
  const escrowApplies = sampleQuote?.escrowHeld ?? false;
  const canLease = listing.modes.includes("lease") && listing.monthlyRate;

  const intlLocale = INTL_LOCALES[locale as Locale];
  const cancelBy = addDays(defaultFrom, -7);
  const cancellationDate = formatDate(
    cancelBy < today() ? today() : cancelBy,
    intlLocale,
  );

  const specs = [
    tListing("bedrooms", { count: listing.bedrooms }),
    tListing("sleeps", { count: listing.sleeps }),
  ].join(" · ");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <Link
        href="/stays"
        className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← {t("backToStays")}
      </Link>

      {/*
        Title above the gallery, not below it. The name and the place are what
        someone arriving from a result row needs in order to confirm they
        clicked the right thing; making them scroll past a photograph to find
        out is a small cruelty repeated on every visit.
      */}
      <header className="flex flex-col gap-3">
        <h1 className="max-w-[24ch] text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {listing.name}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <VerifiedBadge label={tVerify("badge")} size="sm" />
          <span className="text-[15px] text-ink-2">
            {listing.neighbourhood} · {listing.city}
          </span>
          {listing.unitsAvailable <= 2 && (
            <StatusPill tone="warn">
              {tStatus("lowAvailability", { count: listing.unitsAvailable })}
            </StatusPill>
          )}
        </div>
      </header>

      <Gallery seed={listing.imageSeed} verifiedLabel={tVerify("badge")} />

      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[1fr_380px]">
        {/* Hairline rules between sections rather than cards: this column is
            one continuous read, and boxing each part would turn it into a
            list of unrelated panels. */}
        <div className="flex flex-col">
          <section className="flex flex-col gap-1 pb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("entirePlace")} · {listing.neighbourhood}
            </h2>
            <p className="text-[15px] text-ink-2">{specs}</p>
          </section>

          <div className="border-t border-line py-6">
            <InspectorRow record={listing.verification} />
          </div>

          <div className="border-t border-line py-6">
            <Highlights
              listing={listing}
              record={listing.verification}
              escrowApplies={escrowApplies}
            />
          </div>

          <section className="flex flex-col gap-3 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("about")}
            </h2>
            <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
              {listing.summary}
            </p>
          </section>

          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {tAmenities("label")}
            </h2>
            {/* Icons rather than bullets: a row of identical dots next to
                "Backup power" and "Fibre internet" carries no information. */}
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {listing.amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="flex items-center gap-3.5 text-[15px] text-ink"
                >
                  <AmenityIcon amenity={amenity} className="flex-none text-ink-2" />
                  {tAmenities(amenity)}
                </li>
              ))}
            </ul>
          </section>

          <div className="border-t border-line py-6">
            <VerificationRecordPanel
              record={listing.verification}
              escrowApplies={escrowApplies}
            />
          </div>

          {canLease && (
            <section className="flex flex-col gap-2.5 border-t border-line py-6">
              <h2 className="font-display text-2xl font-semibold text-ink">
                {t("leaseAvailable")}
              </h2>
              <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">
                {t("leaseBody")}
              </p>
              <p className="flex items-baseline gap-1.5 pt-1">
                <span className="text-sm text-ink-3">{t("monthlyFrom")}</span>
                <MoneyText
                  amount={listing.monthlyRate!}
                  className="text-lg font-bold text-ink"
                />
                <span className="text-sm text-ink-3">{tListing("perMonth")}</span>
              </p>
            </section>
          )}

          {/* The unglamorous facts, gathered in one place, before someone pays
              rather than after they arrive. */}
          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("thingsToKnow")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { title: t("houseRules"), body: t("houseRulesBody") },
                {
                  title: t("cancellationTitle"),
                  body: tCheckout("cancellation", { date: cancellationDate }),
                },
                {
                  title: t("safetyTitle"),
                  body: escrowApplies
                    ? tVerify("steps.escrowBody")
                    : tVerify("steps.identityBody"),
                },
              ].map((block) => (
                <div key={block.title} className="flex flex-col gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">
                    {block.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-2">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Transaction density inside a discovery page. Intentional. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
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
