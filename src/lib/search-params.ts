import { isIsoDate, type IsoDate } from "@/lib/domain/dates";
import type { DurationBand } from "@/lib/domain/types";

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
  amenities: string[];
  band?: DurationBand;
  sort: Sort;
};

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
    amenities: (one(params.amenities) ?? "").split(",").filter(Boolean),
    band: (["short", "medium", "long"] as const).includes(band as DurationBand)
      ? (band as DurationBand)
      : undefined,
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
  if (search.sort && search.sort !== "recommended") params.set("sort", search.sort);

  return params.toString();
}

/** How many narrowing choices are on, for the "N filters on" summary. */
export function countActiveFilters(search: StaySearch): number {
  return (
    search.amenities.length +
    (search.bedrooms ? 1 : 0) +
    (search.neighbourhood ? 1 : 0) +
    (search.band ? 1 : 0)
  );
}
