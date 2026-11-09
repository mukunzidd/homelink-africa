import type { Sort } from "@/lib/search-params";

export type SupplyKind = "stay" | "sale" | "car" | "experience";

/**
 * One row in the index. Flat on purpose: this is the shape Meilisearch stores,
 * and the in-process engine reads the same rows so the two cannot disagree
 * about what a field means.
 *
 * Prices are normalised to USD minor units for filtering and sorting only.
 * Nothing displays them; the UI goes back to the listing for the
 * authoritative price in the supplier's own currency.
 */
export type SearchDoc = {
  id: string;
  kind: SupplyKind;
  slug: string;
  name: string;
  summary: string;
  neighbourhood: string;
  /** Amenity keys, for filtering. */
  amenities: string[];
  /** The same amenities in words, so "generator" can find "Backup power". */
  amenityText: string;
  /** Vehicle class, interests, and other words a guest might type. */
  keywords: string;
  bedrooms: number;
  sleeps: number;
  priceUsd: number;
  monthlyUsd: number | null;
  nightly: boolean;
  lease: boolean;
  driveModes: string[];
  interests: string[];
  /** Epoch days of the last inspection, so "recently verified" is a sort. */
  inspectedDay: number;
};

export type EngineFilters = {
  kind: SupplyKind;
  neighbourhood?: string;
  minBedrooms?: number;
  minSleeps?: number;
  maxPriceUsd?: number;
  maxMonthlyUsd?: number;
  amenities?: string[];
  lease?: boolean;
  driveMode?: string;
  interest?: string;
};

export type EngineQuery = {
  text: string;
  filters: EngineFilters;
  sort?: Sort;
  limit?: number;
};

/** A run of a name, marked where the query matched it. */
export type Highlight = { text: string; hit: boolean }[];

export type EngineHit = {
  id: string;
  kind: SupplyKind;
  name: Highlight;
};

export interface SearchEngine {
  readonly name: "meilisearch" | "local";
  search(query: EngineQuery): Promise<EngineHit[]>;
  /** Re-reads the documents, after a write changed what is searchable (an edit, a home taken down). */
  refresh(): Promise<void>;
}
