import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOG, type PricingCatalog } from "./catalog";
import { extrasFor, priceExtras } from "./extras";
import { applyPromo } from "./promo";
import { refundPreview } from "./policies";
import { money } from "./money";
import type { Quote } from "./pricing";

const quote: Quote = { nights: 4, lines: [{ key: "accommodation", amount: money(400_000, "RWF") }], total: money(400_000, "RWF"), escrowHeld: false };
const with_ = (patch: Partial<PricingCatalog>): PricingCatalog => ({ ...DEFAULT_CATALOG, ...patch });

describe("a pricing catalog set in admin settings", () => {
  it("prices an extra at its catalog price, and drops one that is switched off", () => {
    const c = with_({ extras: { ...DEFAULT_CATALOG.extras, airportPickup: { price: money(30_000, "RWF"), enabled: true }, groceries: { price: money(40_000, "RWF"), enabled: false } } });
    const lines = priceExtras("stay", [{ key: "airportPickup", quantity: 1 }, { key: "groceries", quantity: 1 }], 4, c);
    expect(lines).toEqual([{ key: "extra", extra: "airportPickup", amount: money(30_000, "RWF") }]);
    expect(extrasFor("stay", c)).not.toContain("groceries");
  });

  it("uses the catalog's promo codes, each limited to its lane", () => {
    const c = with_({ promos: { CARONLY: { percent: 20, capRwf: 100_000, validUntil: "2099-01-01", lane: "car" } } });
    expect(applyPromo("caronly", quote, "2026-11-08", c, "stay")).toMatchObject({ ok: false, reason: "notApplicable" });
    expect(applyPromo("KARIBU10", quote, "2026-11-08", c, "stay")).toMatchObject({ ok: false, reason: "unknown" });
  });

  it("falls back to today's constants when no catalog is given", () => {
    expect(applyPromo("KARIBU10", quote, "2026-11-08")).toMatchObject({ ok: true });
    expect(priceExtras("stay", [{ key: "airportPickup", quantity: 1 }], 4)[0].amount).toEqual(money(25_000, "RWF"));
  });

  it("moves the free-cancellation line when the window changes", () => {
    const c = with_({ windows: { stay: 14, car: 2, experience: 3 } });
    expect(refundPreview("stay", quote, "2026-11-18", "2026-11-08", {}, c).rule).toBe("half");
    expect(refundPreview("stay", quote, "2026-11-18", "2026-11-08").rule).toBe("full");
  });
});
