import type { AppNotification, NotificationKind, Role } from "@/lib/domain/types";
import { NOTIFICATION_CATALOG } from "@/lib/notifications/catalog";

/**
 * Notifications a session starts with, dated relative to the moment the
 * store is seeded so a panel is never empty and never months stale. They
 * name the real fixture bookings, so following one lands on a real page.
 */
type Seed = [Role, NotificationKind, number, Record<string, string | number>, string, boolean?];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const SEEDS: Seed[] = [
  // guest
  ["guest", "checkInReady", 25 * MIN, { name: "Garden apartment with hill view", date: "14 Nov" }, "/bookings/HL-4KQ2-8M"],
  ["guest", "newMessage", 2 * HOUR, { from: "Aline M.", subject: "Late arrival on the 14th" }, "/messages"],
  ["guest", "paymentReceived", 5 * HOUR, { amount: "RWF 241,250", ref: "HL-7XB1-2P" }, "/bookings/HL-7XB1-2P", true],
  ["guest", "bookingConfirmed", 1 * DAY + 3 * HOUR, { name: "Toyota RAV4", ref: "HL-7XB1-2P" }, "/bookings/HL-7XB1-2P", true],
  ["guest", "momoPending", 1 * DAY + 3 * HOUR + 4 * MIN, { amount: "RWF 241,250" }, "/bookings/HL-7XB1-2P", true],
  ["guest", "bookingConfirmed", 4 * DAY, { name: "Kigali on foot", ref: "HL-9DL5-4T" }, "/bookings/HL-9DL5-4T", true],
  ["guest", "reviewRequest", 6 * DAY, { name: "Studio by the convention centre" }, "/trips", true],
  ["guest", "paymentFailed", 9 * DAY, { amount: "USD 383.72", ref: "HL-4KQ2-8M" }, "/bookings/HL-4KQ2-8M", true],
  ["guest", "viewingConfirmed", 12 * DAY, { name: "Four-bedroom house in Gacuriro", date: "Sat 16 Nov, 10:00" }, "/buy", true],

  // ops
  ["ops", "newAsk", 12 * MIN, { guest: "Claire D.", ask: "Can someone meet us at the airport at 23:40?" }, "/manage/asks"],
  ["ops", "arrivalToday", 3 * HOUR, { count: 2 }, "/manage/today"],
  ["ops", "newBooking", 6 * HOUR, { guest: "Claire D.", name: "Kigali on foot", ref: "HL-9DL5-4T" }, "/manage/bookings"],
  ["ops", "newMessage", 1 * DAY + 2 * HOUR, { from: "Eric H.", subject: "RAV4 handover, bay 12" }, "/manage/inbox", true],
  ["ops", "paymentFailed", 1 * DAY + 5 * HOUR, { amount: "USD 383.72", ref: "HL-4KQ2-8M" }, "/manage/bookings", true],
  ["ops", "inspectionDue", 3 * DAY, { name: "Hilltop house in Rebero", date: "30 Nov" }, "/manage/inspections", true],
  ["ops", "newIncident", 5 * DAY, { name: "Kiyovu city flat", category: "Power" }, "/manage/incidents", true],

  // admin
  ["admin", "newBooking", 40 * MIN, { guest: "Claire D.", name: "Kigali on foot", ref: "HL-9DL5-4T" }, "/manage/bookings"],
  ["admin", "newIncident", 4 * HOUR, { name: "Kiyovu city flat", category: "Power" }, "/manage/incidents"],
  ["admin", "documentExpiring", 1 * DAY + 1 * HOUR, { doc: "Eric H.'s driving licence", date: "2 Dec" }, "/manage/partners"],
  ["admin", "newMessage", 1 * DAY + 6 * HOUR, { from: "Aline M.", subject: "Generator and keys, 14 November" }, "/manage/inbox", true],
  ["admin", "paymentFailed", 2 * DAY, { amount: "USD 383.72", ref: "HL-4KQ2-8M" }, "/manage/finance", true],
  ["admin", "inspectionDue", 3 * DAY, { name: "Hilltop house in Rebero", date: "30 Nov" }, "/manage/inspections", true],
  ["admin", "arrivalToday", 7 * DAY, { count: 3 }, "/manage/today", true],

  // driver
  ["driver", "jobOffered", 18 * MIN, { what: "Airport pickup, KGL", date: "14 Nov, 23:40" }, "/manage/jobs"],
  ["driver", "newMessage", 2 * HOUR, { from: "Aline M.", subject: "RAV4 handover, bay 12" }, "/manage/inbox"],
  ["driver", "jobChanged", 1 * DAY, { what: "Toyota RAV4 hire", date: "14 Nov" }, "/manage/jobs", true],
  ["driver", "payoutSent", 3 * DAY, { amount: "RWF 157,096" }, "/manage/earnings", true],
  ["driver", "documentExpiring", 4 * DAY, { doc: "Your driving licence", date: "2 Dec" }, "/manage/documents", true],
  ["driver", "jobOffered", 8 * DAY, { what: "Day hire with driver", date: "20 Nov" }, "/manage/jobs", true],

  // guide
  ["guide", "jobOffered", 50 * MIN, { what: "Kigali on foot, 2 people", date: "15 Nov, 09:00" }, "/manage/jobs"],
  ["guide", "newMessage", 5 * HOUR, { from: "Aline M.", subject: "Meeting point for the walk" }, "/manage/inbox"],
  ["guide", "jobChanged", 1 * DAY + 2 * HOUR, { what: "Kigali on foot", date: "15 Nov" }, "/manage/jobs", true],
  ["guide", "payoutSent", 2 * DAY, { amount: "RWF 81,257" }, "/manage/earnings", true],
  ["guide", "documentExpiring", 6 * DAY, { doc: "Your guide certificate", date: "20 Dec" }, "/manage/documents", true],
  ["guide", "jobOffered", 10 * DAY, { what: "Nyungwe canopy walk, 4 people", date: "22 Nov" }, "/manage/jobs", true],
];

export function seedNotifications(now: Date): AppNotification[] {
  return SEEDS.map(([audience, kind, ago, params, href, read], i) => {
    const createdAt = new Date(now.getTime() - ago).toISOString();
    return {
      id: `ntf_${String(i + 1).padStart(3, "0")}`,
      audience,
      kind,
      category: NOTIFICATION_CATALOG[kind].category,
      params,
      href,
      createdAt,
      ...(read ? { readAt: createdAt } : {}),
    };
  });
}
