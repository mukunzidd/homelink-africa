import { repos } from "@/lib/repos";
import { convert, type CurrencyCode, type Money } from "@/lib/domain/money";
import { today } from "@/lib/domain/dates";
import type { Sort } from "@/lib/search-params";
import { buildDocuments } from "./documents";
import { createLocalEngine } from "./local-engine";
import { createMeiliEngine } from "./meili-engine";
import { parseQuery, type SearchIntent } from "./parse";
import type { EngineFilters, EngineHit, SearchEngine } from "./types";

/**
 * The search service. Sits beside `repos()`, not inside it.
 *
 * `repos()` answers "give me this row"; search answers "which rows, in what
 * order, and why". Different questions, and in Phase 2 different systems:
 * Postgres for the first, Meilisearch for the second. Keeping them apart now
 * means neither has to pretend to be the other later.
 */

let engine: SearchEngine | null = null;
let meiliDownUntil = 0;

function engines(): { primary: SearchEngine | null; local: SearchEngine } {
  const load = () => buildDocuments(repos());
  const local = createLocalEngine(load);
  const url = process.env.MEILI_URL;
  const key = process.env.MEILI_MASTER_KEY ?? process.env.MEILI_KEY ?? "";
  return { primary: url ? createMeiliEngine({ url, key, load }) : null, local };
}

const built = engines();

/**
 * Meilisearch when it is configured and answering, the local engine when it is
 * not. A search box that throws because a container is down is worse than one
 * that is a few milliseconds slower, so failure is logged once and retried
 * after half a minute rather than surfaced to a guest.
 */
async function run(query: Parameters<SearchEngine["search"]>[0]): Promise<{ hits: EngineHit[]; engine: SearchEngine["name"] }> {
  if (built.primary && Date.now() > meiliDownUntil) {
    try {
      const hits = await built.primary.search(query);
      engine = built.primary;
      return { hits, engine: "meilisearch" };
    } catch (err) {
      if (engine !== built.local) console.warn(`[search] Meilisearch unavailable, using local engine: ${(err as Error).message}`);
      meiliDownUntil = Date.now() + 30_000;
    }
  }
  engine = built.local;
  return { hits: await built.local.search(query), engine: "local" };
}

/**
 * After a write that changes what guests can find (a rate, a home taken
 * down or put live), both engines read the documents again. Meilisearch
 * being down is not the editor's problem: the local engine is refreshed
 * regardless, searches fall back to it, and Meili's index is cleared and
 * rebuilt the next time it is used.
 */
export async function searchChanged(): Promise<void> {
  await built.local.refresh();
  if (!built.primary) return;
  try {
    await built.primary.refresh();
  } catch (err) {
    // Meilisearch may still hold what was just taken down. Answer from the
    // local engine, which is fresh, until Meili has been rebuilt; its next
    // rebuild deletes before it loads.
    console.warn(`[search] reindex failed, using local engine: ${(err as Error).message}`);
    meiliDownUntil = Date.now() + 30_000;
  }
}

/** Which constraint was given up to find something, in the order it is given up. */
export type RelaxKey = "text" | "maxPrice" | "amenities" | "bedrooms" | "party" | "neighbourhood" | "driveMode" | "interest";

export type StayInput = {
  text?: string;
  neighbourhood?: string;
  bedrooms?: number;
  party?: number;
  amenities?: string[];
  lease?: boolean;
  maxPrice?: Money;
  sort?: Sort;
  limit?: number;
};

async function usdCeiling(m: Money | undefined): Promise<number | undefined> {
  if (!m) return undefined;
  return convert(m, "USD", await repos().fx.rates()).minor;
}

async function stayFilters(input: StayInput): Promise<EngineFilters> {
  const ceiling = await usdCeiling(input.maxPrice);
  return {
    kind: "stay",
    neighbourhood: input.neighbourhood,
    minBedrooms: input.bedrooms,
    minSleeps: input.party,
    amenities: input.amenities?.length ? input.amenities : undefined,
    lease: input.lease ?? false,
    maxPriceUsd: input.lease ? undefined : ceiling,
    maxMonthlyUsd: input.lease ? ceiling : undefined,
  };
}

/**
 * Stays, with relaxation.
 *
 * When everything the guest asked for matches nothing, the least important
 * constraint is dropped and the search runs again, until something comes
 * back or nothing is left to drop. The caller is told which constraints went,
 * so the page can say "nothing under $80 — these are the closest". The order
 * is a judgement: price is the most negotiable, place the least.
 */
export async function searchStays(input: StayInput) {
  const order: RelaxKey[] = ["text", "maxPrice", "amenities", "bedrooms", "party", "neighbourhood"];
  const current: StayInput = { ...input };
  const relaxed: RelaxKey[] = [];

  for (;;) {
    const { hits, engine } = await run({
      text: current.text ?? "",
      filters: await stayFilters(current),
      sort: current.sort,
      limit: current.limit ?? 50,
    });
    if (hits.length) return { hits, relaxed, engine };

    const next = order.find((k) => {
      const v = current[k as keyof StayInput];
      return Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "";
    });
    if (!next) return { hits, relaxed, engine };
    delete current[next as keyof StayInput];
    relaxed.push(next);
  }
}

