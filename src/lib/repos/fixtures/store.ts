import type {
  AddOnRequest,
  AppNotification,
  AuditEntry,
  Block,
  Booking,
  Conversation,
  Experience,
  HomeForSale,
  Listing,
  Message,
  NotificationPrefs,
  PaymentRecord,
  Payout,
  Role,
  Trip,
  Vehicle,
  Viewing,
  Incident,
  Review,
  MaintenanceTicket,
  ListingDraft,
  VerificationTask,
} from "@/lib/domain/types";
import {
  ADDON_REQUESTS,
  BOOKINGS,
  CONVERSATIONS,
  EXPERIENCES,
  HOMES_FOR_SALE,
  LISTINGS,
  MESSAGES,
  PAST_BOOKINGS,
  PAYOUTS,
  TRIPS,
  VEHICLES,
  VERIFICATION_QUEUE,
} from "./data";
import { seedNotifications } from "./notifications";
import { seedBlocks, seedPayments, seedPhaseBookings, seedReviews, seedTickets, seedIncidents } from "./booking-seeds";

/**
 * The fixtures, as data that can change.
 *
 * Until this pass nothing wrote: every screen read constants. Booking,
 * cancelling, marking a notification read and editing a listing all need a
 * place to put the result where the next request, and another person's
 * screen, can see it. An ops board has to show the booking a guest made a
 * minute ago, which neither the URL nor the guest's localStorage can do.
 *
 * So the constants in `data.ts` become a seed, deep-copied once into this
 * store, and the repos read and write the copy. Writes survive navigation
 * and reset when the server restarts. Phase 2 replaces this file with
 * Supabase behind the same repo types, and no screen changes.
 *
 * Kept on `globalThis` rather than in module state: the dev server
 * re-evaluates modules on every edit, which would wipe a session's bookings
 * each time a file is saved.
 */

export type FixtureStore = {
  listings: Listing[];
  sales: HomeForSale[];
  vehicles: Vehicle[];
  experiences: Experience[];
  /** Upcoming and past together, newest start first. */
  bookings: Booking[];
  trips: Trip[];
  payouts: Payout[];
  conversations: Conversation[];
  messages: Message[];
  addOnRequests: AddOnRequest[];
  verificationQueue: VerificationTask[];
  notifications: AppNotification[];
  payments: PaymentRecord[];
  blocks: Block[];
  viewings: Viewing[];
  incidents: Incident[];
  reviews: Review[];
  tickets: MaintenanceTicket[];
  drafts: ListingDraft[];
  /** Filled lazily from the catalog's defaults the first time a role asks. */
  prefs: Partial<Record<Role, NotificationPrefs>>;
  audit: AuditEntry[];
  /** Per-prefix counters for `nextId`. */
  ids: Record<string, number>;
};

function seed(): FixtureStore {
  const fixed = structuredClone({
    listings: LISTINGS,
    sales: HOMES_FOR_SALE,
    vehicles: VEHICLES,
    experiences: EXPERIENCES,
    bookings: [...BOOKINGS, ...PAST_BOOKINGS].sort((a, b) => b.startDate.localeCompare(a.startDate)),
    trips: TRIPS,
    payouts: PAYOUTS,
    conversations: CONVERSATIONS,
    messages: MESSAGES,
    addOnRequests: ADDON_REQUESTS,
    verificationQueue: VERIFICATION_QUEUE,
    audit: [],
    ids: {},
  });
  const now = new Date();
  // Bookings in every phase a guest's booking page has, dated from today.
  fixed.bookings = [...seedPhaseBookings(fixed.listings, now), ...fixed.bookings].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );
  return {
    ...fixed,
    notifications: seedNotifications(now),
    payments: seedPayments(fixed.bookings),
    blocks: seedBlocks(now),
    viewings: [],
    incidents: seedIncidents(now),
    reviews: seedReviews(),
    tickets: seedTickets(now),
    drafts: [],
    prefs: {},
  };
}

const KEY = "__homelinkStore";

/**
 * Bump when the store's shape changes. The store outlives code reloads on
 * purpose, so without this a running dev server would keep serving a store
 * from before a new collection existed, and the first read of it would crash.
 */
const SHAPE = 9;
type Holder = { [KEY]?: { shape: number; data: FixtureStore } };

export function store(): FixtureStore {
  const g = globalThis as Holder;
  if (g[KEY]?.shape !== SHAPE) g[KEY] = { shape: SHAPE, data: seed() };
  return g[KEY].data;
}

/** Back to the seed. Tests only; nothing in the app calls it. */
export function resetStore(): void {
  (globalThis as Holder)[KEY] = { shape: SHAPE, data: seed() };
}

/** "bk_1001", "bk_1002", ... Starts above any id a fixture uses. */
export function nextId(prefix: string): string {
  const s = store();
  s.ids[prefix] = (s.ids[prefix] ?? 1000) + 1;
  return `${prefix}_${s.ids[prefix]}`;
}

export function recordAudit(entry: Omit<AuditEntry, "id" | "at">): AuditEntry {
  const full: AuditEntry = { id: nextId("aud"), at: new Date().toISOString(), ...entry };
  store().audit.push(full);
  return full;
}
