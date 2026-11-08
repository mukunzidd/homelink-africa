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
  "host",
  "driver",
  "guide",
  "ops",
  "admin",
];

/** Never trust a cookie's contents; it is user-writable by definition. */
export function parseRole(value: string | undefined): Role {
  return ROLES.includes(value as Role) ? (value as Role) : "visitor";
}

/** Which lane of supply a role owns. Null for anyone who owns none. */
export function supplyLaneFor(role: Role): "stay" | "car" | "experience" | null {
  if (role === "host") return "stay";
  if (role === "driver") return "car";
  if (role === "guide") return "experience";
  return null;
}

/**
 * Whose side of a thread a role reads from.
 *
 * Admin borrows the ops queue (there is no admin journey to build against), and
 * its Threads tab read zero because no thread names admin as a participant.
 * Writing admin into every fixture thread would make the data claim something
 * about the product; reading as the ops desk is what an admin does today. So
 * the mapping lives here once, for the repo's visibility and unread rules and
 * for the transcript's left/right alignment, rather than in every screen.
 */
export function readsAs(role: Role): Role {
  return role === "admin" ? "ops" : role;
}
