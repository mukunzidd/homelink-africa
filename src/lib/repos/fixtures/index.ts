import type {
  BookingRepo,
  ExperiencesRepo,
  FxRepo,
  MessagingRepo,
  MobilityRepo,
  Repositories,
  StaysRepo,
  TripRepo,
} from "@/lib/repos/types";
import {
  BOOKINGS,
  CONVERSATIONS,
  EXPERIENCES,
  FX_RATES,
  LISTINGS,
  MESSAGES,
  TRIPS,
  VEHICLES,
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
};

const bookings: BookingRepo = {
  async listForCurrentUser() {
    return [...BOOKINGS];
  },
  async byId(id) {
    return BOOKINGS.find((b) => b.id === id) ?? null;
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

const messaging: MessagingRepo = {
  async conversations() {
    return [...CONVERSATIONS].sort((a, b) =>
      b.lastMessageAt.localeCompare(a.lastMessageAt),
    );
  },
  async messages(conversationId) {
    return MESSAGES.filter((m) => m.conversationId === conversationId).sort((a, b) =>
      a.sentAt.localeCompare(b.sentAt),
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
  mobility,
  experiences,
  bookings,
  trips,
  messaging,
  fx,
};
