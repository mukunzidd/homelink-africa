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
  /** Colour seed, used when no photograph exists yet. */
  imageSeed: string;
  /** Photographs, first is the hero. Empty until our team has shot the place. */
  images?: string[];
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
  images?: string[];
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
  images?: string[];
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

/* -------------------------------------------------------------- ops queue */

/**
 * The work behind the badge. Product & UX §7: the guarantee is delivered by
 * people and enforced by software, and these three types are the people half.
 *
 * They are deliberately not fields on `Listing`. A listing exists once it is
 * verified; before that there is only a candidate somebody rang us about, and
 * modelling that as a half-populated listing is how an unverified property
 * ends up one boolean away from being live.
 */
export type VerificationTaskKind = "new" | "reinspection";

export type VerificationTaskStatus =
  | "requested"
  | "scheduled"
  | "inspected"
  | "published";

export type VerificationTask = {
  id: string;
  kind: VerificationTaskKind;
  service: ServiceKind;
  /** What the thing calls itself. Not a slug: nothing is published yet. */
  name: string;
  where: string;
  requestedAt: string;
  scheduledFor?: string;
  inspectorName?: string;
  status: VerificationTaskStatus;
  /** Why this one is not simply moving through. Usually the whole story. */
  note?: string;
};

/**
 * What a guest asked a human for.
 *
 * The confirmation and trips screens deliberately offer a person rather than a
 * second checkout, so every one of those offers lands here as a job. If this
 * list is long, the product has found something it should be selling itself.
 */
export type AddOnRequestStatus = "open" | "quoted" | "arranged" | "declined";

export type AddOnRequest = {
  id: string;
  bookingId: string;
  /** In the guest's words. Paraphrasing it into a category loses the job. */
  asked: string;
  requestedAt: string;
  status: AddOnRequestStatus;
  owner?: string;
};

/** Money out to supply. Mirrors the escrow state a guest sees, from behind. */
export type PayoutStatus = "held" | "due" | "paid";

export type Payout = {
  id: string;
  bookingId: string;
  payee: string;
  amount: Money;
  status: PayoutStatus;
  /** When it leaves, or left. Held payouts wait on a confirmed check-in. */
  releaseOn: string;
};

/* -------------------------------------------------------------- messaging */

export type Conversation = {
  id: string;
  subject: string;
  /** Scoped to a booking or a trip; never free-floating. */
  scope: { kind: "booking" | "trip"; id: string };
  participantNames: string[];
  /**
   * Who is in the room, by role.
   *
   * A booking can carry more than one thread and they are not the same
   * conversation: the guest talks to the concierge about arrival, and the
   * concierge talks to the host about the generator. Names alone cannot
   * express that, and a host must never open the guest's thread.
   */
  participantRoles: Role[];
  lastMessagePreview: string;
  lastMessageAt: string;
  /** From the point of view of whoever asked. Computed per role, not stored. */
  unreadCount: number;
};

/**
 * A photograph in a thread.
 *
 * Not decoration on this product. The concierge model means the person who saw
 * the thing and the person who paid for it are never in the same room, so a
 * photograph in a message is how a claim gets settled: the tank is full, the
 * car is in bay 12, this is the crack that was already there. Modelling it as
 * an attachment rather than a URL in the body is what lets it be laid out,
 * counted, and eventually scanned for location data before it is stored.
 */
export type Attachment = {
  id: string;
  url: string;
  /** Always written by hand. An unlabelled photograph is unreadable to
   *  anyone using a screen reader, and these carry evidence. */
  alt: string;
};

export type Message = {
  id: string;
  conversationId: string;
  authorName: string;
  authorRole: Role;
  /** May be empty when the photograph is the whole message. */
  body: string;
  attachments?: Attachment[];
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
