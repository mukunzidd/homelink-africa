import { describe, expect, it } from "vitest";
import { editDistance, parseQuery, type ParseContext } from "./parse";

const ctx: ParseContext = {
  // A Tuesday.
  today: "2026-11-03",
  neighbourhoods: [
    "Gacuriro", "Gikondo", "Kacyiru", "Kibagabaga", "Kicukiro", "Kimihurura",
    "Kiyovu", "Nyamirambo", "Nyarutarama", "Rebero", "Remera",
  ],
  displayCurrency: "USD",
};

const parse = (q: string) => parseQuery(q, ctx);

describe("parseQuery: stays", () => {
  it("reads a full sentence into every field it states", () => {
    const i = parse("quiet 2-bed in Kimihurura with parking and backup power under $150 for 4 people");
    expect(i.lane).toBe("stays");
    expect(i.neighbourhood).toBe("Kimihurura");
    expect(i.bedrooms).toBe(2);
    expect(i.party).toBe(4);
    expect(i.maxPrice).toEqual({ minor: 15_000, currency: "USD" });
    expect(i.amenities.sort()).toEqual(["backupPower", "parking"]);
    expect(i.text).toBe("quiet");
  });

  it("forgives a misspelt neighbourhood and remembers what was typed", () => {
    const i = parse("3 bedroom house in kimihurra");
    expect(i.neighbourhood).toBe("Kimihurura");
    expect(i.typed).toBe("kimihurra");
    expect(i.bedrooms).toBe(3);
  });

  it("finds a neighbourhood from a prefix", () => {
    expect(parse("nyaru").neighbourhood).toBe("Nyarutarama");
  });

  it("resolves landmarks to the neighbourhood around them", () => {
    expect(parse("near the convention centre").neighbourhood).toBe("Kimihurura");
    expect(parse("near the convention centre").landmark).toBe("conventionCentre");
    expect(parse("flat near amahoro stadium").neighbourhood).toBe("Remera");
    expect(parse("somewhere close to the airport").neighbourhood).toBe("Kicukiro");
    expect(parse("downtown apartment").neighbourhood).toBe("Kiyovu");
  });

  it("prefers a named place over a landmark in the same sentence", () => {
    expect(parse("Kiyovu, not too far from the stadium").neighbourhood).toBe("Kiyovu");
  });

  it("treats a large bare amount as francs and a small one as the display currency", () => {
    expect(parse("under 150000").maxPrice).toEqual({ minor: 150_000, currency: "RWF" });
    expect(parse("under 120").maxPrice).toEqual({ minor: 12_000, currency: "USD" });
    expect(parse("max 200k rwf").maxPrice).toEqual({ minor: 200_000, currency: "RWF" });
    expect(parse("moins de 100 000 frw").maxPrice).toEqual({ minor: 100_000, currency: "RWF" });
    expect(parse("€90 a night").maxPrice).toEqual({ minor: 9_000, currency: "EUR" });
  });

  it("does not read a price as a head count", () => {
    const i = parse("under 150 for 3");
    expect(i.maxPrice?.minor).toBe(15_000);
    expect(i.party).toBe(3);
  });

  it("knows a lease when it hears one", () => {
    const i = parse("long term rental in Gacuriro, furnished");
    expect(i.lease).toBe(true);
    expect(i.neighbourhood).toBe("Gacuriro");
    expect(i.amenities).toEqual(["furnished"]);
  });

  it("maps remote work to a desk and a connection", () => {
    expect(parse("good for remote work").amenities.sort()).toEqual(["fibre", "workspace"]);
  });

  it("does not count 'power' twice inside 'backup power'", () => {
    expect(parse("backup power").amenities).toEqual(["backupPower"]);
  });

  it("keeps 'lake' as a word about a stay when the sentence is about a stay", () => {
    const i = parse("villa near the lake with a garden");
    expect(i.lane).toBe("stays");
    expect(i.interest).toBeUndefined();
    expect(i.text).toContain("lake");
  });

  it("reads the sort the sentence asks for", () => {
    expect(parse("cheapest studio in Remera").sort).toBe("priceAsc");
    expect(parse("cheapest studio in Remera").text).toBe("studio");
  });

  it("understands French and Kinyarwanda structure words", () => {
    const fr = parse("appartement 2 chambres à Kacyiru pour 3 personnes avec jardin");
    expect([fr.neighbourhood, fr.bedrooms, fr.party, fr.amenities]).toEqual(["Kacyiru", 2, 3, ["garden"]]);
    const rw = parse("inzu ibyumba 3 i Remera");
    expect(rw.neighbourhood).toBe("Remera");
  });
});

describe("parseQuery: dates", () => {
  it("this weekend is the coming Friday to Sunday", () => {
    const i = parse("2 bed this weekend");
    expect([i.from, i.to]).toEqual(["2026-11-06", "2026-11-08"]);
  });

  it("next weekend is the one after", () => {
    expect(parse("next weekend").from).toBe("2026-11-13");
  });

  it("a number of nights with no start begins tomorrow", () => {
    const i = parse("Remera for 3 nights");
    expect([i.from, i.to]).toEqual(["2026-11-04", "2026-11-07"]);
    expect(i.party).toBeUndefined();
  });

  it("tonight is one night from today", () => {
    expect([parse("tonight").from, parse("tonight").to]).toEqual(["2026-11-03", "2026-11-04"]);
  });
});