/**
 * Relaxation only happens in the lane the sentence committed to. An unscoped
 * "gorila" should find the gorilla trek, not fall back to every car because no
 * car is called that.
 */
export type SaleInput = {
  text?: string;
  neighbourhood?: string;
  bedrooms?: number;
  maxPrice?: Money;
  sort?: Sort;
  limit?: number;
};

/** Homes for sale, with the same out-loud relaxation as stays. */
export async function searchSales(input: SaleInput) {
  const order: RelaxKey[] = ["text", "maxPrice", "bedrooms", "neighbourhood"];
  const current: SaleInput = { ...input };
  const relaxed: RelaxKey[] = [];
  for (;;) {
    const { hits, engine } = await run({
      text: current.text ?? "",
      filters: {
        kind: "sale",
        neighbourhood: current.neighbourhood,
        minBedrooms: current.bedrooms,
        maxPriceUsd: await usdCeiling(current.maxPrice),
      },
      sort: current.sort,
      limit: current.limit ?? 50,
    });
    if (hits.length) return { hits, relaxed, engine };
    const next = order.find((k) => current[k as keyof SaleInput] !== undefined && current[k as keyof SaleInput] !== "");
    if (!next) return { hits, relaxed, engine };
    delete current[next as keyof SaleInput];
    relaxed.push(next);
  }
}

async function searchCars(intent: SearchIntent, limit: number) {
  const filters: EngineFilters = { kind: "car", minSleeps: intent.party, driveMode: intent.driveMode };
  let res = await run({ text: intent.text, filters, sort: intent.sort, limit });
  const relaxed: RelaxKey[] = [];
  if (!res.hits.length && intent.text && intent.lane === "cars") {
    relaxed.push("text");
    res = await run({ text: "", filters, sort: intent.sort, limit });
  }
  return { ...res, relaxed };
}

async function searchExperiences(intent: SearchIntent, limit: number) {
  const filters: EngineFilters = { kind: "experience", minSleeps: intent.party, interest: intent.interest };
  let res = await run({ text: intent.text, filters, limit });
  const relaxed: RelaxKey[] = [];
  if (!res.hits.length && intent.text && intent.lane === "experiences") {
    relaxed.push("text");
    res = await run({ text: "", filters, limit });
  }
  return { ...res, relaxed };
}

export async function parseForSite(raw: string, displayCurrency: CurrencyCode): Promise<SearchIntent> {
  const places = await repos().stays.neighbourhoodsWithCounts();
  return parseQuery(raw, {
    today: today(),
    neighbourhoods: places.map((p) => p.name),
    displayCurrency,
  });
}

/**
 * The palette's answer to a sentence: the reading of it, and the best few
 * things in each lane it could be about.
 */
export async function smartSearch(raw: string, displayCurrency: CurrencyCode) {
  const intent = await parseForSite(raw, displayCurrency);
  const scoped = intent.lane;
  const limit = scoped ? 6 : 4;
  const want = (lane: SearchIntent["lane"]) => !scoped || scoped === lane;

  const stayInput: StayInput = {
    text: intent.text,
    neighbourhood: intent.neighbourhood,
    bedrooms: intent.bedrooms,
    party: intent.party,
    amenities: intent.amenities,
    lease: intent.lease,
    maxPrice: intent.maxPrice,
    sort: intent.sort,
    limit,
  };

  const saleInput: SaleInput = {
    text: intent.text,
    neighbourhood: intent.neighbourhood,
    bedrooms: intent.bedrooms,
    maxPrice: intent.maxPrice,
    sort: intent.sort,
    limit,
  };

  const [stays, sales, cars, experiences] = await Promise.all([
    want("stays")
      ? scoped
        ? searchStays(stayInput)
        : run({ text: intent.text, filters: await stayFilters(stayInput), sort: intent.sort, limit }).then((r) => ({ ...r, relaxed: [] as RelaxKey[] }))
      : null,
    want("buy")
      ? scoped
        ? searchSales(saleInput)
        : run({ text: intent.text, filters: { kind: "sale", neighbourhood: intent.neighbourhood, minBedrooms: intent.bedrooms }, limit: 3 }).then((r) => ({ ...r, relaxed: [] as RelaxKey[] }))
      : null,
    want("cars") ? searchCars(intent, limit) : null,
    want("experiences") ? searchExperiences(intent, limit) : null,
  ]);

  return {
    intent,
    engine: stays?.engine ?? sales?.engine ?? cars?.engine ?? experiences?.engine ?? "local",
    stays: stays ?? { hits: [], relaxed: [] },
    sales: sales ?? { hits: [], relaxed: [] },
    cars: cars ?? { hits: [], relaxed: [] },
    experiences: experiences ?? { hits: [], relaxed: [] },
  };
}

export type { SearchIntent } from "./parse";
export type { EngineHit, Highlight } from "./types";
