import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { DriveMode } from "@/lib/domain/types";
import { formatDateRange, isIsoDate } from "@/lib/domain/dates";
import { quoteVehicle } from "@/lib/domain/pricing";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StepSpine } from "@/components/checkout/step-spine";
import { CheckoutForm } from "@/components/checkout/checkout-form";

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
  const tCars = await getTranslations("cars");
  const tSearch = await getTranslations("search");
  const tVerify = await getTranslations("verification");

  const intlLocale = INTL_LOCALES[locale as Locale];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <StepSpine current={3} />

      <h1 className="font-display text-3xl font-semibold text-ink">
        {t("title")}
      </h1>

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
        />

        <aside className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-20">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
            {t("yourStay")}
          </h2>

          <SupplyImage seed={vehicle.imageSeed} className="h-28 rounded-[6px]" />

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
                {formatDateRange(from, to, intlLocale)}
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
