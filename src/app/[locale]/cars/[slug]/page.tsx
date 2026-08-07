import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { addDays, isIsoDate, today } from "@/lib/domain/dates";
import { Gallery } from "@/components/ui/gallery";
import { StatusPill } from "@/components/ui/status-pill";
import { HirePanel } from "@/components/mobility/hire-panel";
import { VerificationRecordPanel } from "@/components/listing/verification-record";

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

  const specs = [
    t(`class.${vehicle.vehicleClass}`),
    t(`transmission.${vehicle.transmission}`),
    t("seats", { count: vehicle.seats }),
  ];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-8">
      <Link
        href="/cars"
        className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
      >
        ← {t("backToCars")}
      </Link>

      <header className="flex flex-col gap-4">
        <Gallery
          seed={vehicle.imageSeed}
          count={4}
          verifiedLabel={tVerify("badge")}
        />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
              {specs.join(" · ")}
            </p>
            <h1 className="font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink">
              {vehicle.name}
            </h1>
          </div>

          {vehicle.unitsAvailable <= 2 && (
            <StatusPill tone="warn">
              {tStatus("lowAvailability", { count: vehicle.unitsAvailable })}
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
              {vehicle.summary}
            </p>
            <p className="text-sm text-ink-2">{t("airportPickup")}</p>
          </section>

          {/* A vehicle carries the same guarantee as a home: someone from the
              team inspected this exact car, and the record says who. */}
          <VerificationRecordPanel
            record={vehicle.verification}
            escrowApplies={false}
            kind="car"
          />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
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
