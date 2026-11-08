"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import type { AppNotification, NotificationKind, NotificationPrefs } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { kindsFor } from "@/lib/notifications/catalog";

/**
 * Notification writes. The reader's role comes from the cookie on the
 * server, never from an argument, so a call cannot mark or read another
 * role's inbox by naming it.
 */
async function reader() {
  return parseRole((await cookies()).get(ROLE_COOKIE)?.value);
}

export async function markNotificationsRead(ids: string[]): Promise<number> {
  const role = await reader();
  const n = await repos().notifications.markRead(role, ids.slice(0, 200));
  refresh();
  return n;
}

export async function markAllNotificationsRead(): Promise<number> {
  const role = await reader();
  const n = await repos().notifications.markAllRead(role);
  refresh();
  return n;
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  const role = await reader();
  if (role === "visitor") return;
  // Only the kinds this role can receive are kept; anything else in the
  // payload is dropped rather than stored.
  const allowed = new Set(kindsFor(role));
  const channels = Object.fromEntries(
    Object.entries(prefs.channels).filter(([k]) => allowed.has(k as NotificationKind)),
  );
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const quietHours =
    prefs.quietHours && time.test(prefs.quietHours.from) && time.test(prefs.quietHours.to)
      ? prefs.quietHours
      : null;
  await repos().notifications.setPrefs(role, { channels, quietHours });
  if (role !== "guest") await repos().audit.record({ actor: role, action: "notifications.prefs", target: role });
}

/**
 * Preview only: send the current role one event it can receive, so the
 * bell, the toast and the panel can be seen arriving without a backend.
 * Phase 2 deletes this; real events come from bookings and payments.
 */
export async function simulateNotification(): Promise<AppNotification | null> {
  const role = await reader();
  const kinds = kindsFor(role);
  if (!kinds.length) return null;
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const SAMPLE: Record<string, string | number> = {
    name: "Garden apartment with hill view",
    ref: "HL-4KQ2-8M",
    amount: "RWF 165,000",
    date: "14 Nov",
    from: "Aline M.",
    subject: "A quick question about your arrival",
    guest: "Claire D.",
    ask: "Could we have a cot in the room?",
    category: "Water",
    count: 2,
    what: "Airport pickup, KGL",
    doc: "Insurance certificate",
  };
  const made = await repos().notifications.create({
    audience: role,
    kind,
    params: SAMPLE,
    href: role === "guest" ? "/notifications" : "/manage/notifications",
  });
  refresh();
  return made;
}
