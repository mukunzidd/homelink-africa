import type { Amenity, DriveMode, ExperienceInterest } from "@/lib/domain/types";
import type { CurrencyCode } from "@/lib/domain/money";

/**
 * The words people actually use, mapped onto the words the data uses.
 *
 * Kept as plain tables rather than buried in regexes so that a person who
 * knows Kigali can read this file and say "nobody calls it that". Every phrase
 * is lower-case and accent-free; the parser folds input the same way before
 * matching. Order inside a list does not matter — the parser always tries
 * longer phrases first, so "power backup" beats "power".
 */

/**
 * People in Kigali give directions by landmark, not by sector. Each landmark
 * resolves to the neighbourhood with verified inventory closest to it, and the
 * interpretation chip says so, so a guest can see that "near the airport" was
 * read as Kicukiro rather than wonder why.
 */
export const LANDMARKS: {
  key: string;
  neighbourhood: string;
  phrases: string[];
}[] = [
  {
    key: "conventionCentre",
    neighbourhood: "Kimihurura",
    phrases: ["convention centre", "convention center", "kcc", "radisson", "centre de convention"],
  },
  {
    key: "stadium",
    neighbourhood: "Remera",
    phrases: ["amahoro", "stadium", "stade", "bk arena", "arena", "sitade"],
  },
  {
    key: "golf",
    neighbourhood: "Nyarutarama",
    phrases: ["golf course", "golf club", "golf"],
  },
  {
    key: "embassies",
    neighbourhood: "Kacyiru",
    phrases: ["embassies", "embassy", "ministries", "ministry", "ambassade", "ministere"],
  },
  {
    key: "cityCentre",
    neighbourhood: "Kiyovu",
    phrases: ["city centre", "city center", "downtown", "town centre", "town", "cbd", "centre ville", "mu mujyi"],
  },
  {
    key: "airport",
    neighbourhood: "Kicukiro",
    phrases: ["airport", "kanombe", "aeroport", "ikibuga cy indege", "ikibuga"],
  },
  {
    key: "market",
    neighbourhood: "Kibagabaga",
    phrases: ["kimironko market", "kimironko"],
  },
];

export const AMENITY_PHRASES: Record<Amenity, string[]> = {
  backupPower: [
    "backup power", "back up power", "power backup", "generator", "inverter",
    "solar", "groupe electrogene", "umuriro", "power",
  ],
  fibre: ["fibre", "fiber", "wifi", "wi fi", "internet", "fast internet", "connexion", "murandasi"],
  workspace: [
    "workspace", "work space", "desk", "home office", "office", "work from home",
    "remote work", "place to work", "somewhere to work", "to work", "bureau", "teletravail",
  ],
  parking: ["parking", "garage", "car park", "stationnement", "parikingi"],
  furnished: ["furnished", "meuble", "meublee"],
  water: ["water tank", "water", "reservoir", "amazi"],
  security: ["security", "guard", "gated", "secure", "safe", "askari", "securite", "umutekano"],
  garden: ["garden", "yard", "lawn", "jardin", "outdoor space", "ubusitani"],
};

export const CAR_PHRASES = [
  "rent a car", "car hire", "hire a car", "self drive", "with driver", "with a driver",
  "land cruiser", "landcruiser", "rav4", "corolla", "hiace", "minibus", "suv", "4x4",
  "jeep", "car", "cars", "vehicle", "chauffeur", "driver", "voiture", "imodoka",
];

export const DRIVE_MODE_PHRASES: Record<DriveMode, string[]> = {
  withDriver: ["with driver", "with a driver", "chauffeur", "driven", "avec chauffeur", "n umushoferi", "umushoferi"],
  selfDrive: ["self drive", "self driven", "drive myself", "sans chauffeur"],
};

export const INTEREST_PHRASES: Record<ExperienceInterest, string[]> = {
  wildlife: ["gorilla", "gorillas", "wildlife", "safari", "game drive", "ingagi", "chimpanzee"],
  hiking: ["hike", "hiking", "trek", "trekking", "canopy", "nyungwe", "randonnee", "walk in the forest"],
  lake: ["lake", "kivu", "boat", "lac", "ikiyaga"],
  culture: ["culture", "museum", "history", "memorial", "musee", "umuco"],
  food: ["food", "coffee", "cooking", "cuisine", "cafe", "ibiryo"],
  city: ["city walk", "city tour", "walking tour", "nyamirambo walk"],
};

/** Words that make a lane explicit even without a more specific match. */
export const EXPERIENCE_PHRASES = [
  "day out", "day trip", "excursion", "tour", "experience", "experiences", "activity",
  "things to do", "sortie",
];

/** Buying, not renting. Checked before the lease words, which share "house". */
export const BUY_PHRASES = [
  "for sale", "to buy", "buy", "buying", "purchase", "investment",
  "a vendre", "acheter", "achat", "kugura", "igurishwa",
];

export const LEASE_PHRASES = [
  "long term", "long stay", "lease", "monthly", "per month", "a month", "by the month",
  "for rent", "to rent", "renting", "rental", "6 months", "six months", "12 months",
  "twelve months", "a year", "one year", "par mois", "location longue", "ukwezi",
];

export const SORT_PHRASES: Record<"priceAsc" | "priceDesc" | "size" | "newest", string[]> = {
  priceAsc: ["cheapest", "cheap", "budget", "affordable", "least expensive", "pas cher", "moins cher"],
  priceDesc: ["luxury", "luxurious", "most expensive", "premium", "high end", "luxe"],
  size: ["biggest", "largest", "most space", "spacious", "big"],
  newest: ["newest", "recently verified", "latest", "new"],
};

export const CURRENCY_WORDS: [string, CurrencyCode][] = [
  ["usd", "USD"], ["dollars", "USD"], ["dollar", "USD"], ["$", "USD"],
  ["rwf", "RWF"], ["frw", "RWF"], ["francs", "RWF"], ["franc", "RWF"], ["amafaranga", "RWF"],
  ["eur", "EUR"], ["euros", "EUR"], ["euro", "EUR"], ["€", "EUR"],
  ["gbp", "GBP"], ["pounds", "GBP"], ["pound", "GBP"], ["£", "GBP"],
];

export const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8,
  rimwe: 1, kabiri: 2, gatatu: 3, kane: 4, gatanu: 5,
};

/**
 * Filler that carries no meaning on its own once the structured parts are
 * taken out. Anything left after these are removed is passed to full-text
 * search, which is how "quiet", "view" and "terrace" still count.
 */
export const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "near", "nearby", "close", "to", "by",
  "with", "for", "of", "from", "i", "me", "my", "we", "us", "our", "need", "want", "looking",
  "find", "show", "some", "something", "place", "places", "stay", "stays", "somewhere",
  "home", "house", "apartment", "flat", "kigali", "rwanda", "please", "that", "has", "have",
  "is", "are", "be", "it", "around", "within", "under", "below", "less", "than", "max",
  "maximum", "up", "per", "night", "nights", "budget", "people", "guests", "persons", "next",
  "this", "week", "weekend", "any", "good", "nice", "one", "available", "no", "without",
  "suitable", "suit", "ideal",
  // fr
  "un", "une", "le", "la", "les", "des", "de", "du", "dans", "pres", "avec", "pour", "sur",
  "et", "ou", "je", "cherche", "maison", "appartement", "logement", "nuit",
  // rw
  "inzu", "kuri", "na", "muri", "hafi", "ndashaka", "i", "ya", "ifite", "ku", "cyangwa",
]);
