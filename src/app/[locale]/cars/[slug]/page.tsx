import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addDays, formatDate, isIsoDate, today } from "@/lib/domain/dates";
import { Gallery } from "@/components/ui/gallery";
import { StatusPill } from "@/components/ui/status-pill";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { HirePanel } from "@/components/mobility/hire-panel";
import { VehicleHighlights } from "@/components/mobility/vehicle-highlights";
import { InspectorRow } from "@/components/listing/inspector-row";
import { VerificationRecordPanel } from "@/components/listing/verification-record";
import { SupplyOwnerBand } from "@/components/listing/supply-owner-band";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await repos().mobility.bySlug(slug);
  if (!vehicle) return {};
  return { title: vehicle.name, description: vehicle.summary };
}

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const vehicle = await repos().mobility.bySlug(slug);
  if (!vehicle) notFound();

  const sp = await searchParams;
  const t = await getTranslations("cars");
  const tVerify = await getTranslations("verification");
  const tStatus = await getTranslations("status");

  const defaultFrom = isIsoDate(sp.from) ? sp.from : addDays(today(), 7);
  const defaultTo =
    isIsoDate(sp.to) && sp.to > defaultFrom ? sp.to : addDays(defaultFrom, 2);

  const intlLocale = INTL_LOCALES[locale as Locale];
  const cancelBy = addDays(defaultFrom, -2);
  const cancellationDate = formatDate(
    cancelBy < today() ? today() : cancelBy,
    intlLocale,
  );

  const driverOnly = !vehicle.driveModes.includes("selfDrive");

  // The stays page reads "Entire place · Kacyiru" then "2 bedrooms · Sleeps 4":
  // what kind of thing, then the numbers. A car's equivalent of "what kind" is
  // how you get hold of it, not what body shape it is — that is already in the
  // strip beside the badge.
  const heading = driverOnly ? t("driverOnlyHeading") : t("bothModesHeading");
  const specs = [
    t(`transmission.${vehicle.transmission}`),
    t("seats", { count: vehicle.seats }),
    t("airportPickup"),
  ].join(" · ");

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <SupplyOwnerBand
        kind="car"
        supplyItemId={vehicle.id}
        rate={vehicle.dailyRate}
        rateLabel={t("perDay")}
        availability={tStatus("lowAvailability", { count: vehicle.unitsAvailable })}
        record={vehicle.verification}
      />

      <Link
        href="/cars"
        className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← {t("backToCars")}
      </Link>

      {/* Title above the gallery, for the same reason it is above the gallery
          on a stay: someone arriving from a result row needs to confirm they
          clicked the right car before they are asked to admire it. */}
      <header className="flex flex-col gap-3">
        <h1 className="max-w-[24ch] text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {vehicle.name}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <VerifiedBadge label={tVerify("badge")} size="sm" />
          <span className="text-[15px] text-ink-2">
            {t(`class.${vehicle.vehicleClass}`)} · {t("basedIn")}
          </span>
          {vehicle.unitsAvailable <= 2 && (
            <StatusPill tone="warn">
              {tStatus("lowAvailability", { count: vehicle.unitsAvailable })}
            </StatusPill>
          )}
        </div>
      </header>

      <Gallery
        seed={vehicle.imageSeed}
        images={vehicle.images}
        alt={vehicle.name}
        verifiedLabel={tVerify("badge")}
      />

      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col">
          <section className="flex flex-col gap-1 pb-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {heading}
            </h2>
            <p className="text-[15px] text-ink-2">{specs}</p>
          </section>

          <div className="border-t border-line py-6">
            <InspectorRow record={vehicle.verification} />
          </div>

          <div className="border-t border-line py-6">
            <VehicleHighlights vehicle={vehicle} />
          </div>

          <section className="flex flex-col gap-3 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("about")}
            </h2>
            <p className="max-w-[65ch] text-[17px] leading-relaxed text-ink-2">
              {vehicle.summary}
            </p>
          </section>

          {/* A vehicle carries the same guarantee as a home: someone from the
              team inspected this exact car, and the record says who. */}
          <div className="border-t border-line py-6">
            <VerificationRecordPanel
              record={vehicle.verification}
              escrowApplies={false}
              kind="car"
            />
          </div>

          {/* The unglamorous facts, gathered before someone pays rather than
              discovered at the counter. A hire desk is where surprise fees
              live, so this is where the promise about them gets kept. */}
          <section className="flex flex-col gap-4 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">
              {t("thingsToKnow")}
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  title: t("paperworkTitle"),
                  body: driverOnly
                    ? t("paperworkDriverBody")
                    : t("paperworkSelfBody"),
                },
                { title: t("fuelTitle"), body: t("fuelBody") },
                {
                  // Not the stay wording. A hire cancelled late costs a day,
                  // not a night, and the two are not the same amount of money.
                  title: t("cancellationTitle"),
                  body: t("cancellationBody", { date: cancellationDate }),
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

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <HirePanel
            vehicle={vehicle}
            defaultFrom={defaultFrom}
            defaultTo={defaultTo}
          />
        </aside>
      </div>
    </div>
  );
}
