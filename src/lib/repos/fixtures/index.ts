import type {
  AuditRepo,
  ExperiencesRepo,
  FxRepo,
  MessagingRepo,
  MobilityRepo,
  NotificationsRepo,
  OpsRepo,
  Repositories,
  SalesRepo,
  StaysRepo,
  TripRepo,
} from "@/lib/repos/types";
import type { Conversation, Role } from "@/lib/domain/types";
import { readsAs } from "@/lib/preferences/role";
import { convert } from "@/lib/domain/money";
import { FX_RATES } from "./data";
import { kigaliDay } from "@/lib/domain/instants";
import { nextId, recordAudit, store } from "./store";
import { availability, makeBookings } from "./bookings";
import type { IncidentsRepo, ReviewsRepo, ViewingsRepo } from "@/lib/repos/types";
import type { Review } from "@/lib/domain/types";
import { NOTIFICATION_CATALOG, defaultPrefs } from "@/lib/notifications/catalog";

/**
 * In-memory implementations for Phase 1.
 *
 * Deliberately dumb: filtering happens in plain array operations because the
 * Supabase implementation will push all of it into SQL anyway. What matters
 * here is that the *signatures* are right, not that the filtering is fast.
 */

const stays: StaysRepo = {
  async list(query = {}) {
    let out = [...store().listings];

    if (query.neighbourhood) {
      const needle = query.neighbourhood.trim().toLowerCase();
      // Contains rather than equals: the field is a free-text combobox, so
      // "kacy" and "Kacyiru " both have to find the same place.
      out = out.filter((l) => l.neighbourhood.toLowerCase().includes(needle));
    }
    if (query.minBedrooms !== undefined) {
      out = out.filter((l) => l.bedrooms >= query.minBedrooms!);
    }
    if (query.minSleeps !== undefined) {
      out = out.filter((l) => l.sleeps >= query.minSleeps!);
    }
    if (query.amenities?.length) {
      out = out.filter((l) =>
        query.amenities!.every((a) => l.amenities.includes(a as never)),
      );
    }
    if (query.band === "long") {
      out = out.filter((l) => l.modes.includes("lease"));
    } else {
      out = out.filter((l) => l.modes.includes("nightly"));
    }
    if (query.maxPrice) {
      const ceiling = query.maxPrice;
      const lease = query.band === "long";
      out = out.filter((l) => {
        const rate = lease ? l.monthlyRate : l.nightlyRate;
        return !!rate && rate.minor <= convert(ceiling, rate.currency, FX_RATES).minor;
      });
    }
    // `verifiedOnly` is a no-op today: nothing unverified is ever listed.
    // The filter exists because Phase 3 opens a vetted-marketplace lane.

    const byNewest = (a: (typeof out)[number], b: (typeof out)[number]) =>
      b.verification.inspectedAt.localeCompare(a.verification.inspectedAt);

    switch (query.sort) {
      case "priceAsc":
        out.sort((a, b) => a.nightlyRate.minor - b.nightlyRate.minor);
        break;
      case "priceDesc":
        out.sort((a, b) => b.nightlyRate.minor - a.nightlyRate.minor);
        break;
      case "newest":
        out.sort(byNewest);
        break;
      case "size":
        out.sort((a, b) => b.bedrooms - a.bedrooms);
        break;
      default:
        // "Recommended" is recency of verification until there is behaviour to
        // rank on. Named honestly rather than dressed up as an algorithm.
        out.sort(byNewest);
    }

    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return store().listings.find((l) => l.slug === slug) ?? null;
  },

  async byId(id) {
    return store().listings.find((l) => l.id === id) ?? null;
  },

  async featured(limit = 3) {
    return [...store().listings]
      .sort((a, b) =>
        b.verification.inspectedAt.localeCompare(a.verification.inspectedAt),
      )
      .slice(0, limit);
  },

  async neighbourhoods() {
    return [...new Set(store().listings.map((l) => l.neighbourhood))].sort((a, b) =>
      a.localeCompare(b),
    );
  },

  async neighbourhoodsWithCounts() {
    const counts = new Map<string, number>();
    for (const l of store().listings) {
      counts.set(l.neighbourhood, (counts.get(l.neighbourhood) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
};

const sales: SalesRepo = {
  async list(query = {}) {
    let out = [...store().sales];
    if (query.neighbourhood) {
      const needle = query.neighbourhood.trim().toLowerCase();
      out = out.filter((h) => h.neighbourhood.toLowerCase().includes(needle));
    }
    if (query.minBedrooms !== undefined) out = out.filter((h) => h.bedrooms >= query.minBedrooms!);
    if (query.kind) out = out.filter((h) => h.kind === query.kind);
    if (query.maxPrice) {
      const ceiling = query.maxPrice;
      out = out.filter((h) => h.price.minor <= convert(ceiling, h.price.currency, FX_RATES).minor);
    }
    switch (query.sort) {
      case "priceAsc":
        out.sort((a, b) => a.price.minor - b.price.minor);
        break;
      case "priceDesc":
        out.sort((a, b) => b.price.minor - a.price.minor);
        break;
      case "size":
        out.sort((a, b) => b.floorSqm - a.floorSqm);
        break;
      default:
        // Recommended is newest on the market, named for what it is.
        out.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },
  async bySlug(slug) {
    return store().sales.find((h) => h.slug === slug) ?? null;
  },
  async byId(id) {
    return store().sales.find((h) => h.id === id) ?? null;
  },
  async neighbourhoods() {
    return [...new Set(store().sales.map((h) => h.neighbourhood))].sort((a, b) => a.localeCompare(b));
  },
};

const mobility: MobilityRepo = {
  async list(query = {}) {
    let out = [...store().vehicles];
    if (query.driveMode) {
      out = out.filter((v) => v.driveModes.includes(query.driveMode!));
    }
    if (query.minSeats !== undefined) {
      out = out.filter((v) => v.seats >= query.minSeats!);
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return store().vehicles.find((v) => v.slug === slug) ?? null;
  },

  async byId(id) {
    return store().vehicles.find((v) => v.id === id) ?? null;
  },
};

const experiences: ExperiencesRepo = {
  async list(query = {}) {
    let out = [...store().experiences];
    if (query.interest) {
      out = out.filter((e) => e.interests.includes(query.interest!));
    }
    if (query.maxDurationHours !== undefined) {
      out = out.filter((e) => e.durationHours <= query.maxDurationHours!);
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return store().experiences.find((e) => e.slug === slug) ?? null;
  },

  async byId(id) {
    return store().experiences.find((e) => e.id === id) ?? null;
  },
};

/** Newest first, so "coming up" and "earlier" both read outward from today. */

const trips: TripRepo = {
  async listForCurrentUser() {
    return [...store().trips];
  },
  async byId(id) {
    return store().trips.find((t) => t.id === id) ?? null;
  },
};

/**
 * Unread is a fact about a reader, not about a thread.
 *
 * Your own messages are never unread to you, and a message someone else has
 * already opened is not unread to them. Phase 2 stores read receipts per
 * participant; the fixture approximates it with one `readAt` per message,
 * which is enough to make the state visible on the screen.
 */
function unreadFor(conversationId: string, role: Role): number {
  const reader = readsAs(role);
  return store().messages.filter(
    (m) => m.conversationId === conversationId && m.authorRole !== reader && !m.readAt,
  ).length;
}

function visibleTo(role: Role) {
  const reader = readsAs(role);
  // Admin runs the homes and the desk both, so it is in every room.
  return (c: Conversation) =>
    reader === "admin" || c.participantRoles.includes(reader);
}

function forReader(c: Conversation, role: Role) {
  return { ...c, unreadCount: unreadFor(c.id, role) };
}

const messaging: MessagingRepo = {
  async forRole(role) {
    return store().conversations.filter(visibleTo(role))
      .map((c) => forReader(c, role))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async byId(conversationId, role) {
    const found = store().conversations.find(
      (c) => c.id === conversationId && visibleTo(role)(c),
    );
    return found ? forReader(found, role) : null;
  },

  async messages(conversationId) {
    return store().messages.filter((m) => m.conversationId === conversationId).sort((a, b) =>
      a.sentAt.localeCompare(b.sentAt),
    );
  },

  async forBooking(bookingId, role) {
    const found = store().conversations.find(
      (c) =>
        c.scope.kind === "booking" &&
        c.scope.id === bookingId &&
        visibleTo(role)(c),
    );
    return found ? forReader(found, role) : null;
  },
};

/**
 * Ordered by what still needs doing, then oldest first inside that.
 *
 * Sorting by date alone was tried and looked wrong the moment it was on a
 * screen: the oldest verification task is the one that shipped a week ago, so
 * a queue sorted by age leads with finished work and buries the two rows
 * nobody has touched. Same for payouts, where the March ones that are already
 * paid pushed November's held money off the bottom.
 *
 * Age still decides within a state, because a queue sorted newest-first is a
 * queue whose bottom never gets read.
 */
const VERIFY_ORDER = ["requested", "scheduled", "inspected", "published"];
const PAYOUT_ORDER = ["held", "due", "paid"];
const REQUEST_ORDER = ["open", "quoted", "arranged", "declined"];

function byState<T>(order: string[], stateOf: (item: T) => string) {
  return (a: T, b: T) => order.indexOf(stateOf(a)) - order.indexOf(stateOf(b));
}

const ops: OpsRepo = {
  async verificationQueue() {
    return [...store().verificationQueue].sort(
      (a, b) =>
        byState(VERIFY_ORDER, (t: typeof a) => t.status)(a, b) ||
        a.requestedAt.localeCompare(b.requestedAt),
    );
  },
  async addOnRequests() {
    return [...store().addOnRequests].sort(
      (a, b) =>
        byState(REQUEST_ORDER, (r: typeof a) => r.status)(a, b) ||
        a.requestedAt.localeCompare(b.requestedAt),
    );
  },
  async payouts() {
    return [...store().payouts].sort(
      (a, b) =>
        byState(PAYOUT_ORDER, (p: typeof a) => p.status)(a, b) ||
        // Settled rows read most-recent-first; outstanding ones read soonest.
        (a.status === "paid"
          ? b.releaseOn.localeCompare(a.releaseOn)
          : a.releaseOn.localeCompare(b.releaseOn)),
    );
  },
};

const fx: FxRepo = {
  async rates() {
    return FX_RATES;
  },
  base() {
    return "RWF";
  },
};

const notifications: NotificationsRepo = {
  async forRole(role, filter = {}) {
    return store()
      .notifications.filter(
        (n) =>
          n.audience === role &&
          (!filter.category || n.category === filter.category) &&
          (!filter.unreadOnly || !n.readAt),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async unreadCount(role) {
    return store().notifications.filter((n) => n.audience === role && !n.readAt).length;
  },

  async markRead(role, ids) {
    const at = new Date().toISOString();
    let marked = 0;
    for (const n of store().notifications) {
      // Another role's id is skipped silently: an error would confirm it exists.
      if (n.audience === role && !n.readAt && ids.includes(n.id)) {
        n.readAt = at;
        marked++;
      }
    }
    return marked;
  },

  async markAllRead(role) {
    const ids = store().notifications.filter((n) => n.audience === role && !n.readAt).map((n) => n.id);
    return notifications.markRead(role, ids);
  },

  async create(input) {
    const entry = NOTIFICATION_CATALOG[input.kind];
    if (!entry || !entry.audiences.includes(input.audience)) {
      throw new Error(`${input.kind} is not sent to ${input.audience}`);
    }
    const made = {
      ...input,
      id: nextId("ntf"),
      category: entry.category,
      createdAt: new Date().toISOString(),
    };
    store().notifications.push(made);
    return made;
  },

  async prefs(role) {
    const s = store();
    s.prefs[role] ??= defaultPrefs(role);
    return structuredClone(s.prefs[role]);
  },

  async setPrefs(role, prefs) {
    store().prefs[role] = structuredClone(prefs);
  },
};

const audit: AuditRepo = {
  async record(entry) {
    return recordAudit(entry);
  },
  async list(filter = {}) {
    return store()
      .audit.filter(
        (e) =>
          (!filter.actor || e.actor === filter.actor) &&
          (!filter.action || e.action.startsWith(filter.action)) &&
          (!filter.from || e.at >= filter.from) &&
          (!filter.to || e.at <= filter.to),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  },
};

const bookings = makeBookings(notifications);

const incidents: IncidentsRepo = {
  async forBooking(bookingId) {
    return store().incidents.filter((i) => i.bookingId === bookingId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async all() {
    return [...store().incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async create(input) {
    const b = store().bookings.find((x) => x.id === input.bookingId);
    if (!b) throw new Error("No such booking");
    const made = {
      ...input,
      description: input.description.slice(0, 1000),
      id: nextId("inc"),
      status: "open" as const,
      createdAt: new Date().toISOString(),
    };
    store().incidents.push(made);
    b.timeline = [...(b.timeline ?? []), { at: made.createdAt, kind: "issueReported", actor: "guest", note: input.category }];
    for (const audience of ["ops", "admin"] as const) {
      await notifications.create({
        audience,
        kind: "newIncident",
        params: { name: b.title, category: input.category },
        href: "/manage/incidents",
      });
    }
    return made;
  },
  async update(id, patch) {
    const i = store().incidents.find((x) => x.id === id);
    if (!i) throw new Error(`No incident ${id}`);
    Object.assign(i, patch);
    return i;
  },
};

const ASPECTS = ["cleanliness", "accuracy", "checkIn", "communication", "location", "value"] as const;

const reviews: ReviewsRepo = {
  async forSupply(supplyId) {
    return store().reviews.filter((r) => r.supplyId === supplyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async forBooking(bookingId) {
    return store().reviews.find((r) => r.bookingId === bookingId) ?? null;
  },
  async create({ bookingId, ratings, text }) {
    const b = store().bookings.find((x) => x.id === bookingId);
    if (!b) throw new Error("No such booking");
    if (b.endDate >= kigaliDay() || b.status === "cancelled") throw new Error("Reviews open once it is over");
    if (store().reviews.some((r) => r.bookingId === bookingId)) throw new Error("Already reviewed");
    const clean = Object.fromEntries(
      ASPECTS.map((a) => [a, Math.min(5, Math.max(1, Math.round(Number(ratings[a]) || 0)))]),
    ) as Review["ratings"];
    const made: Review = {
      id: nextId("rev"),
      bookingId,
      supplyId: b.supplyItemId,
      ratings: clean,
      text: text.trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
      guestFirstName: (b.guest?.name ?? "Guest").split(/\s+/)[0],
    };
    store().reviews.push(made);
    b.timeline = [...(b.timeline ?? []), { at: made.createdAt, kind: "reviewed", actor: "guest" }];
    return made;
  },
};

const viewings: ViewingsRepo = {
  async create(v) {
    const made = { ...v, id: nextId("vwg"), status: "requested" as const, createdAt: new Date().toISOString() };
    store().viewings.push(made);
    return made;
  },
  async forCurrentUser() {
    return [...store().viewings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  },
  async all() {
    return viewings.forCurrentUser();
  },
  async taken(saleId) {
    return store()
      .viewings.filter((v) => v.saleId === saleId && v.status !== "cancelled")
      .map((v) => ({ date: v.date, time: v.time }));
  },
  async setStatus(id, status, move) {
    const v = store().viewings.find((x) => x.id === id);
    if (!v) throw new Error(`No viewing ${id}`);
    v.status = status;
    if (move) Object.assign(v, move);
    return v;
  },
};

export const fixtureRepositories: Repositories = {
  stays,
  sales,
  mobility,
  experiences,
  bookings,
  availability,
  viewings,
  incidents,
  reviews,
  trips,
  messaging,
  ops,
  notifications,
  audit,
  fx,
};
