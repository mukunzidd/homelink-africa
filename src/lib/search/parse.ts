import type { Amenity, DriveMode, ExperienceInterest } from "@/lib/domain/types";
import { fromMajor, type CurrencyCode, type Money } from "@/lib/domain/money";
import { addDays, weekdayOf, type IsoDate } from "@/lib/domain/dates";
import type { Sort } from "@/lib/search-params";
import {
  AMENITY_PHRASES,
  BUY_PHRASES,
  CAR_PHRASES,
  CURRENCY_WORDS,
  DRIVE_MODE_PHRASES,
  EXPERIENCE_PHRASES,
  INTEREST_PHRASES,
  LANDMARKS,
  LEASE_PHRASES,
  NUMBER_WORDS,
  SORT_PHRASES,
  STOP_WORDS,
} from "./vocabulary";

export type Lane = "stays" | "buy" | "cars" | "experiences";

/**
 * What a sentence was understood to mean.
 *
 * Every field is something the interface prints back as a removable chip, so
 * nothing in here is allowed to be a guess the guest cannot see. Fields are
 * absent rather than defaulted: "no bedroom count was said" and "one bedroom"
 * are different statements.
 */
export type SearchIntent = {
  raw: string;
  /** Absent means the sentence did not commit to one; search every lane. */
  lane?: Lane;
  neighbourhood?: string;
  /** Set when the place came from a landmark, so the chip can say which. */
  landmark?: string;
  /** Set when the place was a fuzzy match, so the chip can show what was typed. */
  typed?: string;
  bedrooms?: number;
  party?: number;
  /** A ceiling on the nightly rate, or the monthly rate when `lease`. */
  maxPrice?: Money;
  amenities: Amenity[];
  lease?: boolean;
  from?: IsoDate;
  to?: IsoDate;
  /** The words the dates came from, as typed: "next weekend", "3 nights". */
  dateWords?: string;
  sort?: Exclude<Sort, "recommended">;
  driveMode?: DriveMode;
  interest?: ExperienceInterest;
  /** Whatever meaning was not structured, handed to full-text ranking. */
  text: string;
};

export type ParseContext = {
  /** Injected so the parser is a pure function of its input. */
  today: IsoDate;
  /** Places with live inventory. Fuzzy matching is only against these. */
  neighbourhoods: readonly string[];
  /** Used when an amount comes with no currency and is small enough to be one. */
  displayCurrency: CurrencyCode;
};

