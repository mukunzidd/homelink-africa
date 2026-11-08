import { describe, expect, it } from "vitest";
import { searchPlaces, streetAddress } from "./gazetteer";

describe("searchPlaces", () => {
  it("finds a place by the start of its name, ignoring case and accents", () => {
    expect(searchPlaces("kimiron").map((p) => p.name)).toEqual(expect.arrayContaining(["Kimironko", "Kimironko Market"]));
    expect(searchPlaces("kimironko m")[0].name).toBe("Kimironko Market");
    expect(searchPlaces("CONVENTION")[0].name).toBe("Kigali Convention Centre");
  });

  it("finds a place by an alias", () => {
    expect(searchPlaces("KGL")[0].name).toBe("Kigali International Airport");
    expect(searchPlaces("bus park").map((p) => p.name)).toContain("Nyabugogo Bus Park");
  });

  it("ranks a name that starts with the query above one that only contains it", () => {
    const names = searchPlaces("remera").map((p) => p.name);
    expect(names[0]).toBe("Remera");
  });

  it("returns nothing for one letter, and at most the limit", () => {
    expect(searchPlaces("k")).toEqual([]);
    expect(searchPlaces("ki", 3)).toHaveLength(3);
  });

  it("only holds points inside Kigali", () => {
    for (const p of searchPlaces("a", 999).concat(searchPlaces("e", 999))) {
      expect(p.lat).toBeGreaterThan(-2.1);
      expect(p.lat).toBeLessThan(-1.85);
      expect(p.lng).toBeGreaterThan(29.95);
      expect(p.lng).toBeLessThan(30.2);
    }
  });
});

describe("streetAddress", () => {
  it("reads a Kigali street code and the district it is in", () => {
    expect(streetAddress("KG 7 Ave")).toMatchObject({ code: "KG 7 Ave", district: "Gasabo" });
    expect(streetAddress("kn5rd 12")).toMatchObject({ code: "KN 5 Rd", district: "Nyarugenge" });
    expect(streetAddress("house 4, KK 15 St")).toMatchObject({ code: "KK 15 St", district: "Kicukiro" });
  });

  it("is null for anything that is not a street code", () => {
    expect(streetAddress("Kimironko")).toBeNull();
  });
});
