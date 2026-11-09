import { beforeEach, describe, expect, it } from "vitest";
import type { AppNotification } from "@/lib/domain/types";
import { kigaliDay } from "@/lib/domain/instants";
import { fixtureRepositories } from "@/lib/repos/fixtures";
import { resetStore } from "@/lib/repos/fixtures/store";
import { NOTIFICATION_CATALOG, defaultPrefs } from "./catalog";
import { groupByDay } from "./group";

const r = fixtureRepositories.notifications;

const n = (createdAt: string): AppNotification => ({
  id: createdAt,
  audience: "guest",
  kind: "newMessage",
  category: "message",
  params: {},
  href: "/",
  createdAt,
});

describe("kigaliDay", () => {
  it("reads the Kigali day, not the UTC one", () => {
    expect(kigaliDay("2026-11-08T22:30:00Z")).toBe("2026-11-09");
    expect(kigaliDay("2026-11-08T21:59:59Z")).toBe("2026-11-08");
  });
});

describe("groupByDay", () => {
  it("groups by Kigali day", () => {
    const now = new Date("2026-11-09T06:00:00Z"); // 08:00 in Kigali
    const g = groupByDay(
      [n("2026-11-08T22:30:00Z"), n("2026-11-08T21:00:00Z"), n("2026-11-01T10:00:00Z")],
      now,
    );
    expect(g.map((x) => [x.group, x.items.length])).toEqual([
      ["today", 1],
      ["yesterday", 1],
      ["earlier", 1],
    ]);
  });

  it("leaves out a group with nothing in it", () => {
    const g = groupByDay([n("2026-11-01T10:00:00Z")], new Date("2026-11-09T06:00:00Z"));
    expect(g.map((x) => x.group)).toEqual(["earlier"]);
  });
});

describe("catalog", () => {
  it("lets every role that works with us receive something", () => {
    for (const role of ["guest", "ops", "admin", "driver", "guide"] as const) {
      expect(Object.values(NOTIFICATION_CATALOG).some((k) => k.audiences.includes(role))).toBe(true);
    }
  });

  it("starts quiet hours at 22:00 and ends them at 07:00", () => {
    expect(defaultPrefs("guest").quietHours).toEqual({ from: "22:00", to: "07:00" });
  });
});

describe("notifications repo", () => {
  beforeEach(() => resetStore());

  it("has something to show every role, so no panel starts empty", async () => {
    for (const role of ["guest", "ops", "admin", "driver", "guide"] as const) {
      expect((await r.forRole(role)).length).toBeGreaterThanOrEqual(6);
    }
  });

  it("never shows one role another role's notifications", async () => {
    for (const item of await r.forRole("ops")) expect(item.audience).toBe("ops");
  });

  it("lists newest first", async () => {
    const list = await r.forRole("guest");
    const times = list.map((x) => x.createdAt);
    expect(times).toEqual([...times].sort().reverse());
  });

  it("ignores ids that belong to another role when marking read", async () => {
    const guestItem = (await r.forRole("guest", { unreadOnly: true }))[0];
    expect(await r.markRead("ops", [guestItem.id])).toBe(0);
    const after = (await r.forRole("guest")).find((x) => x.id === guestItem.id);
    expect(after?.readAt).toBeUndefined();
  });

  it("counts unread after marking", async () => {
    const before = await r.unreadCount("guest");
    const unread = await r.forRole("guest", { unreadOnly: true });
    expect(await r.markRead("guest", unread.slice(0, 2).map((x) => x.id))).toBe(2);
    expect(await r.unreadCount("guest")).toBe(before - 2);
    await r.markAllRead("guest");
    expect(await r.unreadCount("guest")).toBe(0);
  });

  it("filters by category", async () => {
    for (const item of await r.forRole("guest", { category: "payment" })) {
      expect(item.category).toBe("payment");
    }
  });

  it("refuses to send a guest a staff event", async () => {
    await expect(
      r.create({ audience: "guest", kind: "newIncident", params: {}, href: "/" }),
    ).rejects.toThrow();
  });

  it("files a new one under its catalog category, unread", async () => {
    const made = await r.create({ audience: "ops", kind: "newBooking", params: { ref: "HL-AAAA-BB" }, href: "/manage/bookings" });
    expect(made.category).toBe("booking");
    expect(made.readAt).toBeUndefined();
    expect((await r.forRole("ops"))[0].id).toBe(made.id);
  });

  it("keeps each role's preferences apart", async () => {
    const prefs = await r.prefs("guest");
    await r.setPrefs("guest", { ...prefs, quietHours: null });
    expect((await r.prefs("guest")).quietHours).toBeNull();
    expect((await r.prefs("ops")).quietHours).not.toBeNull();
  });
});
