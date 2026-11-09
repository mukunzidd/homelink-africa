import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import { pick } from "./copy";
import { copy } from "./report.copy";
import { Leader, SectionHead, Stamp } from "./report/parts";

import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, today } from "@/lib/domain/dates";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { HeroSearch } from "@/components/search/hero-search";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/*
  Candidate home page "report": the page is the inspector's report. One ink
  on a paper-toned page, the display serif for headings, mono for record
  numbers and dates, heavy rules between numbered sections. The first
  screen pairs the headline and the search with the newest real inspection
  set as a report sheet: the home, its checks ticked, the inspector's name
  and date, and their initials as a round stamp. The stamp is the one
  signature and is used only beside something a named person inspected: the
  sheet, each line of the register and each day out.

  The paper is scoped to this page and mixed from the theme's own tokens,
  so in dark it becomes a deep ink page with no extra values to maintain.
*/
export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tVerify = await getTranslations("verification");
  const tNav = await getTranslations("nav");
  const tExp = await getTranslations("experiences");
  const tSmart = await getTranslations("smart");
  const tPlaces = await getTranslations("places");
  const tList = await getTranslations("list");
  const tFooter = await getTranslations("footer");
  const c = pick(copy, locale);
  const intl = INTL_LOCALES[locale as Locale] ?? "en-GB";

  const { featured, places, from, latest, record, inspectedOn, checks, lanes, days, total } = data;

  // Dates in the register: the year only when it is not this one, as on
  // every other inspected-by line on the site.
  const year = today().slice(0, 4);
  const shortDate = (iso: string) =>
    formatDate(iso, intl, iso.slice(0, 4) === year ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
  // Day and month in words: "10/19/26" reads as a different day in every
  // country this page is written for.
  const stampDate = record ? shortDate(record.inspectedAt) : undefined;
  // The newest inspection is already the sheet in the first screen, so the
  // register starts with the next one instead of repeating it.
  const register = featured.filter((l) => l.id !== latest?.id).slice(0, 5);

  return (
    // -mb-24 takes up the footer's top margin, which would otherwise show as
    // a band of plain canvas between the paper and the footer.
    <div className="-mb-24 bg-[color-mix(in_oklab,var(--surface-2)_40%,var(--canvas))] text-ink">
      <div className="mx-auto flex max-w-[1180px] flex-col px-4 sm:px-6">
        {/* Masthead: what this document is, and how much is in it. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-ink py-3 font-mono text-[12px] text-ink-2">
          <span className="whitespace-nowrap">{c.masthead}</span>
          <span className="tnum whitespace-nowrap">{tTrust("listingsVerified", { count: total })}</span>
        </div>

        {/* First screen. z-10 so the search's answer paints over what follows. */}
        <section className="relative z-10 grid gap-10 pb-16 pt-8 sm:pt-12 lg:min-h-[calc(100svh-64px-45px)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-16 lg:py-12">
          <div className="flex flex-col items-start gap-6">
            <h1 className="max-w-[14ch] text-balance font-display text-[40px] font-medium leading-[1.02] tracking-tight text-ink sm:text-[60px] lg:text-[72px]">{t("heroTitle")}</h1>
            <p className="max-w-[42ch] text-[17px] leading-relaxed text-ink-2">{t("heroBody")}</p>
            <div className="mt-2 w-full max-w-[540px]">
              <HeroSearch />
            </div>
            {/* The contents, in one line: renting and buying are a tap from the first screen. */}
            <nav aria-label={c.browse} className="flex w-full max-w-[540px] flex-col gap-2">
              <span className="font-mono text-[12px] text-ink-3">{c.browse}</span>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {lanes.map((lane) => (
                  <li key={lane.key}>
                    <Link href={lane.href} className="group inline-flex items-baseline gap-2 rounded-ctl text-[16px] font-medium text-ink">
                      <span className="underline decoration-line underline-offset-4 transition-colors duration-150 group-hover:text-brand group-hover:decoration-brand">{tNav(lane.label)}</span>
                      <span className="tnum font-mono text-[12px] text-ink-3">{lane.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="flex w-full max-w-[540px] flex-col items-start gap-x-3 gap-y-1 border-t border-line pt-4 text-[13px] text-ink-3 sm:flex-row sm:flex-wrap sm:items-center">
              <span>{tTrust("escrowProtected")}</span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span>{tTrust("noSurprises")}</span>
              <span aria-hidden className="hidden sm:inline">·</span>
              <Link href="/contact" className="rounded-ctl text-ink-2 underline decoration-line underline-offset-4 hover:text-brand hover:decoration-brand">
                {c.talk}
              </Link>
            </p>
          </div>

          {latest && record && (
            <article aria-label={c.latest} className="flex flex-col rounded-ctl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="font-mono text-[12px] text-ink-3">{c.latest}</p>
              <div aria-hidden className="mt-3 h-[2px] bg-ink" />

              <Photo src={latest.images?.[0]} seed={latest.imageSeed} alt={latest.name} priority sizes="(max-width: 1024px) 100vw, 480px" className="mt-5 aspect-[16/9] rounded-inner" />

              <div className="mt-4 flex flex-col gap-1">
                <h2 className="font-display text-[24px] font-medium leading-snug text-ink">{latest.name}</h2>
                <p className="text-[14px] text-ink-2">
                  {latest.neighbourhood}, {latest.city}
                </p>
              </div>

              <p className="mt-4 font-mono text-[12px] text-ink-3">{c.points(record.checklistPoints)}</p>
              <ol className="mt-2 flex flex-col border-t border-line">
                {checks.map((check, i) => (
                  <li key={check.key} className="grid h-10 grid-cols-[28px_minmax(0,1fr)_16px] items-center gap-2 border-b border-line-soft text-[14px] text-ink-2">
                    <span className="tnum font-mono text-[12px] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate">{tVerify(`steps.${check.key}`)}</span>
                    <CheckIcon size={16} className="text-trust" />
                  </li>
                ))}
              </ol>

              <div className="mt-5 flex items-center justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <p className="text-pretty text-[14px] leading-snug text-ink">{tVerify("inspectedBy", { name: record.inspectorName, date: inspectedOn })}</p>
                  <Link href={`/stays/${latest.slug}`} className="group inline-flex items-center gap-1 self-start rounded-ctl text-[14px] font-medium text-brand hover:text-brand-deep">
                    {tVerify("openRecord")}
                    <ArrowRightIcon size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                  </Link>
                </div>
                <Stamp name={record.inspectorName} date={stampDate} size="lg" className="-my-2" />
              </div>
            </article>
          )}
        </section>

        <div className="flex flex-col gap-24 pb-24">
          {/* 01. The lanes, read as a table of contents. */}
          <section aria-labelledby="r-lanes" className="flex flex-col gap-6">
            <SectionHead id="r-lanes" n={1} title={t("lanesTitle")} />
            <ul className="flex flex-col">
              {lanes.map((lane) => (
                <li key={lane.key} className="border-b border-line">
                  <Link href={lane.href} className="group grid grid-cols-[minmax(0,1fr)_16px] items-center gap-x-4 gap-y-1 rounded-ctl py-4 sm:flex sm:items-baseline sm:gap-6">
                    <span className="font-display text-[22px] font-medium leading-tight text-ink transition-colors duration-150 group-hover:text-brand sm:w-44 sm:flex-none sm:text-[24px]">{tNav(lane.label)}</span>
                    <span className="col-start-1 text-[15px] text-ink-2">
                      {t(`lane.${lane.key}`, { count: lane.count })}
                      {lane.key === "cars" && <span className="text-ink-3"> · {tList("carIncludes.handover")}</span>}
                    </span>
                    <Leader className="hidden sm:block" />
                    <ArrowRightIcon size={16} className="col-start-2 row-span-2 row-start-1 text-ink-3 transition-[color,transform] duration-150 group-hover:translate-x-0.5 group-hover:text-brand sm:self-center" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* 02. Featured homes as a ruled register. */}
          <section aria-labelledby="r-register" className="flex flex-col gap-6">
            <SectionHead id="r-register" n={2} title={c.registerTitle} body={c.registerBody} href="/stays" link={t("viewAll")} />
            <div>
              <div aria-hidden className="hidden grid-cols-[32px_112px_minmax(0,1fr)_200px_96px_136px] gap-x-6 border-b border-ink pb-2 font-mono text-[12px] text-ink-3 lg:grid">
                <span />
                <span />
                <span>{c.colHome}</span>
                <span>{c.colInspector}</span>
                <span>{c.colDate}</span>
                <span className="text-right">{c.colNight}</span>
              </div>
              <ol className="flex flex-col border-t border-ink lg:border-t-0">
                {register.map((l, i) => (
                  <li key={l.id} className="border-b border-line">
                    <Link
                      href={`/stays/${l.slug}`}
                      className="group grid grid-cols-[80px_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-ctl py-4 lg:grid-cols-[32px_112px_minmax(0,1fr)_200px_96px_136px] lg:items-center lg:gap-x-6"
                    >
                      <span className="tnum hidden font-mono text-[13px] text-ink-3 lg:block">{String(i + 1).padStart(2, "0")}</span>
                      <Photo src={l.images?.[0]} seed={l.imageSeed} alt="" sizes="112px" className="row-span-3 size-20 self-start rounded-inner lg:row-span-1 lg:h-[76px] lg:w-[112px]" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-balance font-display text-[18px] lg:truncate font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{l.name}</span>
                        <span className="text-[13px] text-ink-3">
                          {[l.neighbourhood, DISTRICTS[l.neighbourhood] ?? l.city].filter((v, i, a) => a.indexOf(v) === i).join(" · ")}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-2">
                        <Stamp name={l.verification.inspectorName} />
                        <span className="truncate">{l.verification.inspectorName}</span>
                        <span className="tnum font-mono text-[12px] text-ink-3 lg:hidden">· {shortDate(l.verification.inspectedAt)}</span>
                      </span>
                      <span className="tnum hidden font-mono text-[13px] text-ink-2 lg:block">{shortDate(l.verification.inspectedAt)}</span>
                      <span className="flex items-baseline gap-1 lg:justify-end">
                        <MoneyText amount={l.nightlyRate} rounded className="text-[15px] font-semibold text-ink" />
                        <span className="text-[13px] text-ink-3">{tSmart("perNightShort")}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* 03. The three promises, as the method a report states up front. */}
          <section aria-labelledby="r-method" className="flex flex-col gap-6">
            <SectionHead id="r-method" n={3} title={t("howTitle")} body={t("howBody")} />
            <ol className="grid lg:grid-cols-3">
              {(["inspect", "escrow", "people"] as const).map((step, i) => (
                <li key={step} className="flex flex-col gap-3 border-b border-line py-6 lg:border-b-0 lg:border-l lg:px-8 lg:py-2 lg:first:border-l-0 lg:first:pl-0">
                  <span className="tnum font-mono text-[13px] text-ink-3">3.{i + 1}</span>
                  <h3 className="font-display text-[22px] font-medium leading-snug text-ink">{t(`how.${step}Title`)}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-2">{t(`how.${step}Body`)}</p>
                  {step === "people" && (
                    <Link href="/contact" className="group inline-flex items-center gap-1 self-start rounded-ctl text-[14px] font-medium text-brand hover:text-brand-deep">
                      {tFooter("contact")}
                      <ArrowRightIcon size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </section>

          {/* 04. Neighbourhoods as an index, with dotted leaders to the figures. */}
          <section aria-labelledby="r-index" className="flex flex-col gap-6">
            <SectionHead id="r-index" n={4} title={t("placesTitle")} body={t("placesBody")} />
            <ul className="grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
              {[...places].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
                const price = from.get(p.name);
                return (
                  <li key={p.name} className="border-b border-line">
                    <Link href={`/neighbourhoods/${p.name.toLowerCase()}`} className="group flex flex-col gap-1 rounded-ctl py-4">
                      <span className="flex items-baseline gap-3">
                        <span className="truncate text-[16px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{p.name}</span>
                        <Leader />
                        {price && (
                          <span className="flex-none text-[13px] text-ink-3">
                            {t("fromPrice")} <MoneyText amount={price} rounded className="font-medium text-ink" />
                          </span>
                        )}
                      </span>
                      {tPlaces.has(p.name) && <span className="text-pretty text-[14px] leading-snug text-ink-2">{tPlaces(p.name)}</span>}
                      <span className="tnum font-mono text-[12px] text-ink-3">
                        {DISTRICTS[p.name] ?? "Kigali"} · {tSmart("placeCount", { count: p.count })}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* 05. Days out, as captioned plates, each stamped by whoever ran it first. */}
          <section aria-labelledby="r-days" className="flex flex-col gap-6">
            <SectionHead id="r-days" n={5} title={t("daysTitle")} body={t("daysBody")} href="/experiences" link={t("daysAll")} />
            <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {days.map((e, i) => (
                <li key={e.id}>
                  <Link href={`/experiences/${e.slug}`} className="group flex flex-col gap-3 rounded-ctl">
                    <Photo src={e.images?.[0]} seed={e.imageSeed} alt={e.name} sizes="(max-width: 640px) 100vw, 280px" className="aspect-[4/3] rounded-inner" />
                    <span className="flex items-baseline justify-between gap-3 border-b border-line pb-2 font-mono text-[12px] text-ink-3">
                      <span className="tnum">5.{i + 1}</span>
                      <span className="tnum">
                        {tExp("duration", { count: e.durationHours })} · {tExp("groupMax", { count: e.groupMax })}
                      </span>
                    </span>
                    <span className="font-display text-[19px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{e.name}</span>
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-[13px] text-ink-2">
                        <Stamp name={e.verification.inspectorName} />
                        <span className="truncate">{e.verification.inspectorName}</span>
                      </span>
                      <span className="flex flex-none items-baseline gap-1">
                        <MoneyText amount={e.pricePerPerson} rounded className="text-[15px] font-semibold text-ink" />
                        <span className="text-[13px] text-ink-3">{tExp("perPerson")}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/** A photograph as printed on the page: no scrim, no badge, a hairline edge. */
function Photo({ src, seed, alt, sizes, priority, className }: { src?: string; seed: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  if (!src) return <SupplyImage seed={seed} alt={alt} sizes={sizes} className={className} />;
  return (
    <span className={cn("relative block overflow-hidden bg-surface-2", className)}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      <span aria-hidden className="absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-ink/10" />
    </span>
  );
}
