import type {
  Booking,
  Conversation,
  DriveMode,
  DurationBand,
  Experience,
  ExperienceInterest,
  Listing,
  Message,
  Role,
  Trip,
  Vehicle,
} from "@/lib/domain/types";
import type { CurrencyCode, FxTable } from "@/lib/domain/money";

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

export interface BookingRepo {
  listForCurrentUser(): Promise<Booking[]>;
  byId(id: string): Promise<Booking | null>;
}

export interface TripRepo {
  listForCurrentUser(): Promise<Trip[]>;
  byId(id: string): Promise<Trip | null>;
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

export interface FxRepo {
  /** Display-only rates. Settlement rates are recorded per transaction. */
  rates(): Promise<FxTable>;
  base(): CurrencyCode;
}

export type Repositories = {
  stays: StaysRepo;
  mobility: MobilityRepo;
  experiences: ExperiencesRepo;
  bookings: BookingRepo;
  trips: TripRepo;
  messaging: MessagingRepo;
  fx: FxRepo;
};
