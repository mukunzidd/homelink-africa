import { cookies } from "next/headers";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";

/**
 * The bell's poll: how many unread for whoever is asking, and with
 * `?latest=1` the newest unread one, so a toast can say what arrived.
 *
 * Polled every 30 seconds while the tab is visible. Phase 2 replaces the
 * poll with Supabase Realtime and deletes this route.
 */
export async function GET(request: Request) {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  const count = role === "visitor" ? 0 : await repos().notifications.unreadCount(role);
  const wantLatest = new URL(request.url).searchParams.get("latest") === "1";
  const latest =
    wantLatest && count > 0
      ? (await repos().notifications.forRole(role, { unreadOnly: true }))[0] ?? null
      : null;
  return Response.json(
    { count, ...(wantLatest ? { latest } : {}) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
