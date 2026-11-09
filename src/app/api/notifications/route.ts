import { cookies } from "next/headers";
import type { NotificationCategory } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";

const CATEGORIES: NotificationCategory[] = ["booking", "payment", "message", "stay", "work", "system"];

/**
 * The bell panel's list, for whoever is asking. The site header is static
 * on purpose (reading the role cookie there would make every public page
 * dynamic), so the panel asks for its rows after it opens, not at render.
 */
export async function GET(request: Request) {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role === "visitor") return Response.json({ items: [], unread: 0 }, { headers: { "Cache-Control": "no-store" } });
  const q = new URL(request.url).searchParams;
  const category = CATEGORIES.find((c) => c === q.get("category"));
  const limit = Math.min(50, Math.max(1, Number(q.get("limit")) || 12));
  const items = await repos().notifications.forRole(role, {
    category,
    unreadOnly: q.get("unread") === "1",
  });
  const unread = await repos().notifications.unreadCount(role);
  return Response.json({ items: items.slice(0, limit), unread }, { headers: { "Cache-Control": "no-store" } });
}
