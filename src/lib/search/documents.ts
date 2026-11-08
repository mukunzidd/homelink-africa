import type { Experience, HomeForSale, Listing, Vehicle } from "@/lib/domain/types";
import { convert, type FxTable, type Money } from "@/lib/domain/money";
import type { Repositories } from "@/lib/repos/types";
import type { SearchDoc } from "./types";

/**
 * English amenity words for the index. Search matches against these as well
 * as the keys, so the words a guest types and the label on the page both work.
 * The parser handles French and Kinyarwanda before the index is ever asked.
 */
const AMENITY_WORDS: Record<string, string> = {
  backupPower: "backup power generator",
  fibre: "fibre internet wifi",
  furnished: "furnished",
  parking: "parking",
  water: "water tank",
  security: "security guard gated",
  garden: "garden yard",
  workspace: "desk workspace office",
};

const EPOCH_DAY = 86_400_000;

function usd(m: Money, fx: FxTable): number {
  return convert(m, "USD", fx).minor;
}

function day(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / EPOCH_DAY);
}

/**
 * Words a guest uses for a place that the listing never says outright.
 *
 * "Something for my parents" means no stairs; "a place with a view" means a
 * ridge, a terrace, a valley. These are read from the listing's own words, so
 * a keyword only appears where the summary already makes the claim.
 */
function stayKeywords(l: Listing): string {
  const text = `${l.name} ${l.summary}`.toLowerCase();
  const words = [l.bedrooms === 1 ? "studio" : "", l.city];
  if (/view|valley|ridge|lights up|terrace|hilltop|hill /.test(text)) words.push("view views panorama");
  if (/one storey|no stairs|bungalow|single storey/.test(text)) words.push("stairs stepfree parents elderly accessible");
  if (/famil|children|yard|garden/.test(text)) words.push("family kids children");
  return words.filter(Boolean).join(" ");
}

export function stayDoc(l: Listing, fx: FxTable): SearchDoc {
  return {
    id: l.id,
    kind: "stay",
    slug: l.slug,
    name: l.name,
    summary: l.summary,
    neighbourhood: l.neighbourhood,
    amenities: l.amenities,
    amenityText: l.amenities.map((a) => AMENITY_WORDS[a] ?? a).join(" "),
    keywords: stayKeywords(l),
    bedrooms: l.bedrooms,
    sleeps: l.sleeps,
    priceUsd: usd(l.nightlyRate, fx),
    monthlyUsd: l.monthlyRate ? usd(l.monthlyRate, fx) : null,
    nightly: l.modes.includes("nightly"),
    lease: l.modes.includes("lease"),
    driveModes: [],
    interests: [],
    inspectedDay: day(l.verification.inspectedAt),
  };
}

export function saleDoc(h: HomeForSale, fx: FxTable): SearchDoc {
  return {
    id: h.id,
    kind: "sale",
    slug: h.slug,
    name: h.name,
    summary: h.summary,
    neighbourhood: h.neighbourhood,
    amenities: h.amenities,
    amenityText: h.amenities.map((a) => AMENITY_WORDS[a] ?? a).join(" "),
    keywords: `${h.kind} for sale buy ${h.city}`,
    bedrooms: h.bedrooms,
    sleeps: 0,
    priceUsd: usd(h.price, fx),
    monthlyUsd: null,
    nightly: false,
    lease: false,
    driveModes: [],
    interests: [],
    inspectedDay: day(h.verification.inspectedAt),
  };
}

export function carDoc(v: Vehicle, fx: FxTable): SearchDoc {
  return {
    id: v.id,
    kind: "car",
    slug: v.slug,
    name: v.name,
    summary: v.summary,
    neighbourhood: "",
    amenities: [],
    amenityText: "",
    keywords: `${v.vehicleClass} ${v.transmission} car hire vehicle ${v.driveModes.includes("withDriver") ? "driver chauffeur" : ""} ${v.driveModes.includes("selfDrive") ? "self drive" : ""}`,
    bedrooms: 0,
    sleeps: v.seats,
    priceUsd: usd(v.dailyRate, fx),
    monthlyUsd: null,
    nightly: true,
    lease: false,
    driveModes: v.driveModes,
    interests: [],
    inspectedDay: day(v.verification.inspectedAt),
  };
}

export function experienceDoc(e: Experience, fx: FxTable): SearchDoc {
  return {
    id: e.id,
    kind: "experience",
    slug: e.slug,
    name: e.name,
    summary: e.summary,
    neighbourhood: "",
    amenities: [],
    amenityText: "",
    keywords: `${e.interests.join(" ")} day out tour`,
    bedrooms: 0,
    sleeps: e.groupMax,
    priceUsd: usd(e.pricePerPerson, fx),
    monthlyUsd: null,
    nightly: true,
    lease: false,
    driveModes: [],
    interests: e.interests,
    inspectedDay: day(e.verification.inspectedAt),
  };
}

/** Everything searchable, built from the same repositories the pages read. */
export async function buildDocuments(r: Repositories): Promise<SearchDoc[]> {
  const [stays, sales, cars, days, fx] = await Promise.all([
    r.stays.list({}),
    r.sales.list(),
    r.mobility.list(),
    r.experiences.list(),
    r.fx.rates(),
  ]);
  // `stays.list` hides lease-only places outside the lease lane; the index
  // must not, so ask for that lane too and merge.
  const leases = await r.stays.list({ band: "long" });
  const allStays = [...new Map([...stays, ...leases].map((l) => [l.id, l])).values()];
  return [
    ...allStays.map((l) => stayDoc(l, fx)),
    ...sales.map((h) => saleDoc(h, fx)),
    ...cars.map((v) => carDoc(v, fx)),
    ...days.map((e) => experienceDoc(e, fx)),
  ];
}
