import { saleSearchToQuery, staySearchToQuery } from "@/lib/search-params";
import type { SearchIntent } from "./parse";

/**
 * Where a sentence should land, as a path the locale-aware router accepts.
 *
 * The sentence is turned into ordinary URL parameters rather than carried as
 * one opaque `q`. That way the filters panel, the chips, the back button and a
 * shared link all show the same state, and taking back one piece of what was
 * understood is just removing one parameter.
 */
export function intentHref(intent: SearchIntent): string {
  if (intent.lane === "cars") {
    const p = new URLSearchParams();
    if (intent.driveMode) p.set("driveMode", intent.driveMode);
    if (intent.party) p.set("seats", String(intent.party));
    return p.size ? `/cars?${p}` : "/cars";
  }
  if (intent.lane === "buy") {
    const query = saleSearchToQuery({
      neighbourhood: intent.neighbourhood,
      bedrooms: intent.bedrooms,
      maxPrice: intent.maxPrice,
      q: intent.text || undefined,
      sort: intent.sort === "priceAsc" || intent.sort === "priceDesc" || intent.sort === "size" ? intent.sort : "recommended",
    });
    return query ? `/buy?${query}` : "/buy";
  }
  if (intent.lane === "experiences") {
    return intent.interest ? `/experiences?interest=${intent.interest}` : "/experiences";
  }
  const query = staySearchToQuery({
    neighbourhood: intent.neighbourhood,
    from: intent.from ?? null,
    to: intent.to ?? null,
    party: intent.party,
    bedrooms: intent.bedrooms,
    amenities: intent.amenities,
    band: intent.lease ? "long" : undefined,
    maxPrice: intent.maxPrice,
    q: intent.text || undefined,
    sort: intent.sort ?? "recommended",
  });
  return query ? `/stays?${query}` : "/stays";
}
