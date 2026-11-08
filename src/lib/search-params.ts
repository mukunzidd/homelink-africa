import { isIsoDate, type IsoDate } from "@/lib/domain/dates";
import type { Amenity, DurationBand } from "@/lib/domain/types";
import { isLandmark, type LandmarkKey } from "@/lib/domain/landmarks";
import { CURRENCIES, fromMajor, toMajor, type CurrencyCode, type Money } from "@/lib/domain/money";

/**
 * The search is the state of the page.
 *
 * Everything a person chose — where, when, how many, how filtered, how sorted
 * — lives in the URL. That makes a result set shareable, back-button correct,
 * and refresh-safe, and it means the server can render the right page without
 * a client round trip. Parsing lives here so pages and components agree on
 * what a malformed value means instead of each guessing separately.
 */

export const SORTS = [
  "recommended",
  "priceAsc",
  "priceDesc",
  "newest",
  "size",
] as const;
export type Sort = (typeof SORTS)[number];

export type StaySearch = {
  neighbourhood?: string;
  from: IsoDate | null;
  to: IsoDate | null;
  party: number;
  bedrooms?: number;
  amenities: Amenity[];
  band?: DurationBand;
  /** A ceiling on the nightly rate, or the monthly one with `band=long`. */
  maxPrice?: Money;
  /**
   * Words the guest typed that are not a filter: "quiet", "terrace", "view".
   * Ranked by the search engine; never used to exclude on its own.
   */
  q?: string;
  /** The landmark travel times are measured from. Not a filter. */
  near?: LandmarkKey;
  sort: Sort;
};

/**
 * Every amenity a filter can name. A value outside this list in the URL is
 * dropped: `amenities=pool` used to render a chip reading "amenities.pool" and
 * announce "1 close match" for a filter that does not exist.
 */
export const AMENITIES: readonly Amenity[] = [
  "backupPower", "fibre", "furnished", "parking", "security", "workspace", "garden", "water",
];

export type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseStaySearch(params: RawParams): StaySearch {
  const from = one(params.from);
  const to = one(params.to);
  const party = Number(one(params.party));
  const bedrooms = Number(one(params.bedrooms));
  const band = one(params.band);
  const sort = one(params.sort);
  const max = Number(one(params.max));
  const cur = one(params.cur);

  // A departure that is not after the arrival is dropped rather than swapped.
  // Guessing what someone meant about dates is how you book the wrong week.
  const validFrom = isIsoDate(from) ? from : null;
  const validTo = isIsoDate(to) && validFrom && to > validFrom ? to : null;

  return {
    neighbourhood: one(params.neighbourhood) || undefined,
    from: validFrom,
    to: validTo,
    party: Number.isInteger(party) && party >= 1 && party <= 16 ? party : 2,
    bedrooms:
      Number.isInteger(bedrooms) && bedrooms >= 1 && bedrooms <= 6
        ? bedrooms
        : undefined,
    amenities: (one(params.amenities) ?? "")
      .split(",")
      .filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a)),
    band: (["short", "medium", "long"] as const).includes(band as DurationBand)
      ? (band as DurationBand)
      : undefined,
    maxPrice:
      Number.isFinite(max) && max > 0 && CURRENCIES.includes(cur as CurrencyCode)
        ? fromMajor(max, cur as CurrencyCode)
        : undefined,
    q: one(params.q)?.trim().slice(0, 120) || undefined,
    near: isLandmark(one(params.near)) ? (one(params.near) as LandmarkKey) : undefined,
    sort: SORTS.includes(sort as Sort) ? (sort as Sort) : "recommended",
  };
}

/** Serialise back to a query string, omitting anything at its default. */
export function staySearchToQuery(search: Partial<StaySearch>): string {
  const params = new URLSearchParams();

  if (search.neighbourhood) params.set("neighbourhood", search.neighbourhood);
  if (search.from) params.set("from", search.from);
  if (search.to) params.set("to", search.to);
  if (search.party && search.party !== 2) params.set("party", String(search.party));
  if (search.bedrooms) params.set("bedrooms", String(search.bedrooms));
  if (search.amenities?.length) params.set("amenities", search.amenities.join(","));
  if (search.band) params.set("band", search.band);
  if (search.maxPrice) {
    params.set("max", String(toMajor(search.maxPrice)));
    params.set("cur", search.maxPrice.currency);
  }
  if (search.q) params.set("q", search.q);
  if (search.near) params.set("near", search.near);
  if (search.sort && search.sort !== "recommended") params.set("sort", search.sort);

  return params.toString();
}

/** How many narrowing choices are on, for the "N filters on" summary. */
export function countActiveFilters(search: StaySearch): number {
  return (
    search.amenities.length +
    (search.bedrooms ? 1 : 0) +
    (search.neighbourhood ? 1 : 0) +
    (search.maxPrice ? 1 : 0)
  );
}

/* ------------------------------------------------------------------ buying */

export const SALE_SORTS = ["recommended", "priceAsc", "priceDesc", "size"] as const;
export type SaleSortKey = (typeof SALE_SORTS)[number];

export type SaleSearch = {
  neighbourhood?: string;
  bedrooms?: number;
  maxPrice?: Money;
  kind?: "house" | "apartment" | "townhouse";
  q?: string;
  near?: LandmarkKey;
  sort: SaleSortKey;
};

export function parseSaleSearch(params: RawParams): SaleSearch {
  const bedrooms = Number(one(params.bedrooms));
  const max = Number(one(params.max));
  const cur = one(params.cur);
  const kind = one(params.kind);
  const sort = one(params.sort);
  return {
    neighbourhood: one(params.neighbourhood) || undefined,
    bedrooms: Number.isInteger(bedrooms) && bedrooms >= 1 && bedrooms <= 6 ? bedrooms : undefined,
    maxPrice:
      Number.isFinite(max) && max > 0 && CURRENCIES.includes(cur as CurrencyCode)
        ? fromMajor(max, cur as CurrencyCode)
        : undefined,
    kind: (["house", "apartment", "townhouse"] as const).includes(kind as never) ? (kind as SaleSearch["kind"]) : undefined,
    q: one(params.q)?.trim().slice(0, 120) || undefined,
    near: isLandmark(one(params.near)) ? (one(params.near) as LandmarkKey) : undefined,
    sort: SALE_SORTS.includes(sort as SaleSortKey) ? (sort as SaleSortKey) : "recommended",
  };
}

export function saleSearchToQuery(search: Partial<SaleSearch>): string {
  const params = new URLSearchParams();
  if (search.neighbourhood) params.set("neighbourhood", search.neighbourhood);
  if (search.bedrooms) params.set("bedrooms", String(search.bedrooms));
  if (search.maxPrice) {
    params.set("max", String(toMajor(search.maxPrice)));
    params.set("cur", search.maxPrice.currency);
  }
  if (search.kind) params.set("kind", search.kind);
  if (search.q) params.set("q", search.q);
  if (search.near) params.set("near", search.near);
  if (search.sort && search.sort !== "recommended") params.set("sort", search.sort);
  return params.toString();
}
