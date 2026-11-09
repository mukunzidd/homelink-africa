import { describe, expect, it } from "vitest";
import { paginate } from "@/lib/paginate";
import { parseRole, readsAs, supplyLaneFor } from "@/lib/preferences/role";
import {
  quoteExperience,
  quoteStay,
  quoteVehicle,
  supplierShare,
} from "@/lib/domain/pricing";
import { formatMoney, money } from "@/lib/domain/money";
import { EXPERIENCES, LISTINGS, VEHICLES } from "@/lib/repos/fixtures/data";

describe("paginate", () => {
  it("clamps a page past the end to the last page", () => {
    const page = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(page.page).toBe(3);
    expect(page.items).toEqual([5]);
    expect([page.from, page.to]).toEqual([5, 5]);
  });

  it("reports an empty list as 0–0 of 0, not 1–0", () => {
    const page = paginate([], 1, 10);
    expect([page.from, page.to, page.total, page.pages]).toEqual([0, 0, 0, 1]);
  });
});

describe("parseRole", () => {
  it("refuses a cookie it does not recognise", () => {
    expect(parseRole("superuser")).toBe("visitor");
    expect(parseRole(undefined)).toBe("visitor");
    expect(parseRole("ops")).toBe("ops");
  });

  it("reads a retired host cookie as a visitor", () => {
    expect(parseRole("host")).toBe("visitor");
    expect(parseRole("ADMIN")).toBe("visitor");
  });

  it("gives admin no supply lane; homes are not a partner's", () => {
    expect(supplyLaneFor("admin")).toBeNull();
    expect(supplyLaneFor("driver")).toBe("car");
    expect(supplyLaneFor("guide")).toBe("experience");
  });

  it("lets admin read threads as itself, now that it is in them", () => {
    expect(readsAs("admin")).toBe("admin");
  });
});

describe("quoteStay", () => {
  const listing = LISTINGS.find((l) => l.slug === "kacyiru-garden-apartment")!;

  it("keeps RWF in whole francs", () => {
    const quote = quoteStay(listing, "2026-12-01", "2026-12-04")!;
    expect(quote.nights).toBe(3);
    expect(quote.lines[0].amount).toEqual(money(495_000, "RWF"));
    expect(Number.isInteger(quote.total.minor)).toBe(true);
    // RWF is zero-decimal: 495,000 francs must never render as 4,950.
    expect(formatMoney(quote.lines[0].amount, "en-GB")).toContain("495,000");
  });

  it("refuses a stay with no nights", () => {
    expect(quoteStay(listing, "2026-12-01", "2026-12-01")).toBeNull();
  });
});

describe("supplierShare", () => {
  const feeOf = (lines: { key: string; amount: { minor: number } }[]) =>
    lines.find((l) => l.key === "serviceFee")!.amount.minor;

  it("recovers the service fee of every stay quote, leaving cleaning outside the fee", () => {
    for (const listing of LISTINGS) {
      for (const to of ["2026-12-02", "2026-12-04", "2026-12-15"]) {
        const quote = quoteStay(listing, "2026-12-01", to)!;
        const share = supplierShare(quote.total, "stay");
        expect(share.fee.minor).toBe(feeOf(quote.lines));
        expect(share.net.minor + share.fee.minor).toBe(quote.total.minor);
      }
    }
  });

  it("recovers the fee on hires, with and without a driver", () => {
    for (const vehicle of VEHICLES) {
      for (const mode of vehicle.driveModes) {
        const quote = quoteVehicle(vehicle, "2026-12-01", "2026-12-04", mode)!;
        expect(supplierShare(quote.total, "car").fee.minor).toBe(feeOf(quote.lines));
      }
    }
  });

  it("recovers the fee on days out, for any party size", () => {
    for (const experience of EXPERIENCES) {
      for (let party = 1; party <= experience.groupMax; party++) {
        const quote = quoteExperience(experience, party)!;
        expect(supplierShare(quote.total, "experience").fee.minor).toBe(
          feeOf(quote.lines),
        );
      }
    }
  });

  it("keeps the currency and never takes a fee from nothing", () => {
    const share = supplierShare(money(0, "RWF"), "stay");
    expect(share.fee).toEqual(money(0, "RWF"));
    expect(share.net).toEqual(money(0, "RWF"));
  });
});
