import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { DriveMode } from "@/lib/domain/types";
import {
  addDays,
  formatDate,
  formatDateRange,
  isIsoDate,
  today,
} from "@/lib/domain/dates";
import { quoteVehicle } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StepSpine } from "@/components/checkout/step-spine";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { SummaryRow } from "@/components/checkout/summary-row";

export default async function BookCarPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; driveMode?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const vehicle = await repos().mobility.bySlug(slug);
  if (!vehicle) notFound();

  const sp = await searchParams;
  const from = isIsoDate(sp.from) ? sp.from : null;
  const to = isIsoDate(sp.to) && from && sp.to >= from ? sp.to : null;
  if (!from || !to) redirect(`/${locale}/cars/${slug}`);

  const driveMode: DriveMode =
    sp.driveMode === "withDriver" || !vehicle.driveModes.includes("selfDrive")
      ? "withDriver"
      : "selfDrive";

  const quote = quoteVehicle(vehicle, from, to, driveMode);
  if (!quote) redirect(`/${locale}/cars/${slug}`);

  const t = await getTranslations("checkout");
  const tB = await getTranslations("breadcrumb");
  const tCars = await getTranslations("cars");
  const tSearch = await getTranslations("search");
  const tVerify = await getTranslations("verification");

  const intlLocale = INTL_LOCALES[locale as Locale];
  const hireRange = formatDateRange(from, to, intlLocale);

  // The rule the detail page states: free until two days before pick-up,
  // or today if that has passed.
  const cancelBy = addDays(from, -2);
  const cancellationDate = formatDate(
    cancelBy < today() ? today() : cancelBy,
    intlLocale,
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <Breadcrumbs
        trail={[
          { label: tB("cars"), href: "/cars" },
          { label: vehicle.name, href: `/cars/${vehicle.slug}` },
          { label: tB("book") },
        ]}
      />
      <StepSpine current={3} lane="car" />

      <h1 className="font-display text-3xl font-semibold text-ink">
        {t("title")}
      </h1>

      <SummaryRow
        imageSeed={vehicle.imageSeed}
        image={vehicle.images?.[0]}
        title={vehicle.name}
        facts={[hireRange, tCars(driveMode)]}
        changeHref={`/cars/${vehicle.slug}`}
        changeLabel={t("changeDates")}
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
        <CheckoutForm
          item={{
            kind: "car",
            id: vehicle.id,
            slug: vehicle.slug,
            name: vehicle.name,
            unitRate: vehicle.dailyRate,
          }}
          quote={quote}
          units={quote.nights}
          detailHref={`/cars/${vehicle.slug}`}
          confirmQuery={{ slug: vehicle.slug, from, to, driveMode }}
          referenceSeed={`${vehicle.id}:${from}:${to}:${driveMode}`}
          cancellationNote={tCars("cancellationBody", { date: cancellationDate })}
          guarantee={{
            inspector: vehicle.verification.inspectorName,
            inspectedOn: formatDate(vehicle.verification.inspectedAt, intlLocale, {
              day: "numeric",
              month: "long",
              year: "numeric",
            }),
            points: vehicle.verification.checklistPoints,
          }}
        />

        {/* Below lg the summary row above stands in for this card, which would
            otherwise arrive after the Pay button. */}
        <aside className="hidden flex-col gap-3 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-20 lg:flex">
          <h2 className="text-xs font-medium text-ink-3">
            {t("summaryTitle.car")}
          </h2>

          <SupplyImage
            seed={vehicle.imageSeed}
            src={vehicle.images?.[0]}
            alt={vehicle.name}
            sizes="320px"
            className="h-28 rounded-inner"
          />

          <div className="flex flex-col gap-1">
            <h3 className="text-[15px] font-semibold leading-snug text-ink">
              {vehicle.name}
            </h3>
            <p className="text-[13px] text-ink-3">
              {tCars(`class.${vehicle.vehicleClass}`)} ·{" "}
              {tCars("seats", { count: vehicle.seats })}
            </p>
          </div>

          <VerifiedBadge label={tVerify("badge")} size="sm" className="self-start" />

          <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tSearch("when")}</dt>
              <dd className="tnum text-right text-ink">
                {hireRange}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-3">{tCars("driveMode")}</dt>
              <dd className="text-right text-ink">{tCars(driveMode)}</dd>
            </div>
          </dl>

          <Link
            href={`/cars/${vehicle.slug}`}
            className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
          >
            {t("changeDates")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
