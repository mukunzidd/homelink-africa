import type { GeoPoint } from "./types";

/**
 * The places a newcomer navigates Kigali by.
 *
 * Nobody arriving for a conference thinks in neighbourhoods; they think "how
 * far is it from the convention centre", "how far from the airport". These are
 * the same seven landmarks the search parser already resolves, now with a
 * point on the map so every home can say how far it is from them.
 *
 * Coordinates are the public front of each place, to about 100 m.
 */
export const LANDMARK_KEYS = [
  "conventionCentre",
  "cityCentre",
  "airport",
  "embassies",
  "stadium",
  "golf",
  "market",
] as const;
export type LandmarkKey = (typeof LANDMARK_KEYS)[number];

export const LANDMARK_POINTS: Record<LandmarkKey, GeoPoint> = {
  conventionCentre: { lat: -1.9536, lng: 30.0928 },
  cityCentre: { lat: -1.9441, lng: 30.0619 },
  airport: { lat: -1.9686, lng: 30.1395 },
  embassies: { lat: -1.9339, lng: 30.0895 },
  stadium: { lat: -1.9555, lng: 30.117 },
  golf: { lat: -1.9361, lng: 30.1037 },
  market: { lat: -1.9494, lng: 30.1259 },
};

export function isLandmark(value: unknown): value is LandmarkKey {
  return typeof value === "string" && (LANDMARK_KEYS as readonly string[]).includes(value);
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Minutes by car, estimated.
 *
 * Kigali's roads wind round the hills, so a straight line understates the
 * drive by about a third; 24 km/h is a weekday average across the city, slower
 * than the open road and faster than the CBD at five. Rounded to five minutes
 * above ten, because "17 min" claims a precision nobody can promise in
 * traffic. Phase 2 replaces this with a routing service.
 */
export function driveMinutes(a: GeoPoint, b: GeoPoint): number {
  const roadKm = distanceKm(a, b) * 1.35;
  const minutes = (roadKm / 24) * 60 + 2;
  if (minutes < 10) return Math.max(3, Math.round(minutes));
  return Math.round(minutes / 5) * 5;
}

export function minutesTo(point: GeoPoint, landmark: LandmarkKey): number {
  return driveMinutes(point, LANDMARK_POINTS[landmark]);
}