describe("parseQuery: other lanes", () => {
  it("routes a car request and drops stay-only fields", () => {
    const i = parse("rent a car with driver for 7 people");
    expect(i.lane).toBe("cars");
    expect(i.driveMode).toBe("withDriver");
    expect(i.party).toBe(7);
    expect(i.lease).toBeUndefined();
  });

  it("routes a gorilla trek to experiences with its interest", () => {
    const i = parse("gorilla trekking");
    expect(i.lane).toBe("experiences");
    expect(i.interest).toBe("wildlife");
  });

  it("does not commit to a lane when the sentence does not", () => {
    expect(parse("something quiet").lane).toBeUndefined();
  });
});

describe("editDistance", () => {
  it("counts a transposition as one edit", () => {
    expect(editDistance("remrea", "remera")).toBe(1);
    expect(editDistance("kacyiru", "kacyiru")).toBe(0);
  });
});

describe("parseQuery: regressions", () => {
  it("consumes 'rent a car' even when 'with driver' already decided the lane", () => {
    const i = parse("rent a car with driver for 10");
    expect(i.text).toBe("");
    expect(i.lane).toBe("cars");
  });
});

describe("parseQuery: the examples the interface offers", () => {
  it("parses every English example into something structured", () => {
    const a = parse("2-bed in Kimihurura with backup power under $150");
    expect([a.neighbourhood, a.bedrooms, a.amenities, a.maxPrice?.minor]).toEqual(["Kimihurura", 2, ["backupPower"], 15_000]);
    const b = parse("Near the convention centre next week for 2");
    expect([b.neighbourhood, b.party, b.from]).toEqual(["Kimihurura", 2, "2026-11-09"]);
    const c = parse("Family house with a garden for 6 people");
    expect([c.lane, c.amenities, c.party, c.text]).toEqual(["stays", ["garden"], 6, "family"]);
    const d = parse("Car with a driver for 7");
    expect([d.lane, d.driveMode, d.party]).toEqual(["cars", "withDriver", 7]);
  });

  it("parses the French examples", () => {
    const a = parse("2 chambres à Kimihurura avec groupe électrogène sous 150 $");
    expect([a.neighbourhood, a.bedrooms, a.amenities, a.maxPrice]).toEqual(["Kimihurura", 2, ["backupPower"], { minor: 15_000, currency: "USD" }]);
    const d = parse("Voiture avec chauffeur pour 7");
    expect([d.lane, d.driveMode, d.party]).toEqual(["cars", "withDriver", 7]);
  });

  it("parses the Kinyarwanda examples", () => {
    const a = parse("Inzu ifite ibyumba 2 i Kimihurura munsi ya 150 $");
    expect([a.neighbourhood, a.bedrooms, a.maxPrice?.minor, a.text]).toEqual(["Kimihurura", 2, 15_000, ""]);
    const b = parse("Hafi ya KCC icyumweru gitaha abantu 2");
    expect([b.neighbourhood, b.party, b.from]).toEqual(["Kimihurura", 2, "2026-11-09"]);
    const d = parse("Imodoka n'umushoferi abantu 7");
    expect([d.lane, d.driveMode, d.party]).toEqual(["cars", "withDriver", 7]);
  });
});

describe("parseQuery: date words", () => {
  it("keeps the phrase the dates came from", () => {
    expect(parse("Remera next week").dateWords).toBe("next week");
    expect(parse("Remera for 3 nights").dateWords).toBe("for 3 nights");
    expect(parse("Remera").dateWords).toBeUndefined();
  });
});

describe("parseQuery: buying", () => {
  it("reads a purchase with a price in millions", () => {
    const i = parse("3 bed house to buy in gacuriro under 400 million");
    expect([i.lane, i.neighbourhood, i.bedrooms, i.maxPrice, i.text]).toEqual(["buy", "Gacuriro", 3, { minor: 400_000_000, currency: "RWF" }, ""]);
    expect(parse("for sale under 200M").maxPrice).toEqual({ minor: 200_000_000, currency: "RWF" });
  });
  it("drops guests and dates from a purchase", () => {
    const i = parse("apartment for sale in Kiyovu for 4 people next week");
    expect([i.lane, i.party, i.from]).toEqual(["buy", undefined, undefined]);
  });
});

describe("parseQuery: phrases a guest uses that a listing never says", () => {
  it("reads somewhere to work as the workspace amenity", () => {
    const i = parse("quiet place to work");
    expect(i.amenities).toContain("workspace");
    expect(i.text).toBe("quiet");
  });

  it("keeps who the place is for as words to rank by", () => {
    expect(parse("something for my parents").text).toBe("parents");
    expect(parse("no stairs please").text).toBe("stairs");
  });
});
