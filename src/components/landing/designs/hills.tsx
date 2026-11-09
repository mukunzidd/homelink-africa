import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import type { Experience, Listing } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { areaCentre } from "@/lib/places/area";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { initials } from "@/components/results/inspected-by";
import { HeroSearch } from "@/components/search/hero-search";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { ArrowRightIcon, CheckIcon, ClockIcon, UsersIcon } from "@/components/ui/icons";
import { pick } from "./copy";
import { copy, type Dir } from "./hills.copy";
import { HillMap } from "./hills/map";
import { dividerPaths } from "./hills/contours";

/*
  Kigali by hill. The city is a city of hills and every neighbourhood sits
  on one, so the page leads with them: a map drawn in code, contour lines
  and the neighbourhoods where our team has verified homes, each with its
  count and its cheapest night. Below it the page finds everything the
  same way, by neighbourhood, from north to south, and ends with the days
  out that lie beyond the hills, each pointed at from the city.

  The contour line is the one recurring detail: in the map and as the
  divider between sections, nowhere else.
*/
export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const c = pick(copy, locale);
  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tNav = await getTranslations("nav");
  const tSmart = await getTranslations("smart");

  // North to south, the way the map reads.
  const byLatitude = [...data.places].sort((a, b) => areaCentre(b.name).lat - areaCentre(a.name).lat);

  return (
    <div className="flex flex-col">
      {/* The first screen: words and the search on the left, the city on the right */}
      <section className="relative isolate z-10">
        <div className="mx-auto grid max-w-[1360px] gap-8 px-6 pb-8 pt-10 lg:min-h-[calc(100svh-64px)] lg:grid-cols-[minmax(0,9fr)_minmax(0,14fr)] lg:items-center lg:gap-8 lg:py-8">
          <div className="flex flex-col items-start gap-6">
            <p className="text-[15px] text-ink-3">{c.eyebrow}</p>
            <h1 className="max-w-[14ch] text-balance font-display text-[40px] font-medium leading-[1.05] tracking-tight text-ink sm:text-[56px]">
              {t("heroTitle")}
            </h1>
            <p className="max-w-[40ch] text-[17px] leading-relaxed text-ink-2">{t("heroBody")}</p>
            <div className="mt-2 w-full max-w-[520px]">
              <HeroSearch />
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
              <span className="tnum">{tTrust("listingsVerified", { count: data.total })}</span>
              <span aria-hidden>·</span>
              <span>{tTrust("escrowProtected")}</span>
            </p>
          </div>
          <div className="-mx-6 sm:mx-0">
            <HillMap places={data.places} from={data.from} label={c.mapLabel} north={c.north} km={c.km} note={c.mapNote} />
          </div>
        </div>
      </section>

      <Contour seed={1} />

      {/* The five lanes, in one row */}
      <section aria-labelledby="hills-lanes" className="mx-auto w-full max-w-[1280px] px-6 py-12">
        <h2 id="hills-lanes" className="sr-only">{t("lanesTitle")}</h2>
        <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-5 lg:gap-x-0 lg:border-t-0">
          {data.lanes.map((lane, i) => (
            <li key={lane.key} className="border-b border-line lg:border-b-0 lg:border-l lg:first:border-l-0">
              <Link href={lane.href} className={`group flex items-center justify-between gap-4 rounded-ctl py-4 lg:flex-col lg:items-start lg:justify-start lg:gap-1 lg:py-2 ${i === 0 ? "lg:pr-6" : "lg:px-6"}`}>
                <span className="flex items-center gap-2 font-display text-[20px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">
                  {tNav(lane.label)}
                  <ArrowRightIcon size={16} className="hidden text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5 lg:block" />
                </span>
                <span className="text-right text-[13px] leading-5 text-ink-2 lg:text-left">{t(`lane.${lane.key}`, { count: lane.count })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <Contour seed={2} />

      {/* Every neighbourhood with the homes in it, north to south */}
      <section aria-labelledby="hills-places" className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-2">
          <h2 id="hills-places" className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">{t("placesTitle")}</h2>
          <p className="max-w-[60ch] text-[15px] text-ink-2">{t("placesBody")}</p>
        </div>
        <div className="grid gap-x-12 lg:grid-cols-2">
          {byLatitude.map((p) => {
            const homes = data.stays.filter((s) => s.neighbourhood === p.name);
            const price = data.from.get(p.name);
            return (
              <article key={p.name} className="flex flex-col gap-4 border-t border-line py-6">
                <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link href={`/neighbourhoods/${p.name.toLowerCase()}`} className="group flex items-baseline gap-2 rounded-ctl">
                    <h3 className="font-display text-[24px] font-medium leading-tight text-ink transition-colors duration-150 group-hover:text-brand">{p.name}</h3>
                    <ArrowRightIcon size={16} className="self-center text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                  <p className="tnum text-[13px] text-ink-3">
                    {DISTRICTS[p.name] ?? "Kigali"} · {tSmart("placeCount", { count: p.count })}
                    {price && (
                      <>
                        {" · "}
                        {t("fromPrice").toLowerCase()} <MoneyText amount={price} rounded className="text-ink-2" />
                      </>
                    )}
                  </p>
                </header>
                <ul className="flex flex-col gap-3">
                  {homes.map((h) => (
                    <li key={h.id}>
                      <HomeLine home={h} night={c.night} />
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <Contour seed={3} />

      {/* The three promises, with the newest inspection as the evidence */}
      <section aria-labelledby="hills-how" className="mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 id="hills-how" className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">{t("howTitle")}</h2>
            <p className="max-w-[60ch] text-[15px] text-ink-2">{t("howBody")}</p>
          </div>
          <ol className="flex flex-col border-t border-line">
            {(["inspect", "escrow", "people"] as const).map((step, i) => (
              <li key={step} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-b border-line py-6">
                <span className="tnum font-display text-[24px] leading-none text-ink-3">{i + 1}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-[20px] font-medium leading-snug text-ink">{t(`how.${step}Title`)}</h3>
                  <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{t(`how.${step}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <Record data={data} title={c.latestTitle} />
      </section>

      <Contour seed={4} />

      {/* Days out, placed from the city: which way and how far by road */}
      <section aria-labelledby="hills-days" className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-6 pb-24 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h2 id="hills-days" className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[32px]">{c.beyondTitle}</h2>
            <p className="max-w-[60ch] text-[15px] text-ink-2">{t("daysBody")}</p>
          </div>
          <Link href="/experiences" className="inline-flex items-center gap-2 rounded-ctl text-[15px] font-medium text-brand hover:text-brand-deep">
            {t("daysAll")}
            <ArrowRightIcon size={16} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...data.days].sort((a, b) => a.driveHours - b.driveHours).map((e) => (
            <DayOut key={e.id} day={e} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}

/** Thin contour lines across the page, the one divider this design uses. */
function Contour({ seed }: { seed: number }) {
  return (
    <div aria-hidden className="mx-auto w-full max-w-[1280px] px-6">
      <svg viewBox="0 0 1200 32" preserveAspectRatio="none" className="block h-8 w-full">
        {dividerPaths(seed).map((d, i) => (
          <path key={i} d={d} fill="none" stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    </div>
  );
}

function HomeLine({ home, night }: { home: Listing; night: string }) {
  return (
    <Link href={`/stays/${home.slug}`} className="group grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-ctl">
      <SupplyImage seed={home.imageSeed} src={home.images?.[0]} alt="" sizes="96px" className="h-18 rounded-[8px]" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[15px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{home.name}</span>
        <span className="text-[13px] text-ink-3">
          <MoneyText amount={home.nightlyRate} className="tnum text-ink-2" /> {night}
        </span>
      </span>
    </Link>
  );
}

async function Record({ data, title }: { data: LandingData; title: string }) {
  const tVerify = await getTranslations("verification");
  const { latest, record } = data;
  if (!latest || !record) return null;
  return (
    <aside className="flex flex-col gap-3 lg:self-start lg:pt-2">
      <p className="text-[13px] text-ink-3">{title}</p>
      <Link
        href={`/stays/${latest.slug}`}
        className="group flex flex-col gap-4 rounded-card border border-line bg-surface p-6 transition-colors duration-150 hover:border-brand/40"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid size-11 flex-none -rotate-6 place-items-center rounded-full border-[1.5px] border-trust text-[13px] font-semibold tracking-wide text-trust">
            {initials(record.inspectorName)}
          </span>
          <p className="text-pretty text-[13px] leading-snug text-ink-2">{tVerify("inspectedBy", { name: record.inspectorName, date: data.inspectedOn })}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-display text-[20px] font-medium leading-snug text-ink">{latest.name}</p>
          <p className="text-[13px] text-ink-3">{latest.neighbourhood}</p>
        </div>
        <ul className="flex flex-col border-t border-line-soft">
          {data.checks.map((ch) => (
            <li key={ch.key} className="flex h-10 items-center gap-2 border-b border-line-soft text-[14px] text-ink-2 last:border-b-0">
              <CheckIcon size={16} className="flex-none text-trust" />
              {tVerify(`steps.${ch.key}`)}
            </li>
          ))}
        </ul>
        <span className="flex items-center gap-1 text-[13px] font-medium text-brand">
          {tVerify("openRecord")}
          <ArrowRightIcon size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </Link>
    </aside>
  );
}

/** Kigali's centre, the point every day out is measured from. */
const KIGALI = { lat: -1.9441, lng: 30.0619 };
const DIRS: Dir[] = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

/** Compass bearing from Kigali, in degrees clockwise from north. Flat-earth is fine at this scale. */
function bearing(lat: number, lng: number) {
  const deg = (Math.atan2(lng - KIGALI.lng, lat - KIGALI.lat) * 180) / Math.PI;
  return (deg + 360) % 360;
}

async function DayOut({ day, locale }: { day: Experience; locale: string }) {
  const c = pick(copy, locale);
  const tExp = await getTranslations("experiences");
  const inCity = day.driveHours < 1;
  const b = bearing(day.location.lat, day.location.lng);
  const hours = new Intl.NumberFormat(INTL_LOCALES[locale as Locale] ?? "en-US", { maximumFractionDigits: 1 }).format(day.driveHours);
  return (
    <Link href={`/experiences/${day.slug}`} className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-colors duration-150 hover:border-brand/40">
      <SupplyImage seed={day.imageSeed} src={day.images?.[0]} alt={day.name} sizes="(max-width: 640px) 100vw, 25vw" className="h-40" />
      <span className="flex flex-1 flex-col gap-3 p-5">
        <span className="flex items-center gap-2 text-[13px] text-ink-2">
          {inCity ? (
            <span aria-hidden className="size-2 flex-none rounded-full bg-brand" />
          ) : (
            <span aria-hidden className="grid size-4 flex-none place-items-center" style={{ transform: `rotate(${Math.round(b - 90)}deg)` }}>
              <ArrowRightIcon size={14} className="text-ink-3" />
            </span>
          )}
          {inCity ? c.inKigali : `${c.dir[DIRS[Math.round(b / 45) % 8]]} · ${c.byRoad(hours)}`}
        </span>
        <span className="text-[17px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{day.name}</span>
        <span className="flex flex-wrap gap-x-4 text-[13px] text-ink-2">
          <span className="flex items-center gap-1"><ClockIcon size={14} className="text-ink-3" />{tExp("duration", { count: day.durationHours })}</span>
          <span className="flex items-center gap-1"><UsersIcon size={14} className="text-ink-3" />{tExp("groupMax", { count: day.groupMax })}</span>
        </span>
        <span className="mt-auto flex items-baseline gap-1 pt-1">
          <MoneyText amount={day.pricePerPerson} rounded className="font-semibold text-ink" />
          <span className="text-[13px] text-ink-3">{tExp("perPerson")}</span>
        </span>
      </span>
    </Link>
  );
}
