import type { ReactElement } from "react";
import { cookies } from "next/headers";
import type { Role } from "@/lib/domain/types";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { canAccess, type WorkspaceSection } from "./nav";
import { NotForYou } from "@/components/workspace/not-for-you";

/**
 * The first line of every workspace page.
 *
 *   const access = await requireSection("finance");
 *   if ("deny" in access) return access.deny;
 *
 * The role is read on the server from the cookie, and a page that refuses
 * never fetches its rows: hiding them in the browser after fetching would be
 * a leak wearing a dashboard (see `role.ts`). The layout has already turned
 * visitors and guests away, so what reaches here is a workspace role that
 * may or may not have this section.
 *
 * Not `forbidden()`: in Next 16.3 it still needs the experimental
 * `authInterrupts` flag, and an experimental flag on the one check that
 * decides who sees money is the wrong place to be early.
 */
export async function requireSection(
  section: WorkspaceSection,
): Promise<{ role: Role } | { deny: ReactElement }> {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (!canAccess(role, section)) return { deny: <NotForYou kind="section" /> };
  return { role };
}

export async function currentRole(): Promise<Role> {
  return parseRole((await cookies()).get(ROLE_COOKIE)?.value);
}
