import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { parseForSite } from "@/lib/search";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import type { Money } from "@/lib/domain/money";
import { ListingRow } from "@/components/listing/listing-row";
import { MoneyText } from "@/components/ui/money-text";
import { SupplyImage } from "@/components/ui/supply-image";
import { HeroSearch, AskButton } from "@/components/search/hero-search";
import { IntentChips } from "@/components/search/intent-chips";
import { EXAMPLE_KEYS } from "@/lib/search/examples";
import {
  ArrowRightIcon,
  BedIcon,
  CarIcon,
  ClockIcon,
  CompassIcon,
  HouseIcon,
  KeyIcon,
  PinIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/ui/icons";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tVerify = await getTranslations("verification");
  const tSmart = await getTranslations("smart");
  const tPlaces = await getTranslations("places");
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
  const own = (await r.admin.content()).neighbourhoods;

  // "From" is the cheapest nightly rate actually listed there, not a
  // marketing floor. Compared in minor units within one currency, which is
  // safe because every stay is priced in RWF.
  const from = new Map<string, Money>();
  for (const l of stays) {
    const best = from.get(l.neighbourhood);
    if (!best || l.nightlyRate.minor < best.minor) from.set(l.neighbourhood, l.nightlyRate);
  }

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
    { key: "stays", label: "stay", href: "/stays", icon: BedIcon, image: "/images/homes/kimihurura-convention-studio-1.jpg", count: stays.length },
    { key: "homes", label: "rent", href: "/stays?band=long", icon: KeyIcon, image: "/images/homes/kibagabaga-garden-bungalow-2.jpg", count: leases.length },
    { key: "buy", label: "buy", href: "/buy", icon: HouseIcon, image: "/images/homes/gacuriro-four-bedroom-house-1.jpg", count: sales.length },
    { key: "cars", label: "cars", href: "/cars", icon: CarIcon, image: "/images/cars/landcruiser-1.jpg", count: cars.length },
    { key: "experiences", label: "experiences", href: "/experiences", icon: CompassIcon, image: "/images/experiences/gorillas-1.jpg", count: days.length },
  ] as const;

  return (
    <div className="flex flex-col">
      {/*
        One question above the fold, still. It used to be the three-part pill;
        it is now a single sentence field over a photograph of the city,
        because "2 bed near the convention centre under $150" is one question
        and a guest should not have to split it into three.
      */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/images/experiences/kigali-1.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_40%]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(6,20,14,0.62)_0%,rgba(6,20,14,0.38)_45%,rgba(6,20,14,0.78)_100%)]" />

        <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-6 px-6 pb-14 pt-16 text-center sm:pb-20 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-3 py-1 text-[13px] font-semibold text-white backdrop-blur-sm">
            <ShieldIcon size={14} />
            {tVerify("badge")} · {tTrust("inspectedInPerson")}
          </span>

          <h1 className="max-w-[17ch] text-balance font-display text-[2.6rem] font-semibold leading-[1.04] tracking-tight text-white sm:text-[4.1rem]">
            {t("heroTitle")}
          </h1>

          <p className="max-w-[56ch] text-[17px] leading-relaxed text-white/85">{t("heroBody")}</p>

          <div className="mt-2 w-full">
            <HeroSearch />
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] font-medium text-white/80">
            <span>{tTrust("listingsVerified", { count: stays.length + sales.length + cars.length + days.length })}</span>
            <span aria-hidden>·</span>
            <span>{tTrust("escrowProtected")}</span>
            <span aria-hidden>·</span>
            <span>{tTrust("noSurprises")}</span>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-20 px-6 py-14">
        {/* Lanes */}
        <section aria-labelledby="lanes-heading" className="flex flex-col gap-5">
          <h2 id="lanes-heading" className="sr-only">{t("lanesTitle")}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {lanes.map((lane) => {
              const Icon = lane.icon;
              return (
                <Link
                  key={lane.key}
                  href={lane.href}
                  className="group relative isolate flex aspect-[4/5] flex-col last:col-span-2 last:aspect-[2/1] sm:last:col-span-1 sm:last:aspect-[5/4] justify-end overflow-hidden rounded-card p-4 text-white sm:aspect-[5/4]"
                >
                  <Image src={lane.image} alt="" fill sizes="(max-width: 1024px) 50vw, 25vw" className="-z-20 object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  <span aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_30%,rgba(6,20,14,0.82)_100%)]" />
                  <span className="mb-auto grid h-9 w-9 place-items-center rounded-full bg-white/90 text-brand-deep">
                    <Icon size={18} />
                  </span>
                  {/* The line under the title always holds two lines, so the
                      titles sit at one height across the row whichever lane's
                      line wraps. The arrow moved up beside the title to give
                      that line the tile's full width, which keeps the longest
                      Kinyarwanda line to two from `sm`. On a phone's half-width
                      tile two Kinyarwanda lines wrap to three and are allowed
                      to; Buy and Cars share that row and both wrap, so the
                      row still lines up. */}
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-display text-xl font-semibold sm:text-2xl">{tNav(lane.label)}</span>
                    <ArrowRightIcon className="flex-none transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                  <span className="line-clamp-3 min-h-10 text-[13px] leading-5 text-white/85 sm:line-clamp-2">
                    {t(`lane.${lane.key}`, { count: lane.count })}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured */}
        <section aria-labelledby="feed-heading" className="flex flex-col gap-5">
          <SectionHead id="feed-heading" title={t("feedTitle")} body={t("feedBody")} href="/stays" link={t("viewAll")} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((listing) => (
              <ListingRow key={listing.id} listing={listing} layout="tile" />
            ))}
          </div>
        </section>

        {/* Smart search, shown working */}
        <section aria-labelledby="smart-heading" className="grid items-center gap-8 overflow-hidden rounded-card border border-line bg-surface p-6 sm:p-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-[12px] font-semibold text-brand-deep">
              <SparkIcon size={13} />
              {tSmart("trigger")}
            </span>
            <h2 id="smart-heading" className="font-display text-3xl font-semibold leading-tight text-ink">
              {t("smartTitle")}
            </h2>
            <p className="max-w-[46ch] text-[15px] leading-relaxed text-ink-2">{t("smartBody")}</p>
            <p className="text-[13px] text-ink-3">{t("smartHint")}</p>
          </div>

          <ul className="flex flex-col gap-3">
            {showcase.map((ex) => (
              <li key={ex.key}>
                <AskButton
                  query={ex.sentence}
                  className="group flex w-full cursor-pointer flex-col gap-2.5 rounded-card border border-line bg-canvas p-4 text-left transition-colors duration-150 hover:border-brand/40"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-[15px] font-medium text-ink">“{ex.sentence}”</span>
                    <ArrowRightIcon className="flex-none text-ink-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand" />
                  </span>
                  {/* This page is prerendered, so a date worked out here would
                      be the build's "next week", not the reader's. */}
                  <IntentChips intent={ex.intent} locale={locale} datesAsWords />
                </AskButton>
              </li>
            ))}
          </ul>
        </section>

        {/* Neighbourhoods */}
        <section aria-labelledby="places-heading" className="flex flex-col gap-5">
          <SectionHead id="places-heading" title={t("placesTitle")} body={t("placesBody")} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {places.map((p) => {
              const price = from.get(p.name);
              return (
                <li key={p.name}>
                  <Link
                    href={`/neighbourhoods/${p.name.toLowerCase()}`}
                    className="group flex h-full flex-col gap-2 rounded-card border border-line bg-surface p-4 transition-[border-color,box-shadow] duration-150 hover:border-brand/40 hover:shadow-[var(--shadow-card)]"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-tint text-brand">
                          <PinIcon size={15} />
                        </span>
                        <span className="flex flex-col">
                          <span className="font-semibold leading-tight text-ink">{p.name}</span>
                          <span className="text-[12px] text-ink-3">{DISTRICTS[p.name] ?? "Kigali"}</span>
                        </span>
                      </span>
                      <span className="tnum rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-ink-2">
                        {p.count}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-2">
                      {own[p.name]?.text || (tPlaces.has(p.name) ? tPlaces(p.name) : "")}
                    </span>
                    {price && (
                      <span className="mt-auto pt-1 text-[13px] text-ink-3">
                        {t("fromPrice")} <MoneyText amount={price} rounded className="font-semibold text-ink" />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="flex flex-col gap-6">
          <SectionHead id="how-heading" title={t("howTitle")} body={t("howBody")} />
          <ol className="grid gap-4 md:grid-cols-3">
            {(["inspect", "escrow", "people"] as const).map((step, i) => (
              <li key={step} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
                <span className="tnum grid h-9 w-9 place-items-center rounded-full border border-brand/30 bg-brand-tint font-display text-lg font-semibold text-brand-deep">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl font-semibold text-ink">{t(`how.${step}Title`)}</h3>
                <p className="text-[14px] leading-relaxed text-ink-2">{t(`how.${step}Body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Days out */}
        <section aria-labelledby="days-heading" className="flex flex-col gap-5">
          <SectionHead id="days-heading" title={t("daysTitle")} body={t("daysBody")} href="/experiences" link={t("daysAll")} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {days.map((e) => (
              <Link
                key={e.id}
                href={`/experiences/${e.slug}`}
                className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface transition-shadow duration-150 hover:shadow-[var(--shadow-pop)]"
              >
                <SupplyImage seed={e.imageSeed} src={e.images?.[0]} alt={e.name} sizes="(max-width: 640px) 100vw, 25vw" className="h-36" />
                <span className="flex flex-1 flex-col gap-1.5 p-4">
                  <span className="text-[16px] font-semibold leading-snug text-ink">{e.name}</span>
                  <span className="flex flex-wrap gap-x-3 text-[13px] text-ink-2">
                    <span className="flex items-center gap-1"><ClockIcon size={13} className="text-ink-3" />{tExp("duration", { count: e.durationHours })}</span>
                    <span className="flex items-center gap-1"><UsersIcon size={13} className="text-ink-3" />{tExp("groupMax", { count: e.groupMax })}</span>
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

function SectionHead({ id, title, body, href, link }: { id: string; title: string; body?: string; href?: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-[1.75rem] font-semibold leading-tight text-ink">{title}</h2>
        {body && <p className="max-w-[60ch] text-[15px] text-ink-2">{body}</p>}
      </div>
      {href && link && (
        <Link href={href} className="inline-flex items-center gap-1.5 rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep">
          {link}
          <ArrowRightIcon size={15} />
        </Link>
      )}
    </div>
  );
}
