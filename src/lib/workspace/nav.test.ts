import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/domain/types";
import { canAccess, homeFor, isWorkspaceRole, workspaceNav } from "./nav";

const sections = (role: Role) =>
  workspaceNav(role).flatMap((g) => g.items.map((i) => i.section));

describe("workspaceNav", () => {
  it("gives ops the work group and the read-only calendar, no money or platform", () => {
    const s = sections("ops");
    expect(s).toEqual(
      expect.arrayContaining([
        "today", "bookings", "calendar", "asks", "inspections",
        "housekeeping", "maintenance", "incidents", "inbox",
      ]),
    );
    expect(s).not.toContain("finance");
    expect(s).not.toContain("portfolio");
  });

  it("gives admin everything ops has and every homes, money and platform section", () => {
    expect(sections("admin")).toEqual(
      expect.arrayContaining([
        ...sections("ops"),
        "overview", "portfolio", "rates", "tenants", "sales", "partners",
        "finance", "people", "content", "settings", "audit",
      ]),
    );
  });

  it("gives a driver and a guide only partner sections", () => {
    expect(sections("driver").sort()).toEqual(
      ["documents", "earnings", "inbox", "jobs", "notifications", "schedule"],
    );
    expect(sections("guide")).toEqual(sections("driver"));
  });

  it("gives guests and visitors no workspace", () => {
    expect(workspaceNav("guest")).toEqual([]);
    expect(workspaceNav("visitor")).toEqual([]);
    expect(homeFor("visitor")).toBeNull();
    expect(isWorkspaceRole("guest")).toBe(false);
    expect(isWorkspaceRole("driver")).toBe(true);
  });

  it("lists no section twice and no empty group", () => {
    for (const role of ["ops", "admin", "driver", "guide"] as Role[]) {
      const s = sections(role);
      expect(new Set(s).size).toBe(s.length);
      for (const g of workspaceNav(role)) expect(g.items.length).toBeGreaterThan(0);
    }
  });
});

describe("canAccess", () => {
  it("refuses a section the role does not have", () => {
    expect(canAccess("ops", "finance")).toBe(false);
    expect(canAccess("guest", "finance")).toBe(false);
    expect(canAccess("visitor", "today")).toBe(false);
    expect(canAccess("driver", "bookings")).toBe(false);
    expect(canAccess("admin", "finance")).toBe(true);
  });
});

describe("homeFor", () => {
  it("sends each role to its own home", () => {
    expect(homeFor("admin")).toBe("/manage/overview");
    expect(homeFor("ops")).toBe("/manage/today");
    expect(homeFor("driver")).toBe("/manage/jobs");
    expect(homeFor("guide")).toBe("/manage/jobs");
  });
});
