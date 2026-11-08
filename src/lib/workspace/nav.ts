import type { Role } from "@/lib/domain/types";

/**
 * The workspace's map: which sections exist, who may open each one, and the
 * order the sidebar shows them in.
 *
 * One table, read three ways. The sidebar renders it, the layout guard asks
 * it whether a role may open a page, and the account menu asks it where a
 * role lands. Keeping all three on one list is what stops a section from
 * being reachable by URL while missing from the sidebar, or the reverse.
 *
 * Kept free of React so it runs in the unit tests; icons are named here and
 * resolved to components by the sidebar.
 */

export type WorkspaceSection =
  | "overview" | "today" | "bookings" | "calendar" | "asks" | "inspections"
  | "housekeeping" | "maintenance" | "incidents" | "inbox" | "notifications"
  | "portfolio" | "rates" | "tenants" | "sales" | "partners" | "finance"
  | "people" | "content" | "settings" | "audit"
  | "jobs" | "schedule" | "earnings" | "documents";

export type IconName =
  | "GridIcon" | "SunIcon" | "ListIcon" | "CalendarIcon" | "SparkIcon" | "ShieldIcon"
  | "BedIcon" | "WrenchIcon" | "FlagIcon" | "MessageIcon" | "BellIcon" | "HouseIcon"
  | "ColumnsIcon" | "KeyIcon" | "HomeIcon" | "CarIcon" | "ChartIcon" | "UsersIcon"
  | "ImageIcon" | "GearIcon" | "HistoryIcon" | "RouteIcon" | "ClockIcon"
  | "BanknoteIcon" | "PaperclipIcon";

export type NavItem = {
  section: WorkspaceSection;
  href: `/manage/${string}`;
  icon: IconName;
};

export type NavGroupKey = "work" | "homes" | "money" | "platform" | "partner";
export type NavGroup = { key: NavGroupKey; items: NavItem[] };

type WorkspaceRole = "ops" | "admin" | "driver" | "guide";

const STAFF: WorkspaceRole[] = ["ops", "admin"];
const ADMIN: WorkspaceRole[] = ["admin"];
const PARTNER: WorkspaceRole[] = ["driver", "guide"];
const EVERYONE: WorkspaceRole[] = ["ops", "admin", "driver", "guide"];

/**
 * In sidebar order. A section appears in the first group listed for it; the
 * inbox and notifications sit in "work" for staff and "partner" for drivers
 * and guides, so they carry one row per audience.
 */
const TABLE: { group: NavGroupKey; item: NavItem; roles: WorkspaceRole[] }[] = [
  { group: "work", roles: ADMIN, item: { section: "overview", href: "/manage/overview", icon: "GridIcon" } },
  { group: "work", roles: STAFF, item: { section: "today", href: "/manage/today", icon: "SunIcon" } },
  { group: "work", roles: STAFF, item: { section: "bookings", href: "/manage/bookings", icon: "ListIcon" } },
  // Ops sees the calendar read-only; editing is admin's (Task 39).
  { group: "work", roles: STAFF, item: { section: "calendar", href: "/manage/calendar", icon: "CalendarIcon" } },
  { group: "work", roles: STAFF, item: { section: "asks", href: "/manage/asks", icon: "SparkIcon" } },
  { group: "work", roles: STAFF, item: { section: "inspections", href: "/manage/inspections", icon: "ShieldIcon" } },
  { group: "work", roles: STAFF, item: { section: "housekeeping", href: "/manage/housekeeping", icon: "BedIcon" } },
  { group: "work", roles: STAFF, item: { section: "maintenance", href: "/manage/maintenance", icon: "WrenchIcon" } },
  { group: "work", roles: STAFF, item: { section: "incidents", href: "/manage/incidents", icon: "FlagIcon" } },
  { group: "work", roles: STAFF, item: { section: "inbox", href: "/manage/inbox", icon: "MessageIcon" } },
  { group: "work", roles: STAFF, item: { section: "notifications", href: "/manage/notifications", icon: "BellIcon" } },

  { group: "homes", roles: ADMIN, item: { section: "portfolio", href: "/manage/portfolio", icon: "HouseIcon" } },
  { group: "homes", roles: ADMIN, item: { section: "rates", href: "/manage/rates", icon: "ColumnsIcon" } },
  { group: "homes", roles: ADMIN, item: { section: "tenants", href: "/manage/tenants", icon: "KeyIcon" } },
  { group: "homes", roles: ADMIN, item: { section: "sales", href: "/manage/sales", icon: "HomeIcon" } },
  { group: "homes", roles: ADMIN, item: { section: "partners", href: "/manage/partners", icon: "CarIcon" } },

  { group: "money", roles: ADMIN, item: { section: "finance", href: "/manage/finance", icon: "ChartIcon" } },

  { group: "platform", roles: ADMIN, item: { section: "people", href: "/manage/people", icon: "UsersIcon" } },
  { group: "platform", roles: ADMIN, item: { section: "content", href: "/manage/content", icon: "ImageIcon" } },
  { group: "platform", roles: ADMIN, item: { section: "settings", href: "/manage/settings", icon: "GearIcon" } },
  { group: "platform", roles: ADMIN, item: { section: "audit", href: "/manage/audit", icon: "HistoryIcon" } },

  { group: "partner", roles: PARTNER, item: { section: "jobs", href: "/manage/jobs", icon: "RouteIcon" } },
  { group: "partner", roles: PARTNER, item: { section: "schedule", href: "/manage/schedule", icon: "ClockIcon" } },
  { group: "partner", roles: PARTNER, item: { section: "inbox", href: "/manage/inbox", icon: "MessageIcon" } },
  { group: "partner", roles: PARTNER, item: { section: "earnings", href: "/manage/earnings", icon: "BanknoteIcon" } },
  { group: "partner", roles: PARTNER, item: { section: "documents", href: "/manage/documents", icon: "PaperclipIcon" } },
  { group: "partner", roles: PARTNER, item: { section: "notifications", href: "/manage/notifications", icon: "BellIcon" } },
];

const GROUP_ORDER: NavGroupKey[] = ["work", "homes", "money", "platform", "partner"];

export function isWorkspaceRole(role: Role): role is WorkspaceRole {
  return (EVERYONE as Role[]).includes(role);
}

export function workspaceNav(role: Role): NavGroup[] {
  if (!isWorkspaceRole(role)) return [];
  return GROUP_ORDER.map((key) => ({
    key,
    items: TABLE.filter((r) => r.group === key && r.roles.includes(role)).map((r) => r.item),
  })).filter((g) => g.items.length > 0);
}

export function canAccess(role: Role, section: WorkspaceSection): boolean {
  if (!isWorkspaceRole(role)) return false;
  return TABLE.some((r) => r.item.section === section && r.roles.includes(role));
}

const HOME: Record<WorkspaceRole, `/manage/${string}`> = {
  admin: "/manage/overview",
  ops: "/manage/today",
  driver: "/manage/jobs",
  guide: "/manage/jobs",
};

export function homeFor(role: Role): `/manage/${string}` | null {
  return isWorkspaceRole(role) ? HOME[role] : null;
}

/** The section a workspace path belongs to, for the active state. */
export function sectionOf(pathname: string): WorkspaceSection | null {
  const m = /\/manage\/([a-z-]+)/.exec(pathname);
  const found = TABLE.find((r) => r.item.href === `/manage/${m?.[1]}`);
  return found ? found.item.section : null;
}
