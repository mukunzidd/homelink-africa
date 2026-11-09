import type {
  AccountSession,
  IdCheck,
  Profile,
  SavedMethod,
  JobOffer,
  StaffMember,
  SiteContent,
  StatementLine,
  HousekeepingTask,
  Partner,
  PartnerDocument,
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
  FX_RATES,
  MESSAGES,
  PAST_BOOKINGS,
  PAYOUTS,
  TRIPS,
  VEHICLES,
  VERIFICATION_QUEUE,
} from "./data";
import { seedNotifications } from "./notifications";
import { seedBlocks, seedPayments, seedPhaseBookings, seedReviews, seedTickets, seedIncidents, seedHistory, seedPartners, seedViewings, seedStatement, seedPendingRefunds, seedStaff, seedPartnerWork } from "./booking-seeds";
import { DEFAULT_CATALOG } from "@/lib/domain/catalog";
import type { SiteSettings } from "@/lib/repos/types";

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
  /** Photos uploaded to a thread, held until (and after) a message uses them. */
  partners: Partner[];
  account: { profile: Profile; methods: SavedMethod[]; sessions: AccountSession[]; idCheck: IdCheck; deleted: boolean };
  jobOffers: JobOffer[];
  staff: StaffMember[];
  settings: SiteSettings;
  content: SiteContent;
  statement: StatementLine[];
  partnerDocs: PartnerDocument[];
  /** Who has each housekeeping task and how far it got, by task id. */
  housekeeping: Record<string, { assignee?: string; status: HousekeepingTask["status"]; note?: string }>;
  uploads: { id: string; conversationId: string; by: Role; mime: string; bytes: Uint8Array; messageId?: string }[];
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
  const phased = [...seedPhaseBookings(fixed.listings, now), ...fixed.bookings];
  const work = seedPartnerWork({ vehicles: fixed.vehicles, experiences: fixed.experiences }, phased, now);
  fixed.payouts = [...fixed.payouts, ...work.payouts];
  fixed.bookings = [...phased, ...work.bookings, ...seedHistory(fixed.listings, [...phased, ...work.bookings], now)].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );
  settleThreads(fixed.conversations, fixed.messages, now);
  return {
    ...fixed,
    notifications: seedNotifications(now),
    ...(() => {
      const payments = seedPayments(fixed.bookings);
      const all = [...payments, ...seedPendingRefunds(fixed.bookings, payments)];
      return { payments: all, statement: seedStatement(all, now) };
    })(),
    blocks: seedBlocks(now),
    viewings: seedViewings(now),
    incidents: seedIncidents(now),
    reviews: seedReviews(),
    tickets: seedTickets(now),
    drafts: [],
    uploads: [],
    housekeeping: {},
    account: {
      profile: { name: "Ange Uwase", email: "ange@example.rw", phone: "+250 788 123 456", twoStep: false },
      methods: [
        { id: "pm_visa", kind: "card", brand: "visa", last4: "4242", expiry: "08/28", isDefault: true },
        { id: "pm_momo", kind: "mobileMoney", provider: "mtn", last4: "3456", isDefault: false },
      ],
      sessions: [
        { id: "ses_here", device: "Chrome on this computer", city: "Kigali", lastActiveAt: now.toISOString(), current: true },
        { id: "ses_phone", device: "Safari on iPhone", city: "Kigali", lastActiveAt: new Date(now.getTime() - 5 * 3_600_000).toISOString(), current: false },
        { id: "ses_tablet", device: "Chrome on Android tablet", city: "Musanze", lastActiveAt: new Date(now.getTime() - 9 * 86_400_000).toISOString(), current: false },
      ],
      idCheck: { status: "none" },
      deleted: false,
    },
    jobOffers: work.offers,
    staff: seedStaff(now),
    settings: { catalog: structuredClone(DEFAULT_CATALOG), fxDisplay: { ...FX_RATES }, bank: { bankName: "Bank of Kigali", accountName: "HomeLink Africa Ltd", accountNumber: "00040-0695781-29", swift: "BKIGRWRW" } },
    content: { announcements: [], featured: [], neighbourhoods: {} },
    ...(({ partners, docs }) => ({ partners, partnerDocs: docs }))(seedPartners(now)),
    prefs: {},
  };
}

/**
 * The fixture threads are written with fixed times, and some of them sit
 * later than the moment the store is seeded. A reply sent now would then
 * land above messages from "tomorrow". When that is so, every thread time
 * moves back by the same amount, so the newest fixture message is 25
 * minutes old and the gaps between them are kept.
 */
function settleThreads(conversations: Conversation[], messages: Message[], now: Date) {
  const newest = Math.max(...messages.map((m) => Date.parse(m.sentAt)), ...conversations.map((c) => Date.parse(c.lastMessageAt)));
  const shift = Math.min(0, now.getTime() - 25 * 60_000 - newest);
  if (!shift) return;
  const move = (iso: string) => new Date(Date.parse(iso) + shift).toISOString();
  for (const m of messages) {
    m.sentAt = move(m.sentAt);
    if (m.readAt) m.readAt = move(m.readAt);
  }
  for (const c of conversations) c.lastMessageAt = move(c.lastMessageAt);
}

const KEY = "__homelinkStore";

/**
 * Bump when the store's shape changes. The store outlives code reloads on
 * purpose, so without this a running dev server would keep serving a store
 * from before a new collection existed, and the first read of it would crash.
 */
const SHAPE = 19;
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
