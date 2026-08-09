import type {
  Booking,
  Conversation,
  DriveMode,
  DurationBand,
  Experience,
  ExperienceInterest,
  Listing,
  Message,
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
  conversations(): Promise<Conversation[]>;
  messages(conversationId: string): Promise<Message[]>;
  /** Threads are scoped, never free-floating, so a booking has at most one. */
  forBooking(bookingId: string): Promise<Conversation | null>;
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
