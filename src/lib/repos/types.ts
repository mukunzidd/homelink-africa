import type {
  AddOnRequest,
  AppNotification,
  AuditEntry,
  Block,
  BookingEvent,
  BookingStatus,
  PaymentRecord,
  PaymentRail,
  ServiceKind,
  Viewing,
  Incident,
  MaintenanceTicket,
  ListingDraft,
  Review,
  NotificationCategory,
  NotificationPrefs,
  Booking,
  Conversation,
  DriveMode,
  DurationBand,
  Experience,
  ExperienceInterest,
  HomeForSale,
  Listing,
  Message,
  Payout,
  Role,
  Trip,
  Vehicle,
  VerificationTask,
} from "@/lib/domain/types";
import type { CurrencyCode, FxTable, Money } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import type { BookingDraft } from "@/lib/booking/draft";

/**
 * The seam between the UI and its data.
 *
 * Phase 1 satisfies these with in-memory fixtures. Phase 2 adds a Supabase
 * implementation of the same interfaces and flips one factory. No screen
 * imports a fixture directly, and no screen knows where data comes from —
 * that is the whole point of this file.
 *
 * Everything returns a Promise even though fixtures are synchronous, so the
 * async shape of the call sites is already correct when the network arrives.
 */

export type StaySort =
  | "recommended"
  | "priceAsc"
  | "priceDesc"
  | "newest"
  | "size";

export type StayQuery = {
  neighbourhood?: string;
  minBedrooms?: number;
  /** Party size. A place that cannot sleep everyone is not a result. */
  minSleeps?: number;
  amenities?: string[];
  band?: DurationBand;
  /**
   * A ceiling in whatever currency the guest typed it in. Compared against the
   * nightly rate, or the monthly one in the lease lane, after converting the
   * ceiling into the listing's own currency, never the other way round: the
   * listing's price is the authoritative number.
   */
  maxPrice?: Money;
  verifiedOnly?: boolean;
  sort?: StaySort;
  limit?: number;
};

/**
 * Supply is reachable by id as well as by slug.
 *
 * A URL knows a slug; a booking row knows an id, because that is what a
 * foreign key will hold in Phase 2. Every screen that shows what a booking is
 * *of* — trips, inventory, the ops queue, a message thread header — starts
 * from the id, so the lookup belongs here rather than in four page files.
 */
export interface SupplyById<T> {
  byId(id: string): Promise<T | null>;
}

export interface StaysRepo extends SupplyById<Listing> {
  list(query?: StayQuery): Promise<Listing[]>;
  bySlug(slug: string): Promise<Listing | null>;
  featured(limit?: number): Promise<Listing[]>;
  /** Distinct neighbourhoods with live inventory, for the search field. */
  neighbourhoods(): Promise<string[]>;
  /** Same, with counts — a suggestion that says how much is behind it is
   *  more useful than a bare name, and honest about thin inventory. */
  neighbourhoodsWithCounts(): Promise<{ name: string; count: number }[]>;
}

export type SaleSort = "recommended" | "priceAsc" | "priceDesc" | "newest" | "size";

export type SaleQuery = {
  neighbourhood?: string;
  minBedrooms?: number;
  /** A ceiling in any currency, converted into the home's own before comparing. */
  maxPrice?: Money;
  kind?: HomeForSale["kind"];
  sort?: SaleSort;
  limit?: number;
};

/**
 * Homes for sale. A separate door from stays: nothing here is booked, the
 * guest asks the Kigali team instead, and a sale's facts (price, floor area,
 * plot, title) are not a stay's.
 */
export interface SalesRepo extends SupplyById<HomeForSale> {
  list(query?: SaleQuery): Promise<HomeForSale[]>;
  bySlug(slug: string): Promise<HomeForSale | null>;
  neighbourhoods(): Promise<string[]>;
}

export type VehicleQuery = {
  driveMode?: DriveMode;
  minSeats?: number;
  limit?: number;
};

export interface MobilityRepo extends SupplyById<Vehicle> {
  list(query?: VehicleQuery): Promise<Vehicle[]>;
  bySlug(slug: string): Promise<Vehicle | null>;
}

export type ExperienceQuery = {
  interest?: ExperienceInterest;
  maxDurationHours?: number;
  limit?: number;
};

export interface ExperiencesRepo extends SupplyById<Experience> {
  list(query?: ExperienceQuery): Promise<Experience[]>;
  bySlug(slug: string): Promise<Experience | null>;
}

export type PlaceBookingInput = {
  draft: BookingDraft;
  /** What the browser showed. Compared, never stored. */
  clientTotal: Money;
  payment: { rail: PaymentRail; outcome: "approved" };
};

export type PlaceResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: "unavailable" | "invalid" | "priceChanged"; quote?: Quote };

export type BookingListQuery = {
  status?: BookingStatus[];
  service?: ServiceKind;
  from?: string;
  to?: string;
  /** Matches a reference, the guest's name or email, or the title. */
  q?: string;
};

