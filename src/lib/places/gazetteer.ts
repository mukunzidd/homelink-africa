import type { GeoPoint } from "@/lib/domain/types";

/**
 * Places in Kigali someone would name in a message: "meet me at the bus
 * park", "I'm at the convention centre", "the house is in Kibagabaga".
 *
 * A short list held here rather than a geocoding service, because there is
 * no backend to hold a key and sending every keystroke of a guest's search
 * to a third party is not something to start doing by accident. Points are
 * the public front of each place, or the middle of a neighbourhood, to a
 * few hundred metres; the picker always lets the pin be moved. Phase 2
 * swaps this for a geocoder behind our own API.
 *
 * Names are proper nouns and read the same in all four languages.
 */
export type PlaceKind = "landmark" | "transport" | "neighbourhood";
export type Place = GeoPoint & { id: string; name: string; area: string; kind: PlaceKind; aliases?: string[] };

const P = (id: string, name: string, area: string, kind: PlaceKind, lat: number, lng: number, aliases?: string[]): Place => ({
  id, name, area, kind, lat, lng, aliases,
});

export const PLACES: Place[] = [
  P("kcc", "Kigali Convention Centre", "Kimihurura", "landmark", -1.9536, 30.0928, ["KCC", "Radisson Blu", "conference"]),
  P("kgl", "Kigali International Airport", "Kanombe", "transport", -1.9686, 30.1395, ["KGL", "airport", "aéroport", "kibuga cy'indege", "uwanja wa ndege"]),
  P("memorial", "Kigali Genocide Memorial", "Gisozi", "landmark", -1.9306, 30.0605, ["memorial", "urwibutso"]),
  P("kimironko-market", "Kimironko Market", "Kimironko", "landmark", -1.9494, 30.1259, ["market", "marché", "isoko", "soko"]),
  P("amahoro", "Amahoro Stadium", "Remera", "landmark", -1.9555, 30.117, ["stadium", "stade"]),
  P("bk-arena", "BK Arena", "Remera", "landmark", -1.9547, 30.1149, ["arena"]),
  P("golf", "Kigali Golf Resort", "Nyarutarama", "landmark", -1.9361, 30.1037, ["golf"]),
  P("heights", "Kigali Heights", "Kimihurura", "landmark", -1.9527, 30.0937, ["mall"]),
  P("city-tower", "Kigali City Tower", "City centre", "landmark", -1.9445, 30.0608, ["CHIC", "town", "mall"]),
  P("car-free", "Car Free Zone", "City centre", "landmark", -1.9466, 30.0602, ["Imbuga City Walk", "city walk"]),
  P("marriott", "Kigali Marriott Hotel", "Kiyovu", "landmark", -1.9527, 30.0626, ["hotel", "hôtel"]),
  P("serena", "Kigali Serena Hotel", "Kiyovu", "landmark", -1.9541, 30.0653, ["hotel", "hôtel"]),
  P("kfh", "King Faisal Hospital", "Kacyiru", "landmark", -1.9443, 30.0937, ["hospital", "hôpital", "ibitaro", "hospitali"]),
  P("chuk", "CHUK University Hospital", "Nyarugenge", "landmark", -1.9497, 30.0585, ["hospital", "hôpital", "ibitaro", "hospitali"]),
  P("inema", "Inema Arts Center", "Kacyiru", "landmark", -1.9393, 30.0874, ["art", "gallery"]),
  P("nyandungu", "Nyandungu Eco-Park", "Kicukiro", "landmark", -1.9466, 30.1447, ["park", "parc"]),
  P("mount-kigali", "Mount Kigali", "Nyamirambo", "landmark", -1.9796, 30.0306, ["Mont Kigali", "Umusozi wa Kigali"]),
  P("nyabugogo", "Nyabugogo Bus Park", "Nyabugogo", "transport", -1.941, 30.0446, ["bus park", "gare routière", "Nyabugogo", "stand"]),
  P("remera-bus", "Remera Bus Park", "Remera", "transport", -1.9573, 30.1124, ["bus park", "gare routière", "stand"]),
  P("kimironko-bus", "Kimironko Bus Park", "Kimironko", "transport", -1.9483, 30.1266, ["bus park", "gare routière", "stand"]),
  P("downtown-bus", "Downtown Bus Park", "City centre", "transport", -1.9437, 30.0588, ["bus park", "gare routière", "stand", "taxi park"]),
  ...(
    [
      ["Kiyovu", -1.951, 30.062],
      ["Kimihurura", -1.948, 30.085],
      ["Kacyiru", -1.94, 30.088],
      ["Nyarutarama", -1.933, 30.103],
      ["Remera", -1.956, 30.11],
      ["Kibagabaga", -1.93, 30.115],
      ["Kimironko", -1.944, 30.127],
      ["Gacuriro", -1.918, 30.096],
      ["Kagugu", -1.915, 30.085],
      ["Gisozi", -1.92, 30.065],
      ["Kicukiro", -1.985, 30.095],
      ["Sonatubes", -1.97, 30.105],
      ["Gikondo", -1.975, 30.076],
      ["Nyamirambo", -1.977, 30.045],
      ["Rebero", -1.995, 30.078],
      ["Kanombe", -1.975, 30.135],
      ["Nyarugenge", -1.9441, 30.0619],
    ] as const
  ).map(([name, lat, lng]) => P(name.toLowerCase(), name, "Kigali", "neighbourhood", lat, lng)),
];

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Starts-with beats a word that starts with it, which beats containing it;
 * a name beats an alias. Two characters before anything is suggested.
 */
export function searchPlaces(query: string, limit = 6): Place[] {
  const q = plain(query);
  if (q.length < 2) return [];
  const score = (p: Place) => {
    const name = plain(p.name);
    if (name.startsWith(q)) return 0;
    if (name.split(" ").some((w) => w.startsWith(q))) return 1;
    if (name.includes(q)) return 2;
    const aliases = (p.aliases ?? []).map(plain);
    if (aliases.some((a) => a.startsWith(q))) return 3;
    if (aliases.some((a) => a.includes(q)) || plain(p.area).startsWith(q)) return 4;
    return 9;
  };
  return PLACES.map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((x) => x.p);
}

const DISTRICT = {
  KN: { district: "Nyarugenge", center: { lat: -1.9441, lng: 30.0619 } },
  KG: { district: "Gasabo", center: { lat: -1.9400, lng: 30.0950 } },
  KK: { district: "Kicukiro", center: { lat: -1.9800, lng: 30.0950 } },
} as const;

/**
 * Kigali's street addresses carry their district in the code: KN is
 * Nyarugenge, KG Gasabo, KK Kicukiro, then a number and St, Rd or Ave.
 * There is no point to give a street without a geocoder, so this only says
 * where to start looking; the person moves the pin to the door.
 */
export function streetAddress(text: string): { code: string; district: string; center: GeoPoint } | null {
  const m = /\b(KN|KG|KK)\s*(\d{1,4})\s*(st|rd|ave)\b/i.exec(text);
  if (!m) return null;
  const prefix = m[1].toUpperCase() as keyof typeof DISTRICT;
  const kind = m[3].toLowerCase();
  const code = `${prefix} ${Number(m[2])} ${kind === "ave" ? "Ave" : kind === "rd" ? "Rd" : "St"}`;
  return { code, ...DISTRICT[prefix] };
}
