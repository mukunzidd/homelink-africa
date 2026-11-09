import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Hero, type HeroVariant } from "./heroes";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { parseForSite } from "@/lib/search";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { formatDate, today } from "@/lib/domain/dates";
import type { Money } from "@/lib/domain/money";
import { ListingRow } from "@/components/listing/listing-row";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { AskButton } from "@/components/search/hero-search";
import { IntentChips } from "@/components/search/intent-chips";
import { EXAMPLE_KEYS } from "@/lib/search/examples";
import { ArrowRightIcon, ClockIcon, UsersIcon } from "@/components/ui/icons";

/**
 * The landing page, with the hero chosen by name. The home route renders
 * the chosen one; /preview/landing renders each, so they can be compared
 * on the real page with real data before one is picked.
 */
export async function Landing({ locale, hero }: { locale: string; hero: HeroVariant }) {

  const t = await getTranslations("landing");
  const tSmart = await getTranslations("smart");
  const tExp = await getTranslations("experiences");
  const tNav = await getTranslations("nav");

  const r = repos();
  const [featured, stays, leases, sales, cars, days, places] = await Promise.all([
    r.stays.featured(6),
    r.stays.list(),
    r.stays.list({ band: "long" }),
    r.sales.list(),
    r.mobility.list(),
    r.experiences.list(),
    r.stays.neighbourhoodsWithCounts(),
  ]);

  // "From" is the cheapest nightly rate actually listed there, not a
  // marketing floor. Compared in minor units within one currency, which is
  // safe because every stay is priced in RWF.
  const from = new Map<string, Money>();
  for (const l of stays) {
    const best = from.get(l.neighbourhood);
    if (!best || l.nightlyRate.minor < best.minor) from.set(l.neighbourhood, l.nightlyRate);
  }

  // The hero's object is the newest inspection on the site, read from the
  // record, not a mock-up of one. It replaced a "Verified · Every one
  // inspected in person" pill: the pill made the claim, the record is the
  // evidence, and the evidence is the thing only HomeLink can show.
  const latest = [...stays].sort((a, b) => b.verification.inspectedAt.localeCompare(a.verification.inspectedAt))[0];
  const record = latest?.verification;
  const thisYear = record ? record.inspectedAt.slice(0, 4) === today().slice(0, 4) : true;
  const inspectedOn = record
    ? formatDate(record.inspectedAt, INTL_LOCALES[locale as Locale], thisYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" })
    : "";
  // The same steps, in the same order and on the same flags, as the record on
  // the listing itself. Escrow applies because this is a stay by the night.
  const checks = record
    ? [
        { key: "inspected", show: true },
        { key: "photographed", show: record.photographedByHomeLink },
        { key: "identity", show: record.ownerIdentityConfirmed },
        { key: "escrow", show: true },
      ].filter((c) => c.show)
    : [];

  // The showcase parses the same example sentences the palette offers, live,
  // so what the page claims the search understands is what it understands.
  const showcase = await Promise.all(
    EXAMPLE_KEYS.slice(0, 3).map(async (k) => ({
      key: k,
      sentence: tSmart(k),
      intent: await parseForSite(tSmart(k), "USD"),
    })),
  );

  const lanes = [
    { key: "stays", label: "stay", href: "/stays", image: "/images/homes/kacyiru-garden-apartment-1.jpg", count: stays.length },
    { key: "homes", label: "rent", href: "/stays?band=long", image: "/images/homes/kibagabaga-garden-bungalow-2.jpg", count: leases.length },
    { key: "buy", label: "buy", href: "/buy", image: "/images/homes/gacuriro-four-bedroom-house-1.jpg", count: sales.length },
    { key: "cars", label: "cars", href: "/cars", image: "/images/cars/landcruiser-1.jpg", count: cars.length },
    { key: "experiences", label: "experiences", href: "/experiences", image: "/images/experiences/gorillas-1.jpg", count: days.length },
  ] as const;

  return (
    <div className="flex flex-col">
      <Hero variant={hero} data={{ count: stays.length + sales.length + cars.length + days.length, latest, record, inspectedOn, checks }} />

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-20 px-6 py-16">
        {/* Lanes. Stays leads as the one big tile: it is what most people come
            for and the lane with the most places in it. Four smaller tiles
            share the other half, so the row has a rhythm instead of five
            equal cards. */}
        <section aria-labelledby="lanes-heading">
          <h2 id="lanes-heading" className="sr-only">{t("lanesTitle")}</h2>
          <div className="grid auto-rows-[184px] grid-cols-2 gap-3 sm:gap-4 lg:auto-rows-[200px] lg:grid-cols-4">
            {lanes.map((lane, i) => (
              <Link
                key={lane.key}
                href={lane.href}
                className={`group relative isolate flex flex-col justify-end gap-1 overflow-hidden rounded-card p-4 text-white sm:p-5 ${i === 0 ? "col-span-2 lg:row-span-2" : ""}`}
              >
                <Image src={lane.image} alt="" fill sizes={i === 0 ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 50vw, 25vw"} className="-z-20 object-cover" />
                <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_35%,rgba(6,20,14,0.84)_100%)]" />
                <span aria-hidden className="absolute inset-0 -z-10 bg-black/15 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <span className="flex items-center justify-between gap-2">
                  <span className={`font-display font-medium ${i === 0 ? "text-[28px] lg:text-[40px]" : "text-[20px] sm:text-[24px]"}`}>{tNav(lane.label)}</span>
                  <ArrowRightIcon className="flex-none transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
                {/* Two lines held on every tile from `sm`, so the titles sit at
                    one height across a row whichever line wraps. On a phone's
                    half-width tile the longer Kinyarwanda lines take three. */}
                <span className="line-clamp-3 min-h-10 text-[13px] leading-5 text-white/80 sm:line-clamp-2">
                  {t(`lane.${lane.key}`, { count: lane.count })}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured */}
        <section aria-labelledby="feed-heading" className="flex flex-col gap-6">
          <SectionHead id="feed-heading" title={t("feedTitle")} body={t("feedBody")} href="/stays" link={t("viewAll")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <ListingRow key={listing.id} listing={listing} layout="tile" />
            ))}
          </div>
        </section>

        {/* Smart search, shown working */}
        <section aria-labelledby="smart-heading" className="grid items-center gap-8 rounded-card border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div className="flex flex-col gap-4">
            <p className="text-[13px] font-medium text-ink-3">{tSmart("trigger")}</p>
            <h2 id="smart-heading" className="font-display text-[28px] font-medium leading-tight text-ink">
              {t("smartTitle")}
            </h2>
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-2">{t("smartBody")}</p>
            <p className="text-[13px] text-ink-3">
              {t.rich("smartHint", { k: (chunks) => <Kbd>{chunks}</Kbd> })}
            </p>
          </div>

          <ul className="flex flex-col gap-3">
            {showcase.map((ex) => (
              <li key={ex.key}>
                <AskButton
                  query={ex.sentence}
                  className="group flex w-full cursor-pointer flex-col gap-3 rounded-[12px] border border-line bg-canvas p-4 text-left transition-colors duration-150 hover:border-brand/40"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[15px] font-medium text-ink">“{ex.sentence}”</span>
                    <ArrowRightIcon className="flex-none text-ink-3 transition-[color,transform] duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
                  </span>
                  {/* This page is prerendered, so a date worked out here would
                      be the build's "next week", not the reader's. */}
                  <IntentChips intent={ex.intent} locale={locale} datesAsWords />
                </AskButton>
              </li>
            ))}
          </ul>
        </section>

        {/* Neighbourhoods. A ruled list: the name, its district, how many
            verified places and the cheapest night. The one-line descriptions
            that used to sit on each card live on the neighbourhood pages,
            where someone has already chosen to read about the place. */}
        <section aria-labelledby="places-heading" className="flex flex-col gap-6">
          <SectionHead id="places-heading" title={t("placesTitle")} />
          <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
            {places.map((p) => {
              const price = from.get(p.name);
              return (
                <li key={p.name} className="border-b border-line">
                  <Link
                    href={`/neighbourhoods/${p.name.toLowerCase()}`}
                    className="group flex h-16 items-center justify-between gap-4 rounded-ctl"
                  >
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
        </section>

        {/* How it works. The heading on the left and the three promises as a
            numbered list beside it, read in order, rather than three equal
            cards that read as interchangeable. */}
        <section aria-labelledby="how-heading" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="lg:self-start">
            <SectionHead id="how-heading" title={t("howTitle")} body={t("howBody")} />
          </div>
          <ol className="flex flex-col border-t border-line">
            {(["inspect", "escrow", "people"] as const).map((step, i) => (
              <li key={step} className="grid grid-cols-[40px_minmax(0,1fr)] gap-4 border-b border-line py-6">
                <span className="tnum font-display text-[28px] leading-none text-ink-3">{i + 1}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-[20px] font-medium leading-snug text-ink">{t(`how.${step}Title`)}</h3>
                  <p className="max-w-[60ch] text-[15px] leading-relaxed text-ink-2">{t(`how.${step}Body`)}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Days out */}
        <section aria-labelledby="days-heading" className="flex flex-col gap-6">
          <SectionHead id="days-heading" title={t("daysTitle")} body={t("daysBody")} href="/experiences" link={t("daysAll")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {days.map((e) => (
              <Link
                key={e.id}
                href={`/experiences/${e.slug}`}
                className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-shadow duration-150 hover:shadow-[var(--shadow-pop)]"
              >
                <SupplyImage seed={e.imageSeed} src={e.images?.[0]} alt={e.name} sizes="(max-width: 640px) 100vw, 25vw" className="h-36" />
                <span className="flex flex-1 flex-col gap-2 p-4">
                  <span className="text-[16px] font-medium leading-snug text-ink">{e.name}</span>
                  <span className="flex flex-wrap gap-x-4 text-[13px] text-ink-2">
                    <span className="flex items-center gap-1"><ClockIcon size={14} className="text-ink-3" />{tExp("duration", { count: e.durationHours })}</span>
                    <span className="flex items-center gap-1"><UsersIcon size={14} className="text-ink-3" />{tExp("groupMax", { count: e.groupMax })}</span>
                  </span>
                  <span className="mt-auto flex items-baseline gap-1 pt-2">
                    <MoneyText amount={e.pricePerPerson} rounded className="font-semibold text-ink" />
                    <span className="text-[13px] text-ink-3">{tExp("perPerson")}</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded-chip border border-line bg-surface-2 px-1 font-mono text-[11px] text-ink-2">
      {children}
    </kbd>
  );
}

function SectionHead({ id, title, body, href, link }: { id: string; title: string; body?: string; href?: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="font-display text-[28px] font-medium leading-tight text-ink">{title}</h2>
        {body && <p className="max-w-[60ch] text-[15px] text-ink-2">{body}</p>}
      </div>
      {href && link && (
        <Link href={href} className="inline-flex items-center gap-2 rounded-ctl text-[15px] font-medium text-brand hover:text-brand-deep">
          {link}
          <ArrowRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}