export interface AvailabilityRepo {
  /** Blocked days (maintenance, owner use) in [from, to). */
  blocked(supplyId: string, from: string, to: string): Promise<Block[]>;
  /** Nights (stays) or days (cars) in [from, to) with no unit left. */
  bookedNights(supplyId: string, from: string, to: string): Promise<string[]>;
  /**
   * Whether this can be booked: every night free for a stay, every day of a
   * hire, enough seats left on a day out. `exceptBookingId` leaves out a
   * booking being moved, so it does not collide with itself.
   */
  isFree(supplyId: string, from: string, to: string, opts?: { party?: number; exceptBookingId?: string }): Promise<boolean>;
  block(supplyId: string, dates: string[], reason: Block["reason"]): Promise<void>;
  unblock(supplyId: string, dates: string[]): Promise<void>;
}

export interface BookingRepo {
  listForCurrentUser(): Promise<Booking[]>;
  listAll(query?: BookingListQuery): Promise<Booking[]>;
  /**
   * Price on the server, check every step, check the dates are free, then
   * store. A total that differs from the server's by more than one minor
   * unit stores nothing and returns the new quote, so the guest sees a new
   * price before paying it.
   */
  place(input: PlaceBookingInput): Promise<PlaceResult>;
  /** The policy's refund, or with `goodwill` (admin) everything paid that is not yet refunded. */
  cancel(reference: string, by: Role, reason: string, today: string, opts?: { goodwill?: boolean }): Promise<Booking>;
  /** Part of what was paid back, with a reason. Never more than is left, never in another currency. */
  refund(reference: string, by: Role, amount: Money, reason: string): Promise<{ ok: true } | { ok: false; reason: "tooMuch" | "invalid" }>;
  changeDates(
    reference: string,
    start: string,
    end: string,
    today: string,
    by?: Role,
  ): Promise<{ ok: true; booking: Booking; difference: Money } | { ok: false; reason: "unavailable" | "invalid" }>;
  addEvent(reference: string, event: Omit<BookingEvent, "at">): Promise<Booking>;
  payments(bookingId?: string): Promise<PaymentRecord[]>;
  /** More people on a stay; refused above what the home sleeps. Price is per night, not per head. */
  addGuests(reference: string, party: number): Promise<Booking>;
  submitOnlineCheckIn(reference: string, adults: { name: string; idFileName: string }[]): Promise<Booking>;
  /** Pays the next unpaid month of a long-term stay. */
  payRent(reference: string, rail: PaymentRail): Promise<PaymentRecord>;
  /** The desk records the guest inside: escrow is released and the guest is told. */
  checkIn(reference: string, by: Role): Promise<Booking>;
  checkOut(reference: string, by: Role): Promise<Booking>;
  addNote(reference: string, by: Role, text: string): Promise<Booking>;
  byId(id: string): Promise<Booking | null>;
  /**
   * By the code the guest actually holds.
   *
   * A reference is the only identifier that leaves the system — it is on the
   * email, it is what someone reads down a phone line to Kigali, and it is
   * what they will paste into a URL. An id is ours; a reference is theirs.
   */
  byReference(reference: string): Promise<Booking | null>;
}

export type PlaceTripInput = {
  drafts: BookingDraft[];
  /** The browser's trip total, in RWF. Compared, never stored. */
  clientTotal: Money;
  payment: { rail: PaymentRail; outcome: "approved" };
  /** Bookings already paid before the trip, to group into it. */
  bookedReferences: string[];
};

export interface TripRepo {
  listForCurrentUser(): Promise<Trip[]>;
  byId(id: string): Promise<Trip | null>;
  /** All parts or none: every part is checked before any is written. */
  place(input: PlaceTripInput): Promise<
    | { ok: true; trip: Trip; bookings: Booking[] }
    | { ok: false; failed: { index: number; reason: "unavailable" | "invalid" | "priceChanged" }[] }
  >;
}

export interface MessagingRepo {
  /**
   * Every thread this role is actually in, newest first.
   *
   * There is no unscoped "list all conversations" because there is no screen
   * that should have one. Ops sees everything by being in everything, not by
   * asking for a list without a viewer — which is the call that quietly turns
   * into a leak the first time a real user table exists.
   *
   * `unreadCount` comes back computed for this role, not read from a stored
   * counter: unread is a fact about a reader, and two people looking at the
   * same thread do not have the same one.
   */
  forRole(role: Role): Promise<Conversation[]>;
  byId(conversationId: string, role: Role): Promise<Conversation | null>;
  messages(conversationId: string): Promise<Message[]>;
  /** A booking can carry several threads; this returns the one `role` is in. */
  forBooking(bookingId: string, role: Role): Promise<Conversation | null>;
}

/**
 * The concierge team's own reads.
 *
 * Separate from the guest-facing repos rather than folded into them: these
 * three lists have no per-user scoping at all, and the first time that is true
 * of something is the moment to give it its own door rather than an optional
 * flag on a door everyone uses.
 */
