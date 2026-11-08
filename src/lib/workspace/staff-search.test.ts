import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/domain/types";
import { staffSearch } from "./staff-search";

const b = (reference: string, name: string, title: string, email = "x@example.rw"): Booking =>
  ({
    id: `bkg_${reference}`,
    reference,
    service: "stay",
    supplyItemId: "lst_x",
    title,
    startDate: "2026-11-10",
    endDate: "2026-11-12",
    party: 2,
    total: { minor: 100, currency: "RWF" },
    status: "confirmed",
    escrowHeld: false,
    guest: { name, email, phone: "" },
  }) as Booking;

const all = [
  b("HL-7K2Q-41", "Grace Wanjiru", "Two-bedroom flat off the airport road", "grace@example.ke"),
  b("HL-PRNT-12", "Tomás Herrera", "Rooftop flat in Nyamirambo"),
  b("HL-AB7K-03", "Ange Uwase", "Garden house in Kacyiru"),
];

describe("staffSearch", () => {
  it("finds a booking by any part of its reference once it starts HL-", () => {
    expect(staffSearch("hl-prnt", all).map((h) => h.reference)).toEqual(["HL-PRNT-12"]);
  });

  it("needs four characters of a reference without the prefix, so two letters do not match half the book", () => {
    expect(staffSearch("7k", all).filter((h) => h.match === "reference")).toEqual([]);
    expect(staffSearch("7k2q", all).map((h) => h.reference)).toEqual(["HL-7K2Q-41"]);
  });

  it("matches a guest's name without its accents, and their email", () => {
    expect(staffSearch("tomas", all).map((h) => h.reference)).toEqual(["HL-PRNT-12"]);
    expect(staffSearch("grace@", all).map((h) => h.match)).toEqual(["guest"]);
  });

  it("matches a home by name from three characters", () => {
    expect(staffSearch("nyamirambo", all).map((h) => [h.reference, h.match])).toEqual([["HL-PRNT-12", "property"]]);
    expect(staffSearch("ny", all)).toEqual([]);
  });

  it("puts reference matches before guests before homes, once each", () => {
    const rows = [...all, b("HL-GARD-99", "Someone Else", "Studio"), b("HL-ZZZZ-01", "Garden Person", "Loft")];
    const hits = staffSearch("gard", rows);
    expect(hits.map((h) => h.match)).toEqual(["reference", "guest", "property"]);
    expect(new Set(hits.map((h) => h.reference)).size).toBe(hits.length);
  });

  it("stops at the limit", () => {
    expect(staffSearch("flat", [...all, ...all.map((x) => ({ ...x, id: x.id + "2", reference: x.reference + "B" }))], 2)).toHaveLength(2);
  });
});
