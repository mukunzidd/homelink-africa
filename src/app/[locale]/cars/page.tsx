import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import type { DriveMode } from "@/lib/domain/types";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { Button } from "@/components/ui/button";
import { DriveModeFilter } from "@/components/mobility/drive-mode-filter";

export default async function CarsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ driveMode?: string; seats?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const driveMode = (["selfDrive", "withDriver"] as const).includes(
    sp.driveMode as DriveMode,
  )
    ? (sp.driveMode as DriveMode)
    : undefined;
  const minSeats = Number(sp.seats) || undefined;

  const t = await getTranslations("cars");
  const tVerify = await getTranslations("verification");
  const tStatus = await getTranslations("status");
  const tEmpty = await getTranslations("empty");

  const vehicles = await repos().mobility.list({ driveMode, minSeats });

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("title")}
        </h1>
        <p className="max-w-[60ch] text-[15px] text-ink-2">
          {t("subtitle", { count: vehicles.length })}
        </p>
      </header>

      <DriveModeFilter />

      {vehicles.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-8">
          <h2 className="font-display text-xl font-semibold text-ink">
            {tEmpty("noResults")}
          </h2>
          <p className="mt-2 max-w-[56ch] text-sm text-ink-2">
            {tEmpty("noResultsBody")}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <article
              key={vehicle.id}
              className="flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-[var(--shadow-card)] transition-shadow duration-150 hover:shadow-[var(--shadow-pop)]"
            >
              <Link href={`/cars/${vehicle.slug}`}>
                <SupplyImage seed={vehicle.imageSeed} className="h-40">
                  <span className="absolute left-3 top-3">
                    <VerifiedBadge label={tVerify("badge")} size="sm" />
                  </span>
                </SupplyImage>
              </Link>

              <div className="flex flex-1 flex-col gap-1.5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
                  {t(`class.${vehicle.vehicleClass}`)} ·{" "}
                  {t(`transmission.${vehicle.transmission}`)}
                </p>

                <Link href={`/cars/${vehicle.slug}`} className="rounded-ctl">
                  <h2 className="font-display text-xl font-semibold leading-tight text-ink">
                    {vehicle.name}
                  </h2>
                </Link>

                <p className="text-sm text-ink-2">
                  {t("seats", { count: vehicle.seats })}
                  {!vehicle.driveModes.includes("selfDrive") &&
                    ` · ${t("driverIncluded")}`}
                </p>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <MoneyText
                    amount={vehicle.dailyRate}
                    className="text-lg font-bold text-ink"
                  />
                  <span className="text-sm text-ink-3">{t("perDay")}</span>
                </div>

                {vehicle.unitsAvailable <= 2 && (
                  <div className="mt-1">
                    <StatusPill tone="warn">
                      {tStatus("lowAvailability", {
                        count: vehicle.unitsAvailable,
                      })}
                    </StatusPill>
                  </div>
                )}

                <Link href={`/cars/${vehicle.slug}`} className="mt-auto pt-3">
                  <Button size="sm" variant="secondary" fullWidth>
                    {t("book")}
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
