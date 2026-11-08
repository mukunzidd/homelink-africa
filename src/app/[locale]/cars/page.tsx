import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import type { DriveMode } from "@/lib/domain/types";
import { isIsoDate, nightsBetween } from "@/lib/domain/dates";
import { multiply } from "@/lib/domain/money";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { ResultCard, PriceBlock } from "@/components/results/result-card";
import { ListHeader, ListToolbar, ListEnd } from "@/components/results/list-layout";
import { NoMatch } from "@/components/results/no-match";
import { CarFilters, CarSearchBar } from "@/components/mobility/car-search";
import { CheckIcon } from "@/components/ui/icons";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cars" });
  return { title: t("title") };
}

/**
 * Cars, in the same frame as every other lane: a search bar for when and
 * where, a count with its promise, the filters that rule a car out, the
 * fleet, and an end. What every hire includes is said once above the cards
 * rather than repeated on four of them.
 */
export default async function CarsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ driveMode?: string; seats?: string; gear?: string; from?: string; to?: string; place?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const driveMode = (["selfDrive", "withDriver"] as const).includes(sp.driveMode as DriveMode)
    ? (sp.driveMode as DriveMode)
    : undefined;
  const minSeats = Number(sp.seats) || undefined;
  const gear = sp.gear === "automatic" || sp.gear === "manual" ? sp.gear : undefined;
  const from = isIsoDate(sp.from) ? sp.from : undefined;
  const to = from && isIsoDate(sp.to) && sp.to > from ? sp.to : undefined;
  const days = from && to ? nightsBetween(from, to) : 0;

  const t = await getTranslations("cars");
  const tList = await getTranslations("list");
  const tStatus = await getTranslations("status");
  const tEmpty = await getTranslations("empty");
  const tLanes = await getTranslations("nav");

  const r = repos();
  const [filtered, all] = await Promise.all([r.mobility.list({ driveMode, minSeats }), r.mobility.list()]);
  const vehicles = filtered.filter((v) => !gear || v.transmission === gear);

  const dateQuery = from && to ? `?from=${from}&to=${to}` : "";

  const card = (vehicle: (typeof all)[number], i: number) => (
    <ResultCard
      key={vehicle.id}
      layout="tile"
      priority={i === 0}
      href={`/cars/${vehicle.slug}${dateQuery}`}
      title={vehicle.name}
      meta={[
        t(`class.${vehicle.vehicleClass}`),
        t(`transmission.${vehicle.transmission}`),
        t("seats", { count: vehicle.seats }),
        !vehicle.driveModes.includes("selfDrive") ? t("driverIncluded") : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      image={{ seed: vehicle.imageSeed, src: vehicle.images?.[0], count: vehicle.images?.length ?? 0 }}
      save={{ id: vehicle.id, kind: "car", name: vehicle.name }}
      inspection={vehicle.verification}
      tags={
        days > 0 && vehicle.unitsAvailable <= 2 ? (
          <StatusPill tone="warn">{tStatus("lowAvailability", { count: vehicle.unitsAvailable })}</StatusPill>
        ) : undefined
      }
      price={
        days > 0 ? (
          <PriceBlock
            figure={<MoneyText amount={multiply(vehicle.dailyRate, days)} rounded />}
            unit={tList("totalForDays", { count: days })}
          />
        ) : (
          <PriceBlock figure={<MoneyText amount={vehicle.dailyRate} rounded />} unit={t("perDay")} />
        )
      }
      cta={tList("ctaHire")}
    />
  );

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-6 py-6 sm:py-8">
      <CarSearchBar key={`${from}-${to}-${sp.place}`} initial={{ from, to, place: sp.place }} />

      <ListHeader
        title={tList("carsCount", { count: vehicles.length })}
        subtitle={tList("carsPromise")}
      />

      {/* Said once, not on every card: what every hire comes with. */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 rounded-card border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
        {(["insurance", "mileage", "handover", "roadside"] as const).map((k) => (
          <li key={k} className="flex items-center gap-1.5">
            <CheckIcon size={14} className="text-brand" />
            {tList(`carIncludes.${k}`)}
          </li>
        ))}
      </ul>

      <ListToolbar start={<CarFilters />} end={null} />

      {vehicles.length === 0 ? (
        <NoMatch title={tEmpty("noResults")} body={tList("noCarBody")} lane="cars">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{all.slice(0, 3).map(card)}</div>
        </NoMatch>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{vehicles.map(card)}</div>
          <ListEnd
            count={vehicles.length}
            lane="cars"
            others={[
              { label: tLanes("homesLane"), href: "/stays" },
              { label: tLanes("experiences"), href: "/experiences" },
            ]}
          />
        </>
      )}
    </div>
  );
}
