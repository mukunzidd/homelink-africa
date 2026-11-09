import type { HomeForSale, Listing, GeoPoint } from "./types";
import type { Money } from "./money";
import { money } from "./money";
import { areaCentre } from "@/lib/places/area";

/**
 * Everything the product knows about one neighbourhood, gathered from the
 * repositories: what you can stay in, rent and buy there, and from what price.
 * Derived, not stored, so a neighbourhood page can never disagree with the
 * listings it summarises.
 */
export type NeighbourhoodProfile = {
  name: string;
  slug: string;
  centre: GeoPoint;
  stays: Listing[];
  rentals: Listing[];
  sales: HomeForSale[];
  stayFrom?: Money;
  rentMedian?: Money;
  saleFrom?: Money;
  image?: string;
  seed: string;
};

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function neighbourhoodSlug(name: string): string {
  return name.toLowerCase();
}

export function buildProfiles(nightly: Listing[], leases: Listing[], sales: HomeForSale[]): NeighbourhoodProfile[] {
  const names = new Set([...nightly, ...leases, ...sales].map((x) => x.neighbourhood));
  return [...names]
    .map((name) => {
      const stays = nightly.filter((l) => l.neighbourhood === name);
      const rentals = leases.filter((l) => l.neighbourhood === name);
      const forSale = sales.filter((h) => h.neighbourhood === name);
      // The gazetteer's centre, never an average of the homes: with one home
      // listed, the average is that home's door.
      const centre = areaCentre(name);
      const pictured = [...stays, ...rentals, ...forSale].find((x) => x.images?.length);
      const monthly = rentals.flatMap((l) => (l.monthlyRate ? [l.monthlyRate] : []));
      return {
        name,
        slug: neighbourhoodSlug(name),
        centre,
        stays,
        rentals,
        sales: forSale,
        stayFrom: stays.length ? stays.reduce((a, b) => (a.nightlyRate.minor <= b.nightlyRate.minor ? a : b)).nightlyRate : undefined,
        rentMedian: monthly.length ? money(median(monthly.map((m) => m.minor)), monthly[0].currency) : undefined,
        saleFrom: forSale.length ? forSale.reduce((a, b) => (a.price.minor <= b.price.minor ? a : b)).price : undefined,
        image: pictured?.images?.[0],
        seed: pictured?.imageSeed ?? name,
      };
    })
    .sort((a, b) => b.stays.length + b.rentals.length + b.sales.length - (a.stays.length + a.rentals.length + a.sales.length) || a.name.localeCompare(b.name));
}
