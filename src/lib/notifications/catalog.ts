import type { Channel, NotificationCategory, NotificationKind, NotificationPrefs, Role } from "@/lib/domain/types";

/**
 * Every event the product tells someone about: its category, who may
 * receive it, and the channels it goes out on unless the person changes it.
 *
 * Audiences are a whitelist. `create` refuses a kind for a role not listed
 * here, which is what stops a guest ever being told about an incident in
 * somebody else's flat.
 */
export const NOTIFICATION_CATALOG: Record<
  NotificationKind,
  { category: NotificationCategory; audiences: Role[]; defaultChannels: Channel[] }
> = {
  bookingConfirmed: { category: "booking", audiences: ["guest"], defaultChannels: ["inApp", "email", "whatsapp"] },
  paymentReceived: { category: "payment", audiences: ["guest"], defaultChannels: ["inApp", "email"] },
  paymentFailed: { category: "payment", audiences: ["guest", "ops", "admin"], defaultChannels: ["inApp", "email", "sms"] },
  momoPending: { category: "payment", audiences: ["guest"], defaultChannels: ["inApp", "sms"] },
  checkInReady: { category: "stay", audiences: ["guest"], defaultChannels: ["inApp", "email", "whatsapp"] },
  rentDue: { category: "payment", audiences: ["guest"], defaultChannels: ["inApp", "email", "sms"] },
  newMessage: { category: "message", audiences: ["guest", "ops", "admin", "driver", "guide"], defaultChannels: ["inApp", "push"] },
  reviewRequest: { category: "booking", audiences: ["guest"], defaultChannels: ["inApp", "email"] },
  viewingConfirmed: { category: "booking", audiences: ["guest"], defaultChannels: ["inApp", "email", "whatsapp"] },
  viewingChanged: { category: "booking", audiences: ["guest"], defaultChannels: ["inApp", "email", "whatsapp"] },
  newBooking: { category: "booking", audiences: ["ops", "admin"], defaultChannels: ["inApp"] },
  bookingCancelled: { category: "booking", audiences: ["ops", "admin"], defaultChannels: ["inApp"] },
  arrivalToday: { category: "stay", audiences: ["ops", "admin"], defaultChannels: ["inApp", "email"] },
  newAsk: { category: "work", audiences: ["ops", "admin"], defaultChannels: ["inApp", "push"] },
  newIncident: { category: "stay", audiences: ["ops", "admin"], defaultChannels: ["inApp", "push", "sms"] },
  inspectionDue: { category: "work", audiences: ["ops", "admin"], defaultChannels: ["inApp", "email"] },
  jobOffered: { category: "work", audiences: ["driver", "guide"], defaultChannels: ["inApp", "push", "sms"] },
  jobChanged: { category: "work", audiences: ["driver", "guide"], defaultChannels: ["inApp", "push", "sms"] },
  jobAccepted: { category: "work", audiences: ["ops", "admin"], defaultChannels: ["inApp"] },
  payoutSent: { category: "payment", audiences: ["driver", "guide"], defaultChannels: ["inApp", "sms"] },
  documentExpiring: { category: "system", audiences: ["driver", "guide", "admin"], defaultChannels: ["inApp", "email"] },
};

/** In-app cannot be switched off for these: each needs the person to act. */
export const ALWAYS_IN_APP: NotificationKind[] = ["paymentFailed", "momoPending", "checkInReady"];

export function kindsFor(role: Role): NotificationKind[] {
  return (Object.keys(NOTIFICATION_CATALOG) as NotificationKind[]).filter((k) =>
    NOTIFICATION_CATALOG[k].audiences.includes(role),
  );
}

export function defaultPrefs(role: Role): NotificationPrefs {
  return {
    channels: Object.fromEntries(kindsFor(role).map((k) => [k, [...NOTIFICATION_CATALOG[k].defaultChannels]])),
    quietHours: { from: "22:00", to: "07:00" },
  };
}