export interface OpsRepo {
  verificationQueue(): Promise<VerificationTask[]>;
  addOnRequests(): Promise<AddOnRequest[]>;
  payouts(): Promise<Payout[]>;
  /** The people an ask, an inspection or an incident can be given to. */
  team(): Promise<string[]>;
  updateAsk(id: string, by: Role, patch: { owner?: string; status?: "arranged" | "declined" | "open" }): Promise<AddOnRequest>;
  /** Prices an ask and says so to the guest in the booking's thread (opening one if there is none). */
  quoteAsk(id: string, by: Role, price: Money, note: string): Promise<AddOnRequest>;
  scheduleInspection(id: string, by: Role, date: string, inspector: string, today: string): Promise<{ ok: true } | { ok: false; reason: "invalid" }>;
  recordInspection(id: string, by: Role, checklist: Record<string, boolean>, notes: string): Promise<VerificationTask>;
  /** A new candidate leaves a draft listing for admin; a re-inspection just closes. */
  publishInspection(id: string, by: Role): Promise<{ ok: true; draftId?: string } | { ok: false; reason: "notInspected" }>;
  drafts(): Promise<ListingDraft[]>;
}

export interface FxRepo {
  /** Display-only rates. Settlement rates are recorded per transaction. */
  rates(): Promise<FxTable>;
  base(): CurrencyCode;
}

/**
 * What happened that someone should hear about, per role.
 *
 * Every call takes the reader's role and only ever touches that role's
 * rows: marking another role's id read is a silent no-op, not an error that
 * would confirm the id exists.
 */
export interface NotificationsRepo {
  forRole(
    role: Role,
    filter?: { category?: NotificationCategory; unreadOnly?: boolean },
  ): Promise<AppNotification[]>;
  unreadCount(role: Role): Promise<number>;
  /** Returns how many were marked. */
  markRead(role: Role, ids: string[]): Promise<number>;
  markAllRead(role: Role): Promise<number>;
  /** Fills in id, createdAt and category; refuses an audience the catalog does not list. */
  create(input: Omit<AppNotification, "id" | "createdAt" | "readAt" | "category">): Promise<AppNotification>;
  prefs(role: Role): Promise<NotificationPrefs>;
  setPrefs(role: Role, prefs: NotificationPrefs): Promise<void>;
}

/** Who did what. Written by every staff action, read by the admin audit log. */
export interface AuditRepo {
  record(entry: Omit<AuditEntry, "id" | "at">): Promise<AuditEntry>;
  list(filter?: { actor?: Role; action?: string; from?: string; to?: string }): Promise<AuditEntry[]>;
}

export interface ViewingsRepo {
  create(v: Omit<Viewing, "id" | "status" | "createdAt">): Promise<Viewing>;
  forCurrentUser(): Promise<Viewing[]>;
  all(): Promise<Viewing[]>;
  /** Slots already taken for one home, so nobody is offered them. */
  taken(saleId: string): Promise<{ date: string; time: string }[]>;
  setStatus(id: string, status: Viewing["status"], move?: { date: string; time: string }): Promise<Viewing>;
}

export interface IncidentsRepo {
  forBooking(bookingId: string): Promise<Incident[]>;
  all(): Promise<Incident[]>;
  /** Files it, notes it on the booking's timeline, and tells both desks. */
  create(i: Omit<Incident, "id" | "status" | "createdAt">): Promise<Incident>;
  update(id: string, patch: Partial<Pick<Incident, "status" | "assignee">>): Promise<Incident>;
  /** A repair for the home the stay is in; the same ticket if asked twice; null for cars and days out. */
  toTicket(id: string, by: Role): Promise<MaintenanceTicket | null>;
}

export interface ReviewsRepo {
  forSupply(supplyId: string): Promise<Review[]>;
  forBooking(bookingId: string): Promise<Review | null>;
  /** One per booking, and only once the stay, hire or day is over. */
  create(r: Pick<Review, "bookingId" | "ratings" | "text">): Promise<Review>;
}

export interface WorkRepo {
  tickets(filter?: { listingId?: string; status?: MaintenanceTicket["status"][] }): Promise<MaintenanceTicket[]>;
  createTicket(t: Omit<MaintenanceTicket, "id" | "createdAt" | "status">): Promise<MaintenanceTicket>;
  updateTicket(id: string, patch: Partial<Omit<MaintenanceTicket, "id" | "createdAt">>): Promise<MaintenanceTicket>;
}

export type Repositories = {
  stays: StaysRepo;
  sales: SalesRepo;
  mobility: MobilityRepo;
  experiences: ExperiencesRepo;
  bookings: BookingRepo;
  availability: AvailabilityRepo;
  viewings: ViewingsRepo;
  incidents: IncidentsRepo;
  reviews: ReviewsRepo;
  work: WorkRepo;
  trips: TripRepo;
  messaging: MessagingRepo;
  ops: OpsRepo;
  notifications: NotificationsRepo;
  audit: AuditRepo;
  fx: FxRepo;
};
