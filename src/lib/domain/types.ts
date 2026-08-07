import type { CurrencyCode, Money } from "./money";

/**
 * Domain entities, mirroring Technical Plan §4 and Product & UX §3.
 *
 * These shapes are the contract between the UI and the data layer. In Phase 1
 * they are satisfied by fixtures; in Phase 2 by Supabase rows. The UI must not
 * move when that swap happens, so nothing here leaks storage concerns.
 */

/* ---------------------------------------------------------------- identity */

export type Role =
  | "visitor"
  | "guest"
  | "host"
  | "driver"
  | "guide"
  | "ops"
  | "admin";

export type User = {
  id: string;
  displayName: string;
  roles: Role[];
  /** Present once identity checks pass. Gates payouts, never browsing. */
  kycVerifiedAt?: string;
};

/* ------------------------------------------------------------ verification */

/**
 * The evidence behind the badge. Product & UX §7: the guarantee is delivered
 * by people and enforced by software, so the record names a real inspector.
 */
export type VerificationRecord = {
  id: string;
  inspectorName: string;
  /** ISO date. Rendered through the request locale, never pre-formatted. */
  inspectedAt: string;
  checklistPoints: number;
  photographedByHomeLink: boolean;
  ownerIdentityConfirmed: boolean;
  notes?: string;
};

/* ------------------------------------------------------------------- stays */

export type StayMode = "nightly" | "lease";

export type DurationBand = "short" | "medium" | "long";

export type Amenity =
  | "backupPower"
  | "fibre"
  | "furnished"
  | "parking"
  | "water"
  | "security"
  | "garden"
  | "workspace";

export type Listing = {
  id: string;
  slug: string;
  name: string;
  neighbourhood: string;
  city: string;
  bedrooms: number;
  sleeps: number;
  amenities: Amenity[];
  /** Authoritative price, in the currency the supplier is actually paid in. */
  nightlyRate: Money;
  monthlyRate?: Money;
  modes: StayMode[];
  verification: VerificationRecord;
  /** Photo treatment is deferred; these are colour seeds for the shell. */
  imageSeed: string;
  summary: string;
  /** Remaining units for the shown dates. Honest scarcity only. */
  unitsAvailable: number;
};

/* ---------------------------------------------------------------- mobility */

export type VehicleClass = "compact" | "saloon" | "suv" | "minibus";
export type DriveMode = "selfDrive" | "withDriver";

export type Vehicle = {
  id: string;
  slug: string;
  name: string;
  vehicleClass: VehicleClass;
  seats: number;
  transmission: "manual" | "automatic";
  driveModes: DriveMode[];
  dailyRate: Money;
  withDriverSupplement?: Money;
  verification: VerificationRecord;
  imageSeed: string;
  summary: string;
  unitsAvailable: number;
};

/* ------------------------------------------------------------- experiences */

export type ExperienceInterest =
  | "wildlife"
  | "culture"
  | "city"
  | "hiking"
  | "lake"
  | "food";

export type Experience = {
  id: string;
  slug: string;
  name: string;
  interests: ExperienceInterest[];
  durationHours: number;
  minAge: number;
  groupMax: number;
  pricePerPerson: Money;
  guideName: string;
  verification: VerificationRecord;
  imageSeed: string;
  summary: string;
  meetingPoint: string;
};

/* -------------------------------------------------------- booking and trip */

export type ServiceKind = "stay" | "car" | "experience";

export type BookingStatus =
  | "draft"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled";

/**
 * The atomic unit. A booking stands alone — a local renting an apartment never
 * sees a Trip. Product & UX Principle 2.
 */
export type Booking = {
  id: string;
  reference: string;
  service: ServiceKind;
  /** Points at a Listing, Vehicle, or Experience by id. */
  supplyItemId: string;
  title: string;
  startDate: string;
  endDate: string;
  party: number;
  total: Money;
  status: BookingStatus;
  /** High-value stays hold funds until check-in is confirmed. */
  escrowHeld: boolean;
  stayMode?: StayMode;
};

export type TripStatus = "draft" | "booked" | "active" | "completed";

/** OPTIONAL grouping. Appears only when the intent is to compose a journey. */
export type Trip = {
  id: string;
  name: string;
  displayCurrency: CurrencyCode;
  status: TripStatus;
  bookingIds: string[];
};

/* -------------------------------------------------------------- messaging */

export type Conversation = {
  id: string;
  subject: string;
  /** Scoped to a booking or a trip; never free-floating. */
  scope: { kind: "booking" | "trip"; id: string };
  participantNames: string[];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type Message = {
  id: string;
  conversationId: string;
  authorName: string;
  authorRole: Role;
  body: string;
  sentAt: string;
  readAt?: string;
};

/* ------------------------------------------------------------ localization */

/** Product & UX §4: signals set defaults, the user can always override. */
export type Segment = "abroad" | "rwanda";

export type SegmentDefaults = {
  currency: CurrencyCode;
  rail: "card" | "mobileMoney";
  tripPromptsOn: boolean;
};
