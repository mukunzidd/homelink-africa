import type { NextRequest } from "next/server";
import { repos } from "@/lib/repos";
import { CURRENCIES, multiply, type CurrencyCode, type Money } from "@/lib/domain/money";
import { quoteStay } from "@/lib/domain/pricing";
import { nightsBetween } from "@/lib/domain/dates";
import { searchStays, smartSearch, type EngineHit, type Highlight } from "@/lib/search";
import { fold } from "@/lib/search/parse";
import { intentHref } from "@/lib/search/intent-url";

/**
 * The palette's endpoint. GET, so a query is a URL and a browser can cache
 * one, and because nothing about asking changes anything.
 *
 * It returns display-ready rows — name runs, the authoritative price in the
 * supplier's currency, a photograph — so the palette never has to know about
 * repositories, and the client bundle never carries the catalogue.
 */

export type PaletteRow = {
  id: string;
  kind: EngineHit["kind"];
  href: string;
  name: Highlight;
  /** Plain facts, already in order; the client localises the labels. */
  facts: { key: "bedrooms" | "sleeps" | "seats" | "hours" | "neighbourhood" | "floor"; value: number | string }[];
  price: Money;
  unit: "night" | "month" | "day" | "person" | "sale";
  image?: string;
  seed: string;
  /** When the sentence carried dates: the whole stay or hire, not the rate. */
  total?: { amount: Money; unit: "nights" | "days"; count: number };
};

export type PaletteResponse = {
  query: string;
  engine: "meilisearch" | "local";
  intent: Awaited<ReturnType<typeof smartSearch>>["intent"];
  href: string;
  relaxed: string[];
  groups: { stays: PaletteRow[]; sales: PaletteRow[]; cars: PaletteRow[]; experiences: PaletteRow[]; closest?: PaletteRow[] };
  places: { name: string; count: number }[];
  tookMs: number;
};

export async function GET(request: NextRequest) {
  const started = performance.now();
  const q = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 160);
  const curParam = request.nextUrl.searchParams.get("cur") as CurrencyCode | null;
  const currency = curParam && CURRENCIES.includes(curParam) ? curParam : "USD";

  const r = repos();
  const [result, places] = await Promise.all([
    smartSearch(q, currency),
    r.stays.neighbourhoodsWithCounts(),
  ]);
  const lease = result.intent.lease === true;
  const { from, to } = result.intent;
  const span = from && to && to > from ? nightsBetween(from, to) : 0;

  const stays = (
    await Promise.all(
      result.stays.hits.map(async (h): Promise<PaletteRow | null> => {
        const l = await r.stays.byId(h.id);
        if (!l) return null;
        const monthly = lease && l.monthlyRate;
        return {
          id: l.id,
          kind: "stay",
          href: `/stays/${l.slug}${lease ? "?band=long" : ""}`,
          name: h.name,
          facts: [
            { key: "neighbourhood", value: l.neighbourhood },
            { key: "bedrooms", value: l.bedrooms },
            { key: "sleeps", value: l.sleeps },
          ],
          price: monthly || l.nightlyRate,
          unit: monthly ? "month" : "night",
          total: (() => {
            if (monthly || !span) return undefined;
            const q = quoteStay(l, from!, to!);
            return q ? { amount: q.total, unit: "nights" as const, count: q.nights } : undefined;
          })(),
          image: l.images?.[0],
          seed: l.imageSeed,
        };
      }),
    )
  ).filter((x): x is PaletteRow => !!x);

  const sales = (
    await Promise.all(
      result.sales.hits.map(async (h): Promise<PaletteRow | null> => {
        const home = await r.sales.byId(h.id);
        if (!home) return null;
        return {
          id: home.id,
          kind: "sale",
          href: `/buy/${home.slug}`,
          name: h.name,
          facts: [
            { key: "neighbourhood", value: home.neighbourhood },
            { key: "bedrooms", value: home.bedrooms },
            { key: "floor", value: home.floorSqm },
          ],
          price: home.price,
          unit: "sale",
          image: home.images?.[0],
          seed: home.imageSeed,
        };
      }),
    )
  ).filter((x): x is PaletteRow => !!x);

  const cars = (
    await Promise.all(
      result.cars.hits.map(async (h): Promise<PaletteRow | null> => {
        const v = await r.mobility.byId(h.id);
        if (!v) return null;
        return {
          id: v.id,
          kind: "car",
          href: `/cars/${v.slug}`,
          name: h.name,
          facts: [{ key: "seats", value: v.seats }],
          price: v.dailyRate,
          unit: "day",
          total: span ? { amount: multiply(v.dailyRate, span), unit: "days" as const, count: span } : undefined,
          image: v.images?.[0],
          seed: v.imageSeed,
        };
      }),
    )
  ).filter((x): x is PaletteRow => !!x);

  const experiences = (
    await Promise.all(
      result.experiences.hits.map(async (h): Promise<PaletteRow | null> => {
        const e = await r.experiences.byId(h.id);
        if (!e) return null;
        return {
          id: e.id,
          kind: "experience",
          href: `/experiences/${e.slug}`,
          name: h.name,
          facts: [{ key: "hours", value: e.durationHours }],
          price: e.pricePerPerson,
          unit: "person",
          image: e.images?.[0],
          seed: e.imageSeed,
        };
      }),
    )
  ).filter((x): x is PaletteRow => !!x);

  // Neighbourhood suggestions: the one the sentence resolved to, or any whose
  // name starts with a word that was typed. With counts, because "Rebero (1)"
  // is more honest than a bare name that promises a choice.
  const words = fold(q).split(" ").filter((w) => w.length >= 2);
  const matchedPlaces = places.filter(
    (p) =>
      p.name === result.intent.neighbourhood ||
      words.some((w) => fold(p.name).startsWith(w)),
  );

  const scopedRelaxed =
    result.intent.lane === "cars"
      ? result.cars.relaxed
      : result.intent.lane === "experiences"
        ? result.experiences.relaxed
        : result.intent.lane === "buy"
          ? result.sales.relaxed
          : result.stays.relaxed;

  // Nothing at all: say what was missing (the palette does), and still offer
  // the closest homes without the words that matched nothing. "pool" used to
  // end in an empty window.
  let closest: PaletteRow[] | undefined;
  if (q && !stays.length && !sales.length && !cars.length && !experiences.length && !matchedPlaces.length) {
    const near = await searchStays({ neighbourhood: result.intent.neighbourhood, lease, limit: 3 });
    closest = (
      await Promise.all(
        near.hits.slice(0, 3).map(async (h): Promise<PaletteRow | null> => {
          const l = await r.stays.byId(h.id);
          if (!l) return null;
          return {
            id: l.id,
            kind: "stay",
            href: `/stays/${l.slug}`,
            name: [{ text: l.name, hit: false }],
            facts: [
              { key: "neighbourhood", value: l.neighbourhood },
              { key: "bedrooms", value: l.bedrooms },
            ],
            price: l.nightlyRate,
            unit: "night",
            image: l.images?.[0],
            seed: l.imageSeed,
          };
        }),
      )
    ).filter((x): x is PaletteRow => !!x);
  }

  const body: PaletteResponse = {
    query: q,
    engine: result.engine,
    intent: result.intent,
    href: intentHref(result.intent),
    relaxed: scopedRelaxed,
    groups: { stays, sales, cars, experiences, closest },
    places: q ? matchedPlaces.slice(0, 4) : places.slice(0, 6),
    tookMs: Math.round(performance.now() - started),
  };

  return Response.json(body, {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}
