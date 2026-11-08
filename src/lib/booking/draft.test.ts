import { describe, expect, it } from "vitest";
import {
  STEPS,
  canEnter,
  draftId,
  draftReducer,
  firstIncompleteStep,
  newDraft,
  stepComplete,
  type BookingDraft,
} from "./draft";
import { VALID } from "./validation";

const now = new Date("2026-11-08T10:00:00Z");
const init = { flow: "stay" as const, slug: "a", start: "2026-12-01", end: "2026-12-05", party: 2 };

function withDetails(d: BookingDraft): BookingDraft {
  return draftReducer(d, {
    type: "guest",
    value: { name: "Ange Uwase", email: "ange@example.rw", phone: "+250 788 123 456" },
  });
}

describe("draftId", () => {
  it("gives the same id for the same booking, and a different one for different dates", () => {
    expect(draftId("stay", "a", "2026-12-01", "2026-12-05", 2)).toBe(draftId("stay", "a", "2026-12-01", "2026-12-05", 2));
    expect(draftId("stay", "a", "2026-12-01", "2026-12-06", 2)).not.toBe(draftId("stay", "a", "2026-12-01", "2026-12-05", 2));
  });
});

describe("steps", () => {
  it("walks each lane through its own steps, ending at pay", () => {
    expect(STEPS.stay).toEqual(["details", "extras", "review", "pay"]);
    expect(STEPS.rent).toEqual(["details", "application", "review", "agreement", "pay"]);
    expect(STEPS.car).toEqual(["driver", "details", "extras", "review", "pay"]);
    expect(STEPS.experience).toEqual(["people", "details", "review", "pay"]);
    for (const steps of Object.values(STEPS)) expect(steps.at(-1)).toBe("pay");
  });

  it("starts a new draft with its hold running", () => {
    expect(newDraft(init, now).holdStartedAt).toBe(now.toISOString());
  });
});

describe("gating", () => {
  it("will not let a guest reach pay before accepting the house rules", () => {
    const d = withDetails(newDraft(init, now));
    expect(canEnter(d, "pay")).toBe(false);
    expect(firstIncompleteStep(d)).toBe("review");
    expect(canEnter(draftReducer(d, { type: "acceptRules", value: true }), "pay")).toBe(true);
  });

  it("does not count details as done with a malformed email", () => {
    const d = draftReducer(newDraft(init, now), { type: "guest", value: { name: "Ange", email: "ange@", phone: "0788123456" } });
    expect(stepComplete(d, "details")).toBe(false);
  });

  it("needs the traveller's name when booking for someone else", () => {
    const d = draftReducer(withDetails(newDraft(init, now)), { type: "guest", value: { forSomeoneElse: true } });
    expect(stepComplete(d, "details")).toBe(false);
    expect(stepComplete(draftReducer(d, { type: "guest", value: { travellerName: "Jean Mugabo" } }), "details")).toBe(true);
  });

  it("needs a licence for self-drive, not with a driver", () => {
    const car = newDraft({ ...init, flow: "car" }, now);
    expect(stepComplete(draftReducer(car, { type: "driveMode", value: "selfDrive" }), "driver")).toBe(false);
    expect(stepComplete(draftReducer(car, { type: "driveMode", value: "withDriver" }), "driver")).toBe(true);
    const licensed = draftReducer(draftReducer(car, { type: "driveMode", value: "selfDrive" }), { type: "licence", fileName: "licence.pdf" });
    expect(stepComplete(licensed, "driver")).toBe(true);
  });

  it("needs a well-formed flight number only when one is given", () => {
    const car = draftReducer(newDraft({ ...init, flow: "car" }, now), { type: "driveMode", value: "withDriver" });
    expect(stepComplete(draftReducer(car, { type: "pickup", value: { kind: "airport", detail: "", flight: "wb 464" } }), "driver")).toBe(true);
    expect(stepComplete(draftReducer(car, { type: "pickup", value: { kind: "airport", detail: "", flight: "late" } }), "driver")).toBe(false);
  });

  it("needs passports for a permit day, not for a city walk", () => {
    const day = newDraft({ ...init, flow: "experience", party: 1 }, now);
    const one = [{ name: "Ange Uwase", age: 30 }];
    const walk = draftReducer(draftReducer(day, { type: "participants", value: one }), { type: "slot", value: "09:00" });
    expect(stepComplete(walk, "people", { minAge: 0, requiresPermit: false })).toBe(true);
    expect(stepComplete(walk, "people", { minAge: 0, requiresPermit: true })).toBe(false);
    const withPassport = draftReducer(walk, { type: "participants", value: [{ ...one[0], nationality: "RW", passport: "PC1234567" }] });
    expect(stepComplete(withPassport, "people", { minAge: 0, requiresPermit: true })).toBe(true);
  });

  it("refuses someone under the day's minimum age", () => {
    const d = draftReducer(draftReducer(newDraft({ ...init, flow: "experience", party: 1 }, now), { type: "participants", value: [{ name: "Kid", age: 12 }] }), { type: "slot", value: "09:00" });
    expect(stepComplete(d, "people", { minAge: 15, requiresPermit: false })).toBe(false);
  });

  it("needs the signature to match the guest's name, ignoring case and spaces", () => {
    const d = withDetails(newDraft({ ...init, flow: "rent" }, now));
    expect(stepComplete(draftReducer(d, { type: "sign", signedName: "  ange  uwase ", at: now.toISOString() }), "agreement")).toBe(true);
    expect(stepComplete(draftReducer(d, { type: "sign", signedName: "Someone Else", at: now.toISOString() }), "agreement")).toBe(false);
  });

  it("returns to the first step that is not done", () => {
    const d = newDraft({ ...init, flow: "car" }, now);
    expect(firstIncompleteStep(d)).toBe("driver");
  });

  it("counts extras as done, so a guest who wants none can skip them", () => {
    expect(stepComplete(newDraft(init, now), "extras")).toBe(true);
  });
});

describe("draftReducer", () => {
  it("merges guest details rather than replacing them", () => {
    const d = draftReducer(withDetails(newDraft(init, now)), { type: "guest", value: { arrivalTime: "22:00" } });
    expect(d.guest.name).toBe("Ange Uwase");
    expect(d.guest.arrivalTime).toBe("22:00");
  });

  it("clears the promo with an empty value", () => {
    const d = draftReducer(draftReducer(newDraft(init, now), { type: "promo", value: "KARIBU10" }), { type: "promo", value: undefined });
    expect(d.promoCode).toBeUndefined();
  });
});

describe("validation", () => {
  it("accepts a Rwandan number the three ways it is written", () => {
    for (const n of ["0788123456", "788123456", "+250 788 123 456"]) expect(VALID["momo-number"](n)).toBe(true);
  });
});
