import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { LandingData } from "../data";
import type { Segment } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { minutesTo } from "@/lib/domain/landmarks";
import { DISTRICTS } from "@/lib/domain/neighbourhoods";
import { initials } from "@/components/results/inspected-by";
import { SupplyImage } from "@/components/ui/supply-image";
import { ArrowRightIcon, BanknoteIcon, CheckIcon, ClockIcon, MessageIcon, ShieldIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { pick } from "./copy";
import { copy } from "./doors.copy";
import { CurrencyFact, Stage, TwoPrice } from "./doors/client";

/**
 * Candidate home page "doors": here or abroad.
 *
 * HomeLink serves two people. One is abroad and has to trust a place they
 * cannot see; the other lives here and wants to rent, buy or hire in francs.
 * The first screen puts that choice on the page as two doors beside the
 * search, and the page answers it: the headline, the panel under the doors
 * and the order of everything below follow whichever is open. Both doors'
 * content is rendered here once; a small client component picks which one
 * leads. The signature is the other door's currency in small print beside
 * every price on the page.
 */
export default async function Design({ locale, data }: { locale: string; data: LandingData }) {
  const c = pick(copy, locale);
  const t = await getTranslations("landing");
  const tTrust = await getTranslations("trust");
  const tVerify = await getTranslations("verification");
  const tNav = await getTranslations("nav");
  const tSmart = await getTranslations("smart");
  const tExp = await getTranslations("experiences");

  const intl = INTL_LOCALES[locale as Locale] ?? locale;
  const short = (iso: string) => formatDate(iso, intl, { day: "numeric", month: "short" });

  // Cheapest of each kind, compared in minor units within one currency: every
  // fixture is priced in RWF, and a mixed one would be skipped, not misread.
  const cheapest = <T,>(items: T[], price: (x: T) => Money | undefined) => {
    let best: Money | undefined;
    for (const x of items) {
      const p = price(x);
      if (p && (!best || (p.currency === best.currency && p.minor < best.minor))) best = p;
    }
    return best;
  };

  // How far each neighbourhood is from the airport: its closest listed stay,
  // by the same road estimate the result cards use.
  const airport = new Map<string, number>();
  for (const l of data.stays) {
    const m = minutesTo(l.location, "airport");
    const best = airport.get(l.neighbourhood);
    if (best === undefined || m < best) airport.set(l.neighbourhood, m);
  }

  const heads: Record<Segment, { title: string; body: string }> = {
    abroad: { title: t("heroTitle"), body: t("heroBody") },
    rwanda: { title: c.rwandaTitle, body: c.rwandaBody },
  };

  const facts = (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
      <span className="tnum">{tTrust("listingsVerified", { count: data.total })}</span>
      <span aria-hidden>·</span>
      <span>{tTrust("escrowProtected")}</span>
    </p>
  );

  /* ---------- The abroad door: the newest inspection, and what keeps the money safe. ---------- */
  const { latest, record } = data;
  const abroadPanel =
    latest && record ? (
      <div className="grid gap-6 sm:grid-cols-2">
        <Link href={`/stays/${latest.slug}`} className="group flex flex-col gap-4">
          <SupplyImage seed={latest.imageSeed} src={latest.images?.[0]} alt={latest.name} sizes="(max-width: 640px) 100vw, 320px" className="h-40 rounded-[10px] sm:h-44" priority />
          <div className="flex flex-col gap-1">
            <p className="text-[13px] text-ink-3">{c.newest}</p>
            <p className="font-display text-[20px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{latest.name}</p>
            <p className="text-[13px] text-ink-2">
              {latest.neighbourhood} · {c.airport(minutesTo(latest.location, "airport"))}
            </p>
          </div>
          <TwoPrice amount={latest.nightlyRate} unit={tSmart("perNightShort")} className="text-[15px]" />
          <div className="flex items-center gap-3 border-t border-line-soft pt-4">
            <Stamp name={record.inspectorName} />
            <p className="text-pretty text-[13px] leading-snug text-ink-2">{tVerify("inspectedBy", { name: record.inspectorName, date: data.inspectedOn })}</p>
          </div>
        </Link>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-ink-3">{c.checked}</p>
            <ul className="flex flex-col border-t border-line-soft">
              {data.checks.filter((k) => k.key !== "escrow").map((k) => (
                <li key={k.key} className="flex h-9 items-center gap-2 border-b border-line-soft text-[14px] text-ink-2">
                  <CheckIcon size={16} className="flex-none text-trust" />
                  {tVerify(`steps.${k.key}`)}
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-col gap-4">
            <Fact icon={<ShieldIcon size={18} />} title={tVerify("steps.escrow")} body={tVerify("escrowShort")} />
            <Fact icon={<MessageIcon size={18} />} title={t("how.peopleTitle")} body={c.teamBody} />
            <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
              <span className="mt-0.5 text-ink-3"><BanknoteIcon size={18} /></span>
              <CurrencyFact />
            </li>
          </ul>
          <Link href="/stays" className="mt-auto inline-flex items-center gap-2 self-start rounded-ctl text-[14px] font-medium text-brand hover:text-brand-deep">
            {t("lane.stays", { count: data.stays.length })}
            <ArrowRightIcon size={16} />
          </Link>
        </div>
      </div>
    ) : null;

  /* ---------- The Rwanda door: renting, buying and cars, each with a real floor price. ---------- */
  const newestLease = [...data.leases].sort((a, b) => b.verification.inspectedAt.localeCompare(a.verification.inspectedAt))[0];
  const image = (key: string) => data.lanes.find((l) => l.key === key)?.image ?? "";
  const rows = [
    { key: "homes", title: c.rentTitle, line: t("lane.homes", { count: data.leases.length }), href: "/stays?band=long", price: cheapest(data.leases, (l) => l.monthlyRate), unit: tSmart("perMonthShort") },
    { key: "buy", title: c.buyTitle, line: t("lane.buy", { count: data.sales.length }), href: "/buy", price: cheapest(data.sales, (s) => s.price), unit: undefined },
    { key: "cars", title: c.carsTitle, line: t("lane.cars", { count: data.cars.length }), href: "/cars", price: cheapest(data.cars, (v) => v.dailyRate), unit: tSmart("perDayShort") },
  ];
  const rwandaPanel = (
    <div className="flex flex-1 flex-col">
      <ul className="flex flex-col">
        {rows.map((r) => (
          <li key={r.key} className="border-b border-line-soft first:-mt-2">
            <Link href={r.href} className="group grid grid-cols-[56px_minmax(0,1fr)_16px] items-center gap-4 py-4 sm:grid-cols-[88px_minmax(0,1fr)_auto_16px]">
              <span className="relative h-14 overflow-hidden rounded-[8px] sm:h-[72px]">
                <Image src={image(r.key)} alt="" fill sizes="88px" className="object-cover" />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-display text-[20px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{r.title}</span>
                <span className="text-[13px] leading-snug text-ink-2">{r.line}</span>
                {r.price && (
                  <span className="text-[14px] sm:hidden">
                    <TwoPrice amount={r.price} unit={r.unit} prefix={t("fromPrice")} />
                  </span>
                )}
              </span>
              {r.price && (
                <span className="hidden text-right text-[15px] sm:block">
                  <TwoPrice amount={r.price} unit={r.unit} prefix={t("fromPrice")} className="flex-col items-end" />
                </span>
              )}
              <ArrowRightIcon size={16} className="text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5">
        {newestLease && (
          <Link href={`/stays/${newestLease.slug}`} className="group flex min-w-0 items-center gap-3">
            <Stamp name={newestLease.verification.inspectorName} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] text-ink transition-colors duration-150 group-hover:text-brand">{c.rentNewest(newestLease.name)}</span>
              <span className="text-[12px] text-ink-3">{tVerify("inspectedBy", { name: newestLease.verification.inspectorName, date: short(newestLease.verification.inspectedAt) })}</span>
            </span>
          </Link>
        )}
      </div>
    </div>
  );

  /* ---------- Below the first screen: the same sections for everyone, ordered by the door. ---------- */
  const featured = (
    <section aria-labelledby="doors-feed" className="flex flex-col gap-8">
      <Head id="doors-feed" title={t("feedTitle")} body={t("feedBody")} href="/stays" link={t("viewAll")} />
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {data.featured.map((l) => (
          <Link key={l.id} href={`/stays/${l.slug}`} className="group flex flex-col gap-3">
            <SupplyImage seed={l.imageSeed} src={l.images?.[0]} alt={l.name} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px" className="aspect-[4/3] rounded-card" />
            <div className="flex items-start justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[16px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{l.name}</span>
                <span className="text-[13px] text-ink-3">{l.neighbourhood} · {c.airport(minutesTo(l.location, "airport"))}</span>
              </span>
              <Stamp name={l.verification.inspectorName} />
            </div>
            <TwoPrice amount={l.nightlyRate} unit={tSmart("perNightShort")} className="text-[15px]" />
            <span className="sr-only">{tVerify("inspectedBy", { name: l.verification.inspectorName, date: short(l.verification.inspectedAt) })}</span>
          </Link>
        ))}
      </div>
    </section>
  );

  const how = (
    <section aria-labelledby="doors-how" className="flex flex-col gap-8">
      <Head id="doors-how" title={t("howTitle")} body={t("howBody")} />
      <ol className="grid gap-x-8 border-t border-line lg:grid-cols-3">
        {(["inspect", "escrow", "people"] as const).map((step, i) => (
          <li key={step} className="flex flex-col gap-2 border-b border-line py-6 lg:border-b-0">
            <span className="tnum font-display text-[22px] leading-none text-ink-3">{i + 1}</span>
            <h3 className="mt-2 font-display text-[20px] font-medium leading-snug text-ink">{t(`how.${step}Title`)}</h3>
            <p className="max-w-[48ch] text-[15px] leading-relaxed text-ink-2">{t(`how.${step}Body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );

  const places = (
    <section aria-labelledby="doors-places" className="flex flex-col gap-8">
      <Head id="doors-places" title={t("placesTitle")} body={t("placesBody")} />
      <ul className="grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
        {data.places.map((p) => {
          const price = data.from.get(p.name);
          const mins = airport.get(p.name);
          return (
            <li key={p.name} className="border-b border-line">
              <Link href={`/neighbourhoods/${p.name.toLowerCase()}`} className="group flex min-h-20 items-center justify-between gap-4 rounded-ctl py-3">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[16px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">{p.name}</span>
                  <span className="text-[13px] text-ink-3">{DISTRICTS[p.name] ?? "Kigali"}</span>
                  {mins !== undefined && <span className="text-[12px] text-ink-3">{c.airport(mins)}</span>}
                </span>
                <span className="flex flex-none flex-col items-end gap-0.5 text-[13px]">
                  <span className="tnum text-ink-2">{tSmart("placeCount", { count: p.count })}</span>
                  {price && (
                    <TwoPrice amount={price} prefix={t("fromPrice")} className="flex-col items-end text-right" />
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const days = (
    <section aria-labelledby="doors-days" className="flex flex-col gap-8">
      <Head id="doors-days" title={t("daysTitle")} body={t("daysBody")} href="/experiences" link={t("daysAll")} />
      <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {data.days.map((e) => (
          <Link key={e.id} href={`/experiences/${e.slug}`} className="group flex flex-col gap-3">
            <SupplyImage seed={e.imageSeed} src={e.images?.[0]} alt={e.name} sizes="(max-width: 640px) 100vw, 280px" className="aspect-[4/3] rounded-card" />
            <span className="text-[16px] font-medium leading-snug text-ink transition-colors duration-150 group-hover:text-brand">{e.name}</span>
            <span className="flex flex-wrap gap-x-4 text-[13px] text-ink-2">
              <span className="flex items-center gap-1"><ClockIcon size={14} className="text-ink-3" />{tExp("duration", { count: e.durationHours })}</span>
              <span className="flex items-center gap-1"><UsersIcon size={14} className="text-ink-3" />{tExp("groupMax", { count: e.groupMax })}</span>
            </span>
            <span className="flex flex-wrap items-baseline gap-x-1 text-[15px]">
              <TwoPrice amount={e.pricePerPerson} />
              <span className="text-[13px] text-ink-3">{tExp("perPerson")}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );

  // The lanes in two orders: stays first for someone flying in, renting and
  // buying first for someone who lives here.
  const laneOrder: Record<Segment, string[]> = {
    abroad: ["stays", "experiences", "cars", "homes", "buy"],
    rwanda: ["homes", "buy", "cars", "stays", "experiences"],
  };
  const lanes = (s: Segment) => (
    <section aria-labelledby="doors-lanes" className="flex flex-col gap-8">
      <Head id="doors-lanes" title={t("lanesTitle")} />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {laneOrder[s].map((key, i) => {
          const lane = data.lanes.find((l) => l.key === key)!;
          return (
            <li key={key} className={cn(i === 0 && "col-span-2 sm:col-span-1")}>
              <Link href={lane.href} className="group flex flex-col gap-3">
                <span className={cn("relative overflow-hidden rounded-card", i === 0 ? "aspect-[2/1] sm:aspect-[4/5]" : "aspect-[4/5]")}>
                  <Image src={lane.image} alt="" fill sizes="(max-width: 640px) 50vw, 220px" className="object-cover" />
                </span>
                <span className="flex items-center justify-between gap-2 text-[17px] font-medium text-ink transition-colors duration-150 group-hover:text-brand">
                  {tNav(lane.label)}
                  <ArrowRightIcon size={16} className="flex-none text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
                <span className="tnum -mt-2 text-[13px] leading-5 text-ink-2">{t(`lane.${lane.key}`, { count: lane.count })}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <Stage
      heads={heads}
      facts={facts}
      panels={{ abroad: abroadPanel, rwanda: rwandaPanel }}
      sections={{ featured, how, places, days }}
      lanes={{ abroad: lanes("abroad"), rwanda: lanes("rwanda") }}
    />
  );
}

/** The inspector's initials as a stamp. The name is always in the text beside it or read out instead. */
function Stamp({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="grid size-9 flex-none -rotate-6 place-items-center rounded-full border-[1.5px] border-trust text-[12px] font-semibold tracking-wide text-trust">
      {initials(name)}
    </span>
  );
}

function Fact({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
      <span className="mt-0.5 text-ink-3">{icon}</span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-medium text-ink">{title}</span>
        <span className="text-[13px] leading-snug text-ink-3">{body}</span>
      </span>
    </li>
  );
}

function Head({ id, title, body, href, link }: { id: string; title: string; body?: string; href?: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h2 id={id} className="font-display text-[28px] font-medium leading-tight text-ink">{title}</h2>
        {body && <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{body}</p>}
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
