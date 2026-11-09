import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import { copy } from "./arrival.copy";
import { pick } from "./copy";
import { Link } from "@/i18n/navigation";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { initials } from "@/components/results/inspected-by";
import { HeroSearch } from "@/components/search/hero-search";
import { ListingRow } from "@/components/listing/listing-row";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { ArrowRightIcon, CheckIcon, ClockIcon, PinIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/*
  Candidate home page "arrival": the page is a visitor's first day in
  Kigali, top to bottom. The first screen holds the headline, the search and
  day one built from today's data (a car that comes with a driver, the
  newest inspected home with its record, its neighbourhood, a day out). The
  rest of the page unfolds the same four stages along one route line, each
  with the real things for that hour of the day, and the lanes and the three
  promises sit at the stage where they matter rather than in a block of
  their own. The numbered markers on the route are the page's one
  signature, used on the route and nowhere else.
*/

type Lane = LandingData["lanes"][number];

export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const c = pick(copy, locale);
  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tCars = await getTranslations("cars");
  const tExp = await getTranslations("experiences");
  const tSmart = await getTranslations("smart");

  const { cars, days, places, from, featured, lanes } = data;
  const lane = (key: Lane["key"]) => lanes.find((l) => l.key === key)!;

  return (
    <div className="flex flex-col">
      {/* z-10 so the search's answer, which drops below the field, paints over day one. */}
      <section className="relative isolate z-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-10 px-6 pb-12 pt-10 lg:gap-14 lg:pb-12 lg:pt-16">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
            <h1 className="max-w-[14ch] text-balance font-display text-[40px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[60px]">
              {t("heroTitle")}
            </h1>
            <div className="flex flex-col items-start gap-5">
              <p className="max-w-[44ch] text-[17px] leading-relaxed text-ink-2">{t("heroBody")}</p>
              <div className="w-full">
                <HeroSearch />
              </div>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                <span className="tnum">{tTrust("listingsVerified", { count: data.total })}</span>
                <span aria-hidden>·</span>
                <span>{tTrust("escrowProtected")}</span>
              </p>
            </div>
          </div>
          <DayOne data={data} locale={locale} />
        </div>
      </section>

      <section aria-labelledby="route-title" className="mx-auto w-full max-w-[1180px] px-6 pb-16 pt-8 lg:pt-12">
        <h2 id="route-title" className="sr-only">{c.routeTitle}</h2>
        <ol>
          <Stage n={1} title={c.stages.land} last={false}
            aside={
              <>
                <p className="text-[15px] leading-relaxed text-ink-2">{c.bodies.land}</p>
                <p className="flex items-center gap-2 text-[14px] text-ink-2">
                  <CheckIcon className="flex-none text-trust" />
                  {tCars("airportPickup")}
                </p>
                <Pledge title={t("how.peopleTitle")} body={t("how.peopleBody")} />
                <LaneLinks lanes={[lane("cars")]} />
              </>
            }
          >
            {/* A list, not a grid of cards: the cars are compared on the
                same few facts, and it keeps this stage from repeating the
                photo cards of the stages after it. */}
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
              {cars.map((v) => (
                <li key={v.id}>
                  <Link href={`/cars/${v.slug}`} className="group flex items-center gap-4 p-3 transition-colors duration-150 hover:bg-surface-2 sm:p-4">
                    <SupplyImage seed={v.imageSeed} src={v.images?.[0]} alt={v.name} sizes="160px" className="h-20 w-24 flex-none rounded-[8px] sm:h-24 sm:w-40" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[16px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{v.name}</span>
                      <span className="text-[13px] text-ink-3">
                        {tCars(`class.${v.vehicleClass}`)} · {tCars("seats", { count: v.seats })} · {tCars(`transmission.${v.transmission}`)}
                      </span>
                      <span className="text-[13px] text-ink-2">{v.driveModes.map((m) => tCars(m)).join(" · ")}</span>
                      <span className="flex items-baseline gap-1 sm:hidden">
                        <MoneyText amount={v.dailyRate} rounded className="font-semibold text-ink" />
                        <span className="text-[13px] text-ink-3">{tCars("perDay")}</span>
                      </span>
                    </span>
                    <span className="hidden flex-none flex-col items-end sm:flex">
                      <MoneyText amount={v.dailyRate} rounded className="text-[17px] font-semibold text-ink" />
                      <span className="text-[13px] text-ink-3">{tCars("perDay")}</span>
                    </span>
                    <ArrowRightIcon className="hidden flex-none text-ink-3 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-brand sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          </Stage>

          <Stage n={2} title={c.stages.settle} last={false}
            aside={
              <>
                <p className="text-[15px] leading-relaxed text-ink-2">{c.bodies.settle}</p>
                <Pledge title={t("how.inspectTitle")} body={t("how.inspectBody")} />
                <Pledge title={t("how.escrowTitle")} body={t("how.escrowBody")} />
                <LaneLinks lanes={[lane("stays"), lane("homes"), lane("buy")]} />
              </>
            }
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {featured.map((listing) => (
                <ListingRow key={listing.id} listing={listing} layout="tile" />
              ))}
            </div>
          </Stage>

          <Stage n={3} title={c.stages.look} last={false}
            aside={<p className="text-[15px] leading-relaxed text-ink-2">{t("placesBody")}</p>}
          >
            <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-8">
              {places.map((p) => {
                const price = from.get(p.name);
                return (
                  <li key={p.name} className="border-b border-line">
                    <Link href={`/neighbourhoods/${p.name.toLowerCase()}`} className="group flex h-16 items-center justify-between gap-4 rounded-ctl">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[16px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{p.name}</span>
                        <span className="text-[13px] text-ink-3">{DISTRICTS[p.name] ?? "Kigali"}</span>
                      </span>
                      <span className="flex flex-none flex-col items-end text-[13px]">
                        <span className="tnum text-ink-2">{tSmart("placeCount", { count: p.count })}</span>
                        {price && (
                          <span className="text-ink-3">
                            {t("fromPrice")} <MoneyText amount={price} rounded className="font-medium text-ink" />
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Stage>

          <Stage n={4} title={c.stages.further} last
            aside={
              <>
                <p className="text-[15px] leading-relaxed text-ink-2">{t("daysBody")}</p>
                <LaneLinks lanes={[lane("experiences")]} />
              </>
            }
          >
            <ul className="grid gap-4 sm:grid-cols-2">
              {days.map((e) => (
                <li key={e.id}>
                  <Link href={`/experiences/${e.slug}`} className="group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors duration-150 hover:border-brand/40">
                    <SupplyImage seed={e.imageSeed} src={e.images?.[0]} alt={e.name} sizes="(max-width: 640px) 100vw, 380px" className="h-44" />
                    <span className="flex flex-1 flex-col gap-2 p-4">
                      <span className="text-[16px] font-medium leading-snug text-ink">{e.name}</span>
                      <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
                        <span className="tnum">{c.departs.replace("{time}", e.departs)}</span>
                        <span className="flex items-center gap-1"><ClockIcon size={14} className="text-ink-3" />{tExp("duration", { count: e.durationHours })}</span>
                        <span className="flex items-center gap-1"><UsersIcon size={14} className="text-ink-3" />{tExp("groupMax", { count: e.groupMax })}</span>
                      </span>
                      <span className="mt-auto flex items-baseline gap-1 pt-2">
                        <MoneyText amount={e.pricePerPerson} rounded className="font-semibold text-ink" />
                        <span className="text-[13px] text-ink-3">{tExp("perPerson")}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Stage>
        </ol>
      </section>
    </div>
  );
}

/** The signature: a stage number on the route line. Used on the route and nowhere else. */
function Marker({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn("relative z-10 grid h-6 w-8 flex-none place-items-center rounded-[6px] border border-line font-mono text-[11px] leading-none text-ink-2 tnum", className)}>
      {String(n).padStart(2, "0")}
    </span>
  );
}

/*
  Day one, from today's data: the car that comes with its driver, the
  newest inspection on the site, that home's neighbourhood and a day out.
  Across on a desktop, down on a phone, joined by the route line.
*/
async function DayOne({ data, locale }: { data: LandingData; locale: string }) {
  const c = pick(copy, locale);
  const t = await getTranslations("landing");
  const tCars = await getTranslations("cars");
  const tExp = await getTranslations("experiences");
  const tVerify = await getTranslations("verification");
  const tSmart = await getTranslations("smart");
  const { latest, record, cars, days, places, from } = data;

  // The newest-inspected car that comes with its driver, so stage one is a
  // person waiting at arrivals and not a set of keys at a desk.
  const car =
    [...cars].filter((v) => v.driveModes.includes("withDriver")).sort((a, b) => b.verification.inspectedAt.localeCompare(a.verification.inspectedAt))[0] ?? cars[0];
  const day = days.find((d) => d.interests.includes("wildlife")) ?? days[0];
  const place = latest ? places.find((p) => p.name === latest.neighbourhood) : undefined;
  const price = place ? from.get(place.name) : undefined;

  const stop = "relative flex flex-col gap-3 p-4 lg:p-5";
  const body = "flex gap-3 pl-10 lg:flex-col lg:pl-0";
  const thumb = "size-20 flex-none rounded-[8px] lg:h-28 lg:w-full";

  return (
    <div className="flex flex-col gap-3">
      <p id="day-one" className="text-[13px] text-ink-3">{c.dayOne}</p>
      <ol aria-labelledby="day-one" className="grid rounded-card border border-line bg-surface shadow-[var(--shadow-card)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)_minmax(0,0.9fr)_minmax(0,1fr)]">
        {car && (
          <li className={stop}>
            <Connector />
            <StopHead n={1} label={c.stages.land} />
            <Link href={`/cars/${car.slug}`} className={cn(body, "group")}>
              <SupplyImage seed={car.imageSeed} src={car.images?.[0]} alt={car.name} sizes="(max-width: 1024px) 80px, 260px" className={thumb} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[15px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{car.name}</span>
                <span className="text-[13px] text-ink-2">{car.driveModes.includes("selfDrive") ? tCars("withDriver") : tCars("driverIncluded")}</span>
                <span className="text-[13px] text-ink-3">{tCars("seats", { count: car.seats })}</span>
              </span>
            </Link>
          </li>
        )}

        {latest && record && (
          <li className={stop}>
            <Connector />
            <StopHead n={2} label={c.stages.settle} />
            <Link href={`/stays/${latest.slug}`} className={cn(body, "group")}>
              <span className="relative block flex-none self-start lg:self-stretch">
                <SupplyImage seed={latest.imageSeed} src={latest.images?.[0]} alt={latest.name} sizes="(max-width: 1024px) 80px, 440px" className={thumb} priority />
                {/* The inspector's initials, stamped on the photograph they vouch for. */}
                <span aria-hidden className="absolute -bottom-2 -right-2 grid size-10 -rotate-6 place-items-center rounded-full border-[1.5px] border-trust bg-surface text-[12px] font-semibold tracking-wide text-trust lg:bottom-3 lg:left-3 lg:right-auto">
                  {initials(record.inspectorName)}
                </span>
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[15px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{latest.name}</span>
                <span className="text-[13px] text-ink-2">{tVerify("inspectedBy", { name: record.inspectorName, date: data.inspectedOn })}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-2">
                  {data.checks.map((k) => (
                    <span key={k.key} className="flex items-center gap-1">
                      <CheckIcon size={14} className="flex-none text-trust" />
                      {tVerify(`steps.${k.key}`)}
                    </span>
                  ))}
                </span>
              </span>
            </Link>
          </li>
        )}

        {place && (
          <li className={stop}>
            <Connector />
            <StopHead n={3} label={c.stages.look} />
            <Link href={`/neighbourhoods/${place.name.toLowerCase()}`} className={cn(body, "group")}>
              <span className={cn(thumb, "grid place-items-center bg-surface-2 lg:flex lg:flex-col lg:items-start lg:justify-end lg:p-3")}>
                <PinIcon size={18} className="text-ink-3 lg:hidden" />
                <span className="hidden truncate font-display text-[22px] font-medium leading-tight text-ink lg:block">{place.name}</span>
                <span className="hidden text-[12px] text-ink-3 lg:block">{DISTRICTS[place.name] ?? "Kigali"}</span>
              </span>
              <span className="flex min-w-0 flex-col gap-1 text-[13px]">
                <span className="text-[15px] font-medium text-ink lg:hidden">{place.name}</span>
                <span className="tnum text-ink-2 lg:text-[15px] lg:font-medium lg:text-ink lg:transition-colors lg:duration-150 lg:group-hover:text-brand">{tSmart("placeCount", { count: place.count })}</span>
                {price && (
                  <span className="text-ink-3">
                    {t("fromPrice")} <MoneyText amount={price} rounded className="font-medium text-ink-2" />
                  </span>
                )}
              </span>
            </Link>
          </li>
        )}

        {day && (
          <li className={stop}>
            <StopHead n={4} label={c.stages.further} />
            <Link href={`/experiences/${day.slug}`} className={cn(body, "group")}>
              <SupplyImage seed={day.imageSeed} src={day.images?.[0]} alt={day.name} sizes="(max-width: 1024px) 80px, 260px" className={thumb} />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[15px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{day.name}</span>
                <span className="tnum text-[13px] text-ink-2">{c.departs.replace("{time}", day.departs)}</span>
                <span className="text-[13px] text-ink-3">{tExp("duration", { count: day.durationHours })}</span>
              </span>
            </Link>
          </li>
        )}
      </ol>
    </div>
  );
}

function StopHead({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center">
      <Marker n={n} className="bg-surface" />
      <span className="relative z-10 bg-surface px-2 text-[13px] text-ink-3">{label}</span>
    </div>
  );
}

/**
 * The route between two stops on day one: down from the marker on a phone,
 * across to the next marker on a desktop.
 */
function Connector() {
  return (
    <span
      aria-hidden
      className="absolute -bottom-7 left-8 top-7 w-px bg-line lg:-right-5 lg:bottom-auto lg:left-9 lg:top-8 lg:h-px lg:w-auto"
    />
  );
}

/* One stage of the day, on the page's route line. */
function Stage({ n, title, aside, children, last }: { n: number; title: string; aside: React.ReactNode; children: React.ReactNode; last: boolean }) {
  return (
    <li className={cn("relative grid grid-cols-[32px_minmax(0,1fr)] gap-x-4 lg:grid-cols-[32px_280px_minmax(0,1fr)] lg:gap-x-10", !last && "pb-16 lg:pb-24")}>
      {!last && <span aria-hidden className="absolute bottom-0 left-4 top-7 w-px bg-line" />}
      <Marker n={n} className="mt-1.5 bg-canvas" />
      <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
        <h3 className="font-display text-[32px] font-medium leading-tight text-ink">{title}</h3>
        {aside}
      </div>
      <div className="col-start-2 mt-8 lg:col-start-3 lg:mt-0">{children}</div>
    </li>
  );
}

function Pledge({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line pt-4">
      <h4 className="text-[15px] font-medium text-ink">{title}</h4>
      <p className="text-[14px] leading-relaxed text-ink-2">{body}</p>
    </div>
  );
}

async function LaneLinks({ lanes }: { lanes: Lane[] }) {
  const t = await getTranslations("landing");
  const tNav = await getTranslations("nav");
  return (
    <ul className="flex flex-col border-t border-line">
      {lanes.map((l) => (
        <li key={l.key} className="border-b border-line">
          <Link href={l.href} className="group flex min-h-12 items-center justify-between gap-3 rounded-ctl py-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{tNav(l.label)}</span>
              <span className="text-[13px] text-ink-3">{t(`lane.${l.key}`, { count: l.count })}</span>
            </span>
            <ArrowRightIcon className="flex-none text-brand transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
