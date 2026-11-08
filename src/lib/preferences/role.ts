import type { Role } from "@/lib/domain/types";

/**
 * The one preference the server has to know.
 *
 * Everything else in `PreferencesProvider` — currency, theme, segment — only
 * changes how a page reads, so localStorage and a client render are enough.
 * Role decides *which rows a page is allowed to fetch*, and a screen that
 * fetches every role's rows and hides the wrong ones with JavaScript is a data
 * leak wearing a dashboard. So role rides in a cookie and the server picks the
 * data.
 *
 * This is deliberately not the deferred theme-cookie decision. That one is
 * hard because `cookies()` opts a route out of static rendering, and the theme
 * has to be known on the landing page before first paint. Role is only read on
 * `/inventory` and `/queue`, which are per-user screens that could never have
 * been static, so it costs nothing.
 *
 * Phase 2 replaces the cookie with a Supabase Auth claim and nothing above
 * this line changes.
 */
export const ROLE_COOKIE = "homelink.role";

const ROLES: Role[] = [
  "visitor",
  "guest",
  "driver",
  "guide",
  "ops",
  "admin",
];

/** Never trust a cookie's contents; it is user-writable by definition. */
export function parseRole(value: string | undefined): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "visitor";
}

/**
 * Which lane of supply a role owns. Null for anyone who owns none.
 *
 * HomeLink hosts every home itself, so no outside role owns stays: they are
 * managed by admin from the workspace, not owned by anyone who signs in.
 * `host` was removed for that reason, and a cookie still carrying it reads as
 * a visitor in `parseRole`, never as admin: mapping a retired role onto the
 * most powerful one is the habit that becomes a privilege escalation once
 * the cookie is a real claim.
 */
export function supplyLaneFor(role: Role): "car" | "experience" | null {
  if (role === "driver") return "car";
  if (role === "guide") return "experience";
  return null;
}

/**
 * Whose side of a thread a role reads from.
 *
 * Admin used to borrow the ops desk's side, because no thread named admin.
 * Now admin is the property manager in the desk-to-home threads that used to
 * be a host's, so it reads as itself; seeing every thread is a visibility
 * rule in the messaging repo, not a disguise here.
 */
export function readsAs(role: Role): Role {
  return role;
}