/** Lower-case, strip accents, keep `$ € £`, turn punctuation into spaces. */
export function fold(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9$€£.,\s-]/g, " ")
    // A comma or full stop is punctuation unless it sits inside a number.
    .replace(/(?<!\d)[.,]|[.,](?!\d)/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Damerau–Levenshtein (optimal string alignment). Small inputs only — place
 * names and single words — so the quadratic table is not a concern.
 */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** How many typos a word of this length is allowed. Mirrors Meilisearch's defaults. */
export function typoBudget(length: number): number {
  return length >= 9 ? 2 : length >= 5 ? 1 : 0;
}

/**
 * The working copy of the sentence. Matching a phrase blanks it out, so a
 * shorter phrase inside a longer one ("power" inside "backup power", "car"
 * inside "car park") cannot be counted twice.
 */
class Cursor {
  text: string;
  constructor(text: string) {
    this.text = ` ${text} `;
  }
  /** Finds `phrase` on word boundaries; consumes it and returns true if present. */
  take(phrase: string): boolean {
    const re = new RegExp(`(?<=\\s)${escape(phrase)}(?=\\s)`);
    if (!re.test(this.text)) return false;
    this.text = this.text.replace(re, " ".repeat(phrase.length));
    return true;
  }
  /** Runs a regex; consumes the first match and returns its groups. */
  match(re: RegExp): RegExpMatchArray | null {
    const m = this.text.match(re);
    if (!m || m.index === undefined) return null;
    this.text =
      this.text.slice(0, m.index) + " ".repeat(m[0].length) + this.text.slice(m.index + m[0].length);
    return m;
  }
  words(): string[] {
    return this.text.split(/\s+/).filter(Boolean);
  }
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NUM = `(\\d+|${Object.keys(NUMBER_WORDS).join("|")})`;

function toNumber(token: string): number {
  return NUMBER_WORDS[token] ?? Number(token);
}

/** Phrases from a table, longest first, each tagged with its key. */
function phrases<K extends string>(table: Record<K, string[]>): [K, string][] {
  return (Object.entries(table) as [K, string[]][])
    .flatMap(([k, list]) => list.map((p) => [k, p] as [K, string]))
    .sort((a, b) => b[1].length - a[1].length);
}

function byLength(list: string[]): string[] {
  return [...list].sort((a, b) => b.length - a.length);
}

function parsePrice(cur: Cursor, ctx: ParseContext): Money | undefined {
  const currencyAlternation = CURRENCY_WORDS.map(([w]) => escape(w)).join("|");
  const amount = `(\\d{1,3}(?:[ ,.]\\d{3})+|\\d+(?:\\.\\d+)?)\\s*(millions|million|miliyoni|bn|k|m)?`;
  const lead =
    "(?:under|below|less than|max(?:imum)?|up to|at most|no more than|budget(?: of)?|moins de|sous|jusqu a|munsi ya|chini ya|isiyozidi)";
  const patterns = [
    // "under $150", "below 150 usd", "max 200k rwf"
    new RegExp(`${lead}\\s*(${currencyAlternation})?\\s*${amount}\\s*(${currencyAlternation})?`),
    // "$150", "150 usd", "120 000 frw" with no lead word: still a ceiling
    new RegExp(`(?<=\\s)(${currencyAlternation})\\s*${amount}()()(?=\\s)`),
    new RegExp(`(?<=\\s)()${amount}\\s*(${currencyAlternation})(?=\\s)`),
  ];

  for (const re of patterns) {
    const m = cur.match(re);
    if (!m) continue;
    const [, before, digits, suffix, after] = m;
    const code = CURRENCY_WORDS.find(([w]) => w === (before || after))?.[1];
    let value = Number(digits.replace(/[ ,]/g, "").replace(/\.(?=\d{3}\b)/g, ""));
    if (suffix === "k") value *= 1_000;
    if (suffix === "m" || suffix?.startsWith("mil")) value *= 1_000_000;
    if (suffix === "bn") value *= 1_000_000_000;
    if (!Number.isFinite(value) || value <= 0) return undefined;
    // An amount with no currency: a five-figure number in Kigali is francs,
    // anything smaller is in whatever currency the guest is reading in.
    const currency = code ?? (value >= 5_000 ? "RWF" : ctx.displayCurrency);
    return fromMajor(value, currency);
  }
  return undefined;
}

function nextWeekday(from: IsoDate, weekday: number, includeToday: boolean): IsoDate {
  const current = weekdayOf(from);
  let delta = (weekday - current + 7) % 7;
  if (delta === 0 && !includeToday) delta = 7;
  return addDays(from, delta);
}

function parseDates(cur: Cursor, ctx: ParseContext): { from?: IsoDate; to?: IsoDate; dateWords?: string } {
  let from: IsoDate | undefined;
  let to: IsoDate | undefined;
  const words: string[] = [];
  const take = (phrase: string) => {
    const ok = cur.take(phrase);
    if (ok) words.push(phrase);
    return ok;
  };

  if (take("next weekend") || take("weekend prochain")) {
    from = addDays(nextWeekday(ctx.today, 5, true), 7);
    to = addDays(from, 2);
  } else if (take("this weekend") || take("ce weekend") || take("weekend")) {
    from = nextWeekday(ctx.today, 5, true);
    to = addDays(from, 2);
  } else if (take("next week") || take("semaine prochaine") || take("icyumweru gitaha")) {
    from = nextWeekday(ctx.today, 1, false);
    to = addDays(from, 7);
  } else if (take("tonight") || take("ce soir") || take("uyu mugoroba")) {
    from = ctx.today;
    to = addDays(from, 1);
  } else if (take("tomorrow") || take("demain") || take("ejo")) {
    from = addDays(ctx.today, 1);
    to = addDays(from, 1);
  }

  const nights = cur.match(new RegExp(`(?:for\\s+)?${NUM}\\s*(?:nights?|nuits?|ijoro)`));
  const week = !nights && cur.match(/(?:for\s+)?(?:a|one)\s+week/);
  if (nights) words.push(nights[0].trim());
  else if (week) words.push(week[0].trim());
  const count = nights ? toNumber(nights[1]) : week ? 7 : undefined;
  if (count && count > 0 && count <= 60) {
    // A length with no start means "from tomorrow", which is what someone
    // typing "3 nights" on their phone the day before a trip means.
    from ??= addDays(ctx.today, 1);
    to = addDays(from, count);
  }

  return { from, to, dateWords: from && words.length ? words.join(", ") : undefined };
}

function parseNeighbourhood(
  cur: Cursor,
  ctx: ParseContext,
): Pick<SearchIntent, "neighbourhood" | "landmark" | "typed"> {
  // Exact names first: someone who typed the place should never be overridden
  // by a landmark that happens to be in the same sentence.
  for (const name of [...ctx.neighbourhoods].sort((a, b) => b.length - a.length)) {
    if (cur.take(fold(name))) return { neighbourhood: name };
  }

  for (const landmark of LANDMARKS) {
    if (!ctx.neighbourhoods.includes(landmark.neighbourhood)) continue;
    for (const phrase of byLength(landmark.phrases)) {
      if (cur.take(phrase)) return { neighbourhood: landmark.neighbourhood, landmark: landmark.key };
    }
  }

  // Then a typo-tolerant pass, word by word. Prefixes count too: "kimi" is
  // what people type into a phone before they give up on spelling.
  let best: { name: string; word: string; distance: number } | undefined;
  for (const word of cur.words()) {
    if (word.length < 4 || STOP_WORDS.has(word) || /\d/.test(word)) continue;
    for (const name of ctx.neighbourhoods) {
      const target = fold(name);
      const distance = target.startsWith(word) && word.length >= 4 ? 0.5 : editDistance(word, target);
      if (distance <= Math.max(typoBudget(target.length), 0.5) && (!best || distance < best.distance)) {
        best = { name, word, distance };
      }
    }
  }
  if (best) {
    cur.take(best.word);
    return { neighbourhood: best.name, typed: best.word };
  }
  return {};
}

export function parseQuery(input: string, ctx: ParseContext): SearchIntent {
  const raw = input.trim();
  const cur = new Cursor(fold(raw));
  const intent: SearchIntent = { raw, amenities: [], text: "" };

  // Order matters: each pass consumes what it recognises, so the passes run
  // from most to least specific. Price runs before party size so "under
  // 150 for 4" does not read 150 as a head count.
  intent.maxPrice = parsePrice(cur, ctx);
  Object.assign(intent, parseDates(cur, ctx));

  const bedrooms = cur.match(
    new RegExp(`${NUM}\\s*(?:\\+\\s*)?(?:bed(?:room)?s?|br|bd|bhk|chambres?|ibyumba(?: byo kuraramo)?|vyumba(?: vya kulala)?)(?=\\s)`),
  );
  // Kinyarwanda and French also put the count after the noun: "ibyumba 2".
  const bedroomsAfter =
    !bedrooms && cur.match(new RegExp(`(?:ibyumba|chambres?|vyumba(?: vya kulala)?|chumba)\\s+${NUM}(?=\\s)`));
  if (bedrooms) intent.bedrooms = Math.min(6, toNumber(bedrooms[1]));
  else if (bedroomsAfter) intent.bedrooms = Math.min(6, toNumber(bedroomsAfter[1]));
  if (cur.take("studio")) intent.text += " studio";

  const party =
    cur.match(new RegExp(`(?:sleeps|for|pour|group of|family of|abantu)\\s+${NUM}(?:\\s*(?:people|persons|guests|adults|of us|personnes|pax))?(?=\\s)`)) ??
    cur.match(new RegExp(`${NUM}\\s*(?:people|persons|guests|adults|personnes|pax|seats|places)(?=\\s)`));
  if (party) intent.party = Math.min(16, toNumber(party[1]));
  else if (cur.take("couple") || cur.take("two of us") || cur.take("for two")) intent.party = 2;
  else if (cur.take("solo") || cur.take("just me") || cur.take("alone") || cur.take("myself")) intent.party = 1;

  for (const [amenity, phrase] of phrases(AMENITY_PHRASES)) {
    if (cur.take(phrase) && !intent.amenities.includes(amenity)) intent.amenities.push(amenity);
  }
  // "Remote work" means a desk and a connection, not one or the other.
  if (intent.amenities.includes("workspace") && /remote|work from home/.test(fold(raw)) && !intent.amenities.includes("fibre")) {
    intent.amenities.push("fibre");
  }

  for (const [sort, phrase] of phrases(SORT_PHRASES)) {
    if (cur.take(phrase)) {
      intent.sort ??= sort;
    }
  }

  Object.assign(intent, parseNeighbourhood(cur, ctx));

  for (const [mode, phrase] of phrases(DRIVE_MODE_PHRASES)) {
    if (cur.take(phrase)) intent.driveMode ??= mode;
  }
  // Every phrase is tried, not just the first that matches: `some()` would
  // stop early and leave "rent a car" behind as stray words once "with
  // driver" had already decided the lane.
  const takeAll = (list: string[]) => byLength(list).filter((p) => cur.take(p)).length > 0;
  const carSignal = takeAll(CAR_PHRASES) || !!intent.driveMode;

  const buySignal = takeAll(BUY_PHRASES);
  const leaseSignal = !buySignal && takeAll(LEASE_PHRASES);

  // Interests are held back rather than consumed outright: "villa near the
  // lake" is a stay with a view, not a boat trip, and only the rest of the
  // sentence can say which.
  const interestHits: [ExperienceInterest, string][] = [];
  for (const [interest, phrase] of phrases(INTEREST_PHRASES)) {
    if (cur.take(phrase)) interestHits.push([interest, phrase]);
  }
  const experienceSignal = takeAll(EXPERIENCE_PHRASES);

  const staySignal =
    intent.bedrooms !== undefined ||
    intent.amenities.length > 0 ||
    intent.neighbourhood !== undefined ||
    leaseSignal ||
    /\b(villa|apartment|flat|house|home|studio|room|stay|sleeps|nights?|bungalow|townhouse|appartement|maison|inzu|nyumba|chumba)\b/.test(fold(raw));

  if (buySignal && !carSignal) intent.lane = "buy";
  else if (carSignal && !staySignal) intent.lane = "cars";
  else if ((experienceSignal || interestHits.length) && !staySignal && !carSignal) intent.lane = "experiences";
  else if (staySignal) intent.lane = "stays";
  // A budget, a head count or dates with nothing else: on a homes site that
  // is a stay. It is also the only lane where relaxing a price makes sense.
  else if (!carSignal && !experienceSignal && !interestHits.length && (intent.maxPrice || intent.party || intent.from)) {
    intent.lane = "stays";
  }

  if (intent.lane === "experiences" && interestHits.length) {
    // The subject beats the activity: "gorilla trekking" is about gorillas,
    // and "trek" is how you get to them.
    const rank: ExperienceInterest[] = ["wildlife", "lake", "culture", "food", "city", "hiking"];
    intent.interest = [...interestHits].sort((a, b) => rank.indexOf(a[0]) - rank.indexOf(b[0]))[0][0];
  }
  else intent.text += interestHits.map(([, p]) => ` ${p}`).join("");

  if (intent.lane === "buy") {
    // A purchase has no nights, no guests and no lease; a price in the
    // sentence is a ceiling on the sale price.
    delete intent.party;
    delete intent.from;
    delete intent.to;
    delete intent.dateWords;
  }
  if (intent.lane !== "cars" && intent.lane !== "buy" && leaseSignal) intent.lease = true;
  if (intent.lane === "cars") {
    // "Rent a car" is not a lease, and a car has no bedrooms or amenities.
    delete intent.lease;
    if (intent.amenities.includes("parking")) intent.amenities = intent.amenities.filter((a) => a !== "parking");
  } else {
    delete intent.driveMode;
  }

  const leftover = cur
    .words()
    .filter((w) => !STOP_WORDS.has(w) && !/^[\d.,$€£]+$/.test(w) && w.length > 1);
  intent.text = `${intent.text} ${leftover.join(" ")}`.trim().replace(/\s+/g, " ");

  return intent;
}

/** True when the sentence produced anything a filter can use. */
export function hasStructure(intent: SearchIntent): boolean {
  return (
    intent.neighbourhood !== undefined ||
    intent.bedrooms !== undefined ||
    intent.party !== undefined ||
    intent.maxPrice !== undefined ||
    intent.amenities.length > 0 ||
    intent.lease === true ||
    intent.from !== undefined ||
    intent.sort !== undefined ||
    intent.driveMode !== undefined ||
    intent.interest !== undefined
  );
}
