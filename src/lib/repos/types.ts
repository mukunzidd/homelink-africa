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

export type StayQuery = {
  neighbourhood?: string;
  minBedrooms?: number;
  amenities?: string[];
  band?: DurationBand;
  verifiedOnly?: boolean;
  limit?: number;
};

export interface StaysRepo {
  list(query?: StayQuery): Promise<Listing[]>;
  bySlug(slug: string): Promise<Listing | null>;
  featured(limit?: number): Promise<Listing[]>;
}

export type VehicleQuery = {
  driveMode?: DriveMode;
  minSeats?: number;
  limit?: number;
};

export interface MobilityRepo {
  list(query?: VehicleQuery): Promise<Vehicle[]>;
  bySlug(slug: string): Promise<Vehicle | null>;
}

export type ExperienceQuery = {
  interest?: ExperienceInterest;
  maxDurationHours?: number;
  limit?: number;
};

export interface ExperiencesRepo {
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
