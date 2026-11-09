import { getTranslations } from "next-intl/server";
import { repos } from "@/lib/repos";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { parseForSite } from "@/lib/search";
import { formatDate, today } from "@/lib/domain/dates";
import type { Money } from "@/lib/domain/money";
import { EXAMPLE_KEYS } from "@/lib/search/examples";

/**
 * Everything the home page shows, read once from the repos: every landing
 * design (the live one and the candidates at /preview/landing) renders
 * from this, so they differ in design and never in data.
 */
export async function loadLandingData(locale: string) {
  const tSmart = await getTranslations("smart");
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

  return {
    featured, stays, leases, sales, cars, days, places, from, latest, record, inspectedOn, checks, showcase, lanes,
    /** Everything verified on the site, every lane. */
    total: stays.length + sales.length + cars.length + days.length,
  };
}

export type LandingData = Awaited<ReturnType<typeof loadLandingData>>;
