import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ViewTracker } from "@/components/ui/view-tracker";

import { repos } from "@/lib/repos";
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
import { LeasePanel } from "@/components/listing/lease-panel";
import { Highlights } from "@/components/listing/highlights";
import { InspectorRow } from "@/components/listing/inspector-row";
import { VerificationRecordPanel } from "@/components/listing/verification-record";
import { SupplyOwnerBand } from "@/components/listing/supply-owner-band";
import { HostedBy } from "@/components/listing/hosted-by";
import { SaveButton } from "@/components/ui/save-button";
import { ShareButton } from "@/components/ui/share-button";
import { AreaMap } from "@/components/results/stays-map";
import { TravelTimes } from "@/components/results/travel-times";
import { MobileActionBar } from "@/components/ui/mobile-action-bar";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";

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

  const raw = await searchParams;
  const search = parseStaySearch(raw);
  const moveIn = typeof raw.movein === "string" && /^\d{4}-\d{2}$/.test(raw.movein) ? raw.movein : undefined;

  const t = await getTranslations("detail");
  const tB = await getTranslations("breadcrumb");
  const tListing = await getTranslations("listing");
  const tVerify = await getTranslations("verification");
  const tAmenities = await getTranslations("amenities");
  const tStatus = await getTranslations("status");
  const tCheckout = await getTranslations("checkout");
  const tOwner = await getTranslations("owner");
  const tMap = await getTranslations("map");
  const tPlaces = await getTranslations("places");

  // Dates already chosen in search win; otherwise three nights a week out, so
  // the panel opens on a real price rather than asking before showing anything.
  const defaultFrom = search.from ?? addDays(today(), 7);
  const defaultTo = search.to ?? addDays(defaultFrom, 3);

  const sampleQuote = quoteStay(listing, defaultFrom, defaultTo);
  const canLease = listing.modes.includes("lease") && listing.monthlyRate;
  const isLease = search.band === "long";
  // A lease view reads as a lease from top to bottom. The escrow promise is
  // about a nightly payment released at check-in, with another home the same
  // night if it is wrong; none of that is something the fixtures say about a
  // twelve-month tenancy, so the lease view talks about the deposit, the
  // move-in date and the viewing, which they do.
  const leaseTerms = isLease && canLease ? listing.leaseTerms : undefined;
  const escrowApplies = !isLease && (sampleQuote?.escrowHeld ?? false);
  const tList = await getTranslations("list");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const cancelBy = addDays(defaultFrom, -7);
  const cancellationDate = formatDate(
    cancelBy < today() ? today() : cancelBy,
    intlLocale,
  );

  // The unglamorous facts. A tenant's are the move-in date, the deposit and
  // the viewing; check-in times and a first-night refund belong to a stay.
  const thingsToKnow = leaseTerms
    ? [
        {
          title: t("lease.moveInTitle"),
          body: t("lease.moveInBody", { date: formatDate(leaseTerms.availableFrom, intlLocale) }),
        },
        {
          title: tList("deposit"),
          body: t("lease.depositBody", { deposit: tList("depositMonths", { count: leaseTerms.depositMonths }) }),
        },
        { title: t("lease.viewingTitle"), body: t("lease.viewingBody") },
      ]
    : [
        { title: t("houseRules"), body: t("houseRulesBody") },
        { title: t("cancellationTitle"), body: tCheckout("cancellation", { date: cancellationDate }) },
        {
          title: t("safetyTitle"),
          body: escrowApplies ? tVerify("steps.escrowBody") : tVerify("steps.identityBody"),
        },
      ];

  const specs = [
    tListing("bedrooms", { count: listing.bedrooms }),
    tListing("sleeps", { count: listing.sleeps }),
  ].join(" · ");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <SupplyOwnerBand
        kind="stay"
        slug={listing.slug}
        supplyItemId={listing.id}
        // On the Rent view the owner is looking at a lease, so the band shows
        // what a tenant pays a month and when the place is free, not tonight's
        // rate and a count of free units that only means something nightly.
        rate={isLease && listing.monthlyRate ? listing.monthlyRate : listing.nightlyRate}
        rateLabel={isLease && listing.monthlyRate ? tListing("perMonth") : tListing("perNight")}
        extra={
          isLease && listing.leaseTerms
            ? { label: tOwner("freeFrom"), value: formatDate(listing.leaseTerms.availableFrom, intlLocale, { day: "numeric", month: "short", year: "numeric" }) }
            : { label: tOwner("free"), value: String(listing.unitsAvailable) }
        }
        record={listing.verification}
      />

      <ViewTracker href={`/stays/${listing.slug}`} name={listing.name} kind="stay" image={listing.images?.[0]} />
      <Breadcrumbs
        trail={[
          { label: tB("homes"), href: "/stays" },
          search.band === "long"
            ? { label: tB("rent"), href: "/stays?band=long" }
            : { label: tB("stay"), href: "/stays" },
          {
            label: listing.neighbourhood,
            href: `/stays?neighbourhood=${encodeURIComponent(listing.neighbourhood)}${search.band === "long" ? "&band=long" : ""}`,
          },
          { label: listing.name },
        ]}
      />

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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <VerifiedBadge label={tVerify("badge")} size="sm" />
            <span className="text-[15px] text-ink-2">
              {listing.neighbourhood} · {listing.city}
            </span>
            {/* Only once dates are chosen: scarcity for no dates is no fact. */}
            {search.from && search.to && listing.unitsAvailable <= 2 && (
              <StatusPill tone="warn">
                {tStatus("lowAvailability", { count: listing.unitsAvailable })}
              </StatusPill>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ShareButton title={listing.name} />
            <SaveButton id={listing.id} kind="stay" name={listing.name} variant="inline" />
          </div>
        </div>
      </header>

      <Gallery
        seed={listing.imageSeed}
        images={listing.images}
        alt={listing.name}
        verifiedLabel={tVerify("badge")}
      />

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

          <div className="flex flex-col gap-5 border-t border-line py-6">
            <InspectorRow record={listing.verification} />
            <HostedBy manager={listing.propertyManager} />
          </div>

          <div className="border-t border-line py-6">
            <Highlights
              listing={listing}
              record={listing.verification}
              escrowApplies={escrowApplies}
              lease={leaseTerms}
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

          {/* An area, not a pin. The address goes to the guest with the
              booking, or to a tenant with the viewing; before that, the
              street is enough to judge the commute and too little to turn up
              at the gate. */}
          <section className="flex flex-col gap-4 border-t border-line py-6">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl font-semibold text-ink">{tMap("whereTitle")}</h2>
              <p className="text-[15px] text-ink-2">
                {listing.neighbourhood}, {DISTRICTS[listing.neighbourhood] ?? listing.city} · {listing.city}
              </p>
            </div>
            <AreaMap
              label={tMap("areaLabel", { place: listing.neighbourhood })}
              area={{ lat: listing.location.lat, lng: listing.location.lng, radiusM: 350 }}
              className="h-72 rounded-card border border-line"
            />
            <p className="max-w-[62ch] text-[14px] leading-relaxed text-ink-2">
              {tPlaces.has(listing.neighbourhood) ? `${tPlaces(listing.neighbourhood)} ` : ""}
              {isLease ? tMap("areaNoteLease") : tMap("areaNote")}
            </p>
            <TravelTimes point={listing.location} />
          </section>

          <div className="border-t border-line py-6">
            <VerificationRecordPanel
              record={listing.verification}
              escrowApplies={escrowApplies}
            />
          </div>

          {isLease && listing.leaseTerms && (
            <section className="flex flex-col gap-4 border-t border-line py-6">
              <h2 className="font-display text-2xl font-semibold text-ink">{tList("leaseTermsTitle")}</h2>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-3">
                <div className="flex flex-col gap-0.5 bg-surface px-4 py-3">
                  <dt className="text-[12px] text-ink-3">{tList("deposit")}</dt>
                  <dd className="text-[15px] font-semibold text-ink">
                    {tList("depositMonths", { count: listing.leaseTerms.depositMonths })}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5 bg-surface px-4 py-3">
                  <dt className="text-[12px] text-ink-3">{tList("availableFrom")}</dt>
                  <dd className="text-[15px] font-semibold text-ink">{formatDate(listing.leaseTerms.availableFrom, intlLocale)}</dd>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5 bg-surface px-4 py-3 sm:col-span-1">
                  <dt className="text-[12px] text-ink-3">{tList("minimumTerm")}</dt>
                  <dd className="text-[15px] font-semibold text-ink">{tList("twelveMonths")}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <h3 className="text-[15px] font-semibold text-ink">{tList("includedInRent")}</h3>
                <ul className="flex flex-wrap gap-2">
                  {listing.leaseTerms.includes.map((k) => (
                    <li key={k} className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-2">{tList(`included.${k}`)}</li>
                  ))}
                </ul>
                <p className="text-[13px] text-ink-3">{tList("excludedNote")}</p>
              </div>
            </section>
          )}

          {canLease && !isLease && (
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
                  className="text-lg font-semibold text-ink"
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
              {thingsToKnow.map((block) => (
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
        <aside id="book" className="scroll-mt-[calc(var(--header-offset)+1rem)] lg:sticky lg:top-24 lg:self-start">
          {isLease && canLease ? (
            <LeasePanel
              monthly={listing.monthlyRate!}
              slug={listing.slug}
              name={listing.name}
              initialMoveIn={moveIn}
              availableFrom={listing.leaseTerms?.availableFrom}
            />
          ) : (
            <BookingPanel
              listing={listing}
              defaultFrom={defaultFrom}
              defaultTo={defaultTo}
              defaultParty={search.party}
            />
          )}
        </aside>
      </div>

      <MobileActionBar target="book" cta={isLease && canLease ? tList("ctaApply") : tListing("reserve")}>
        <span className="text-[16px] font-semibold text-ink">
          <MoneyText amount={isLease && canLease ? listing.monthlyRate! : listing.nightlyRate} rounded />
        </span>
        <span className="text-[12px] text-ink-3">{isLease && canLease ? tListing("perMonth") : tListing("perNight")}</span>
      </MobileActionBar>
    </div>
  );
}
