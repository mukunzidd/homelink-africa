import type { EngineFilters, EngineHit, EngineQuery, Highlight, SearchDoc, SearchEngine } from "./types";

/**
 * Meilisearch over plain `fetch`.
 *
 * No client library: the surface used here is four endpoints, and a
 * dependency for four endpoints is a dependency to keep upgrading for
 * nothing. The index is built on first use from the same documents the local
 * engine reads, which is fine while the source is fixtures. When Postgres
 * lands, indexing moves to a write-side job and `ensureIndex` goes away.
 */

const INDEX = "supply";
const PRE = "\u0002";
const POST = "\u0003";

const SETTINGS = {
  searchableAttributes: ["name", "neighbourhood", "keywords", "amenityText", "summary"],
  filterableAttributes: [
    "kind", "neighbourhood", "bedrooms", "sleeps", "priceUsd", "monthlyUsd",
    "nightly", "lease", "amenities", "driveModes", "interests",
  ],
  sortableAttributes: ["priceUsd", "monthlyUsd", "bedrooms", "sleeps", "inspectedDay"],
  rankingRules: [
    "words", "typo", "proximity", "attributeRank", "sort", "wordPosition", "exactness",
    "inspectedDay:desc",
  ],
  // The parser already maps most of these onto filters before the engine is
  // asked. These catch the ones that reach full text unstructured.
  synonyms: {
    flat: ["apartment"],
    apartment: ["flat"],
    generator: ["backup power"],
    wifi: ["fibre", "internet"],
    fiber: ["fibre"],
    yard: ["garden"],
    "4x4": ["suv", "land cruiser"],
    van: ["minibus", "hiace"],
    trek: ["hike", "walk"],
  },
  typoTolerance: { minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 } },
};

function quote(v: string): string {
  return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function toFilter(f: EngineFilters): string {
  const parts = [`kind = ${quote(f.kind)}`];
  if (f.neighbourhood) parts.push(`neighbourhood = ${quote(f.neighbourhood)}`);
  if (f.minBedrooms !== undefined) parts.push(`bedrooms >= ${f.minBedrooms}`);
  if (f.minSleeps !== undefined) parts.push(`sleeps >= ${f.minSleeps}`);
  if (f.lease === true) parts.push("lease = true");
  if (f.lease === false) parts.push("nightly = true");
  if (f.maxPriceUsd !== undefined) parts.push(`priceUsd <= ${f.maxPriceUsd}`);
  if (f.maxMonthlyUsd !== undefined) parts.push(`monthlyUsd <= ${f.maxMonthlyUsd}`);
  for (const a of f.amenities ?? []) parts.push(`amenities = ${quote(a)}`);
  if (f.driveMode) parts.push(`driveModes = ${quote(f.driveMode)}`);
  if (f.interest) parts.push(`interests = ${quote(f.interest)}`);
  return parts.join(" AND ");
}

function toSort(q: EngineQuery): string[] | undefined {
  const price = q.filters.lease ? "monthlyUsd" : "priceUsd";
  switch (q.sort) {
    case "priceAsc":
      return [`${price}:asc`];
    case "priceDesc":
      return [`${price}:desc`];
    case "size":
      return ["bedrooms:desc", "sleeps:desc"];
    case "newest":
      return ["inspectedDay:desc"];
    default:
      return undefined;
  }
}

function parseHighlight(formatted: string): Highlight {
  const out: Highlight = [];
  for (const chunk of formatted.split(PRE)) {
    const [hit, rest] = chunk.includes(POST) ? chunk.split(POST) : [null, chunk];
    if (hit) out.push({ text: hit, hit: true });
    if (rest) out.push({ text: rest, hit: false });
  }
  return out;
}

export function createMeiliEngine(opts: {
  url: string;
  key: string;
  load: () => Promise<SearchDoc[]>;
}): SearchEngine {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.key}`,
  };

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(`${opts.url}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Meilisearch ${init?.method ?? "GET"} ${path}: ${res.status} ${await res.text()}`);
    }
    return res.status === 404 ? null : res.json();
  }

  async function waitFor(taskUid: number) {
    for (let i = 0; i < 50; i++) {
      const task = await call(`/tasks/${taskUid}`);
      if (task?.status === "succeeded") return;
      if (task?.status === "failed") throw new Error(`Meilisearch task ${taskUid}: ${task.error?.message}`);
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Meilisearch task ${taskUid} did not finish`);
  }

  let ready: Promise<void> | null = null;
  function ensureIndex(): Promise<void> {
    ready ??= (async () => {
      const created = await call("/indexes", {
        method: "POST",
        body: JSON.stringify({ uid: INDEX, primaryKey: "id" }),
      });
      if (created?.taskUid !== undefined) await waitFor(created.taskUid).catch(() => {});
      const settings = await call(`/indexes/${INDEX}/settings`, {
        method: "PATCH",
        body: JSON.stringify(SETTINGS),
      });
      const docs = await call(`/indexes/${INDEX}/documents`, {
        method: "POST",
        body: JSON.stringify(await opts.load()),
      });
      await waitFor(settings.taskUid);
      await waitFor(docs.taskUid);
    })().catch((err) => {
      ready = null;
      throw err;
    });
    return ready;
  }

  return {
    name: "meilisearch",
    async search(q: EngineQuery): Promise<EngineHit[]> {
      await ensureIndex();
      const body = {
        q: q.text,
        filter: toFilter(q.filters),
        sort: toSort(q),
        limit: q.limit ?? 20,
        // Every word has to land somewhere, as in the local engine. "Quiet
        // villa" should not quietly become "villa".
        matchingStrategy: "all",
        attributesToRetrieve: ["id", "kind", "name"],
        attributesToHighlight: ["name"],
        highlightPreTag: PRE,
        highlightPostTag: POST,
      };
      const res = await call(`/indexes/${INDEX}/search`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      return (res?.hits ?? []).map((h: { id: string; kind: EngineHit["kind"]; name: string; _formatted?: { name?: string } }) => ({
        id: h.id,
        kind: h.kind,
        name: parseHighlight(h._formatted?.name ?? h.name),
      }));
    },
  };
}
