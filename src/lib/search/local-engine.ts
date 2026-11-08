import { fold, typoBudget, editDistance } from "./parse";
import type { EngineFilters, EngineHit, EngineQuery, Highlight, SearchDoc, SearchEngine } from "./types";

/**
 * Search with no server.
 *
 * The fixtures promise holds: the app runs with no containers at all, and a
 * search box that only works with Docker up is not one anybody can review.
 * This engine applies the same filters as the Meilisearch one, and the same
 * typo budget, so switching between them changes speed, not results.
 */

export function matchesFilters(doc: SearchDoc, f: EngineFilters): boolean {
  if (doc.kind !== f.kind) return false;
  if (f.neighbourhood && doc.neighbourhood !== f.neighbourhood) return false;
  if (f.minBedrooms !== undefined && doc.bedrooms < f.minBedrooms) return false;
  if (f.minSleeps !== undefined && doc.sleeps < f.minSleeps) return false;
  if (f.lease === true && !doc.lease) return false;
  if (f.lease === false && doc.kind === "stay" && !doc.nightly) return false;
  if (f.maxPriceUsd !== undefined && doc.priceUsd > f.maxPriceUsd) return false;
  if (f.maxMonthlyUsd !== undefined && (doc.monthlyUsd === null || doc.monthlyUsd > f.maxMonthlyUsd)) return false;
  if (f.amenities?.length && !f.amenities.every((a) => doc.amenities.includes(a))) return false;
  if (f.driveMode && !doc.driveModes.includes(f.driveMode)) return false;
  if (f.interest && !doc.interests.includes(f.interest)) return false;
  return true;
}

function tokens(s: string): string[] {
  return fold(s).split(" ").filter(Boolean);
}

/** 3 for an exact word, 2 for a prefix, 1 within the typo budget, else 0. */
function wordScore(q: string, candidates: string[]): number {
  let best = 0;
  for (const c of candidates) {
    if (c === q) return 3;
    if (q.length >= 3 && c.startsWith(q)) best = Math.max(best, 2);
    else if (editDistance(q, c) <= typoBudget(q.length)) best = Math.max(best, 1);
  }
  return best;
}

const WEIGHTS: [keyof SearchDoc, number][] = [
  ["name", 3],
  ["neighbourhood", 2],
  ["keywords", 1.5],
  ["amenityText", 1.2],
  ["summary", 1],
];

function score(doc: SearchDoc, words: string[]): number {
  let total = 0;
  for (const w of words) {
    let best = 0;
    for (const [field, weight] of WEIGHTS) {
      best = Math.max(best, wordScore(w, tokens(String(doc[field]))) * weight);
    }
    // A word that matches nothing costs the document its place in the
    // result: every word the guest typed has to land somewhere.
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function highlight(name: string, words: string[]): Highlight {
  if (!words.length) return [{ text: name, hit: false }];
  return name
    .split(/(\s+)/)
    .map((part) => {
      const f = fold(part);
      const hit = !!f && words.some((w) => f === w || (w.length >= 3 && f.startsWith(w)) || editDistance(w, f) <= typoBudget(w.length));
      return { text: part, hit };
    })
    .reduce<Highlight>((acc, seg) => {
      const last = acc[acc.length - 1];
      if (last && last.hit === seg.hit) last.text += seg.text;
      else acc.push({ ...seg });
      return acc;
    }, []);
}

export function createLocalEngine(load: () => Promise<SearchDoc[]>): SearchEngine {
  let docs: Promise<SearchDoc[]> | null = null;

  return {
    name: "local",
    async search({ text, filters, sort, limit = 20 }: EngineQuery): Promise<EngineHit[]> {
      docs ??= load();
      const words = tokens(text);
      const ranked = (await docs)
        .filter((d) => matchesFilters(d, filters))
        .map((d) => ({ d, s: words.length ? score(d, words) : 1 }))
        .filter(({ s }) => s > 0);

      const price = (d: SearchDoc) => (filters.lease ? (d.monthlyUsd ?? d.priceUsd) : d.priceUsd);
      ranked.sort((a, b) => {
        switch (sort) {
          case "priceAsc":
            return price(a.d) - price(b.d);
          case "priceDesc":
            return price(b.d) - price(a.d);
          case "size":
            return b.d.bedrooms - a.d.bedrooms || b.d.sleeps - a.d.sleeps;
          case "newest":
            return b.d.inspectedDay - a.d.inspectedDay;
          default:
            // Relevance first, then the same tie-break the listing page has
            // always used: the most recently inspected place.
            return b.s - a.s || b.d.inspectedDay - a.d.inspectedDay;
        }
      });

      return ranked.slice(0, limit).map(({ d }) => ({
        id: d.id,
        kind: d.kind,
        name: highlight(d.name, words),
      }));
    },
  };
}
