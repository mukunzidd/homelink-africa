import type {
  BookingRepo,
  ExperiencesRepo,
  FxRepo,
  MessagingRepo,
  MobilityRepo,
  OpsRepo,
  Repositories,
  SalesRepo,
  StaysRepo,
  TripRepo,
} from "@/lib/repos/types";
import type { Role } from "@/lib/domain/types";
import { readsAs } from "@/lib/preferences/role";
import { convert } from "@/lib/domain/money";
import {
  ADDON_REQUESTS,
  BOOKINGS,
  CONVERSATIONS,
  EXPERIENCES,
  FX_RATES,
  HOMES_FOR_SALE,
  LISTINGS,
  MESSAGES,
  PAST_BOOKINGS,
  PAYOUTS,
  TRIPS,
  VEHICLES,
  VERIFICATION_QUEUE,
} from "./data";

/**
 * In-memory implementations for Phase 1.
 *
 * Deliberately dumb: filtering happens in plain array operations because the
 * Supabase implementation will push all of it into SQL anyway. What matters
 * here is that the *signatures* are right, not that the filtering is fast.
 */

const stays: StaysRepo = {
  async list(query = {}) {
    let out = [...LISTINGS];

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
    return LISTINGS.find((l) => l.slug === slug) ?? null;
  },

  async byId(id) {
    return LISTINGS.find((l) => l.id === id) ?? null;
  },

  async featured(limit = 3) {
    return [...LISTINGS]
      .sort((a, b) =>
        b.verification.inspectedAt.localeCompare(a.verification.inspectedAt),
      )
      .slice(0, limit);
  },

  async neighbourhoods() {
    return [...new Set(LISTINGS.map((l) => l.neighbourhood))].sort((a, b) =>
      a.localeCompare(b),
    );
  },

  async neighbourhoodsWithCounts() {
    const counts = new Map<string, number>();
    for (const l of LISTINGS) {
      counts.set(l.neighbourhood, (counts.get(l.neighbourhood) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
};

const sales: SalesRepo = {
  async list(query = {}) {
    let out = [...HOMES_FOR_SALE];
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
    return HOMES_FOR_SALE.find((h) => h.slug === slug) ?? null;
  },
  async byId(id) {
    return HOMES_FOR_SALE.find((h) => h.id === id) ?? null;
  },
  async neighbourhoods() {
    return [...new Set(HOMES_FOR_SALE.map((h) => h.neighbourhood))].sort((a, b) => a.localeCompare(b));
  },
};

const mobility: MobilityRepo = {
  async list(query = {}) {
    let out = [...VEHICLES];
    if (query.driveMode) {
      out = out.filter((v) => v.driveModes.includes(query.driveMode!));
    }
    if (query.minSeats !== undefined) {
      out = out.filter((v) => v.seats >= query.minSeats!);
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return VEHICLES.find((v) => v.slug === slug) ?? null;
  },

  async byId(id) {
    return VEHICLES.find((v) => v.id === id) ?? null;
  },
};

const experiences: ExperiencesRepo = {
  async list(query = {}) {
    let out = [...EXPERIENCES];
    if (query.interest) {
      out = out.filter((e) => e.interests.includes(query.interest!));
    }
    if (query.maxDurationHours !== undefined) {
      out = out.filter((e) => e.durationHours <= query.maxDurationHours!);
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return EXPERIENCES.find((e) => e.slug === slug) ?? null;
  },

  async byId(id) {
    return EXPERIENCES.find((e) => e.id === id) ?? null;
  },
};

/** Newest first, so "coming up" and "earlier" both read outward from today. */
const ALL_BOOKINGS = [...BOOKINGS, ...PAST_BOOKINGS].sort((a, b) =>
  b.startDate.localeCompare(a.startDate),
);

const bookings: BookingRepo = {
  async listForCurrentUser() {
    return [...ALL_BOOKINGS];
  },
  async byId(id) {
    return ALL_BOOKINGS.find((b) => b.id === id) ?? null;
  },
  async byReference(reference) {
    // Case-insensitive: the code is printed in caps and will be typed in both.
    const needle = reference.trim().toUpperCase();
    return ALL_BOOKINGS.find((b) => b.reference.toUpperCase() === needle) ?? null;
  },
};

const trips: TripRepo = {
  async listForCurrentUser() {
    return [...TRIPS];
  },
  async byId(id) {
    return TRIPS.find((t) => t.id === id) ?? null;
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
  return MESSAGES.filter(
    (m) => m.conversationId === conversationId && m.authorRole !== reader && !m.readAt,
  ).length;
}

function visibleTo(role: Role) {
  const reader = readsAs(role);
  // Admin runs the homes and the desk both, so it is in every room.
  return (c: (typeof CONVERSATIONS)[number]) =>
    reader === "admin" || c.participantRoles.includes(reader);
}

function forReader(c: (typeof CONVERSATIONS)[number], role: Role) {
  return { ...c, unreadCount: unreadFor(c.id, role) };
}

const messaging: MessagingRepo = {
  async forRole(role) {
    return CONVERSATIONS.filter(visibleTo(role))
      .map((c) => forReader(c, role))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async byId(conversationId, role) {
    const found = CONVERSATIONS.find(
      (c) => c.id === conversationId && visibleTo(role)(c),
    );
    return found ? forReader(found, role) : null;
  },

  async messages(conversationId) {
    return MESSAGES.filter((m) => m.conversationId === conversationId).sort((a, b) =>
      a.sentAt.localeCompare(b.sentAt),
    );
  },

  async forBooking(bookingId, role) {
    const found = CONVERSATIONS.find(
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
    return [...VERIFICATION_QUEUE].sort(
      (a, b) =>
        byState(VERIFY_ORDER, (t: typeof a) => t.status)(a, b) ||
        a.requestedAt.localeCompare(b.requestedAt),
    );
  },
  async addOnRequests() {
    return [...ADDON_REQUESTS].sort(
      (a, b) =>
        byState(REQUEST_ORDER, (r: typeof a) => r.status)(a, b) ||
        a.requestedAt.localeCompare(b.requestedAt),
    );
  },
  async payouts() {
    return [...PAYOUTS].sort(
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

export const fixtureRepositories: Repositories = {
  stays,
  sales,
  mobility,
  experiences,
  bookings,
  trips,
  messaging,
  ops,
  fx,
};
