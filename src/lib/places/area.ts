import type { GeoPoint } from "@/lib/domain/types";
import { PLACES } from "./gazetteer";

/**
 * Where the public site says a home is: the middle of its neighbourhood.
 *
 * A guest needs the area to judge a home (the commute, the noise, the
 * walk to the convention centre) and the exact spot only once they have
 * booked. Shown any finer, a guest can walk to the gate and deal with the
 * owner directly, and the inspection, the escrow and the support that sit
 * between them go with it.
 *
 * The centres come from the gazetteer, a fixed list, and never from the
 * homes themselves: an average of the homes in a neighbourhood with one
 * listing is that listing's door.
 */
const CENTRES = new Map(
  PLACES.filter((p) => p.kind === "neighbourhood").map((p) => [p.name.toLowerCase(), { lat: p.lat, lng: p.lng }]),
);

/** Kigali's centre, for a neighbourhood the gazetteer does not know yet. */
const KIGALI: GeoPoint = { lat: -1.9441, lng: 30.0619 };

export function areaCentre(neighbourhood: string): GeoPoint {
  return { ...(CENTRES.get(neighbourhood.trim().toLowerCase()) ?? KIGALI) };
}

/** A copy of a home with its point moved to the middle of its neighbourhood. */
export function inArea<T extends { neighbourhood: string; location: GeoPoint }>(home: T): T {
  return { ...home, location: areaCentre(home.neighbourhood) };
}

/** Roughly how far a neighbourhood reaches from its centre, for the map's circle. */
export const AREA_RADIUS_M = 900;
