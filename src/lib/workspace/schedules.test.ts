import { describe, expect, it } from "vitest";
import { money } from "@/lib/domain/money";
import type { PaymentRecord } from "@/lib/domain/types";
import { rentSchedule } from "./schedules";

const rent = money(500_000, "RWF");
const paid = (at: string): PaymentRecord => ({ id: at, bookingId: "b", rail: "card", kind: "rent", amount: rent, status: "succeeded", at: `${at}T09:00:00Z` });

describe("rentSchedule", () => {
  it("falls on the start's day of month, clamped to short months", () => {
    const s = rentSchedule("2026-01-31", 12, rent, [], "2026-01-01");
    expect(s.slice(0, 3).map((i) => i.due)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(s).toHaveLength(12);
  });

  it("marks paid, overdue, due and upcoming", () => {
    const s = rentSchedule("2026-08-01", 12, rent, [paid("2026-08-01"), paid("2026-09-01"), paid("2026-10-02")], "2026-11-04");
    expect(s.slice(0, 5).map((i) => i.status)).toEqual(["paid", "paid", "paid", "overdue", "upcoming"]);
    const dueSoon = rentSchedule("2026-08-01", 12, rent, [paid("2026-08-01"), paid("2026-09-01"), paid("2026-10-02")], "2026-10-28");
    expect(dueSoon[3].status).toBe("due");
  });

  it("counts an instalment overdue only after its day", () => {
    expect(rentSchedule("2026-08-01", 3, rent, [], "2026-08-01")[0].status).toBe("due");
    expect(rentSchedule("2026-08-01", 3, rent, [], "2026-08-02")[0].status).toBe("overdue");
  });
});
