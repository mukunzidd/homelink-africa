import type { ExtraSelection } from "./extras";
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

export type GeoPoint = { lat: number; lng: number };

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

export type LeaseIncluded = "water" | "security" | "internet" | "garden";

export type LeaseTerms = {
  /** Months of rent held as a deposit, returned at the end of the lease. */
  depositMonths: number;
  /** Paid by the owner, not on top of the rent. */
  includes: LeaseIncluded[];
  /** ISO date the home is free from. */
  availableFrom: string;
};

export type Listing = {
  id: string;
  slug: string;
  name: string;
  neighbourhood: string;
  city: string;
  /**
   * The middle of the street, not the door. A guest sees the area before they
   * book and the address after; anything finer than ~150m would give the
   * second away with the first.
   */
  location: GeoPoint;
  bedrooms: number;
  sleeps: number;
  amenities: Amenity[];
  /** Authoritative price, in the currency the supplier is actually paid in. */
  nightlyRate: Money;
  monthlyRate?: Money;
  /** What a tenant agrees to, for places offered on a lease. */
  leaseTerms?: LeaseTerms;
  modes: StayMode[];
  verification: VerificationRecord;
  /**
   * HomeLink hosts every home itself; this is the person on the team who
   * looks after this one. Named on the page, because "the host" is otherwise
   * a company, and a company does not pick up at eleven at night.
   */
  propertyManager: { name: string; since: string };
  /** Accepted at checkout. Plain sentences, in the order a guest needs them. */
  houseRules: string[];
  /** Colour seed, used when no photograph exists yet. */
  imageSeed: string;
  /** Photographs, first is the hero. Empty until our team has shot the place. */
  images?: string[];
  summary: string;
  /** Remaining units for the shown dates. Honest scarcity only. */
  unitsAvailable: number;
};

/* -------------------------------------------------------------------- sale */

/**
 * A house or apartment for sale.
 *
 * Its own type rather than a third `StayMode`, because almost nothing about a
 * sale matches a stay: there is no night, no quote, no check-in, no escrow on
 * the booking path. What a buyer needs instead is the price, the floor and
 * plot area, and evidence that the seller owns what they are selling.
 */
export type HomeForSale = {
  id: string;
  slug: string;
  name: string;
  neighbourhood: string;
  city: string;
  location: GeoPoint;
  bedrooms: number;
  bathrooms: number;
  /** Built area, square metres. */
  floorSqm: number;
  /** Plot, square metres. Absent for an apartment. */
  plotSqm?: number;
  kind: "house" | "apartment" | "townhouse";
  price: Money;
  amenities: Amenity[];
  verification: VerificationRecord;
  /** The title was checked against the land registry, not taken from the seller. */
  titleChecked: boolean;
  imageSeed: string;
  images?: string[];
  summary: string;
  /** ISO date the home came on the market. */
  listedAt: string;
  yearBuilt: number;
  /**
   * The land registry's Unique Parcel Identifier. Shown masked on the page:
   * enough to show it exists and was checked, not enough to look up the owner
   * before a viewing.
   */
  upi: string;
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
  /** Accepted at checkout, like a home's house rules. */
  rules: string[];
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
  /** Local time the day starts, from the guest's door in Kigali. */
  departs: string;
  /** Hours on the road from Kigali, one way. A walk in the city is a quarter. */
  driveHours: number;
  /** Start times a guest can pick, "HH:MM" Kigali. Absent means `departs` only. */
  slots?: string[];
  /** Accepted at checkout, like a home's house rules. */
  rules: string[];
  /** A park permit is bought in each person's name: passports needed, never refunded. */
  requiresPermit?: boolean;
  permitShare?: Money;
  /** Where the day happens, for the map of Rwanda on the list. */
  location: GeoPoint;
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

  /*
   * Everything below arrives with the full booking flow and is optional, so
   * the older fixtures still describe themselves without it.
   */
  guest?: GuestDetails;
  extras?: ExtraSelection[];
  promoCode?: string;
  paymentPlan?: "full" | "deposit";
  /** The server's quote lines at the moment of booking. */
  lines?: import("./pricing").QuoteLine[];
  timeline?: BookingEvent[];
  tripId?: string;
  driveMode?: DriveMode;
  pickup?: { kind: "airport" | "hotel" | "address"; detail: string; flight?: string };
  participants?: Participant[];
  slot?: string;
  dietary?: string;
  application?: RentApplication;
  checkedInAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  refund?: Money;
  staffNotes?: { at: string; by: Role; text: string }[];
};

export type PaymentRecord = {
  id: string;
  bookingId: string;
  rail: PaymentRail;
  kind: "full" | "deposit" | "balance" | "rent" | "change" | "refund";
  amount: Money;
  status: "pending" | "succeeded" | "failed" | "refunded";
  /** ISO instant. */
  at: string;
};

export type BookingEventKind =
  | "placed" | "paid" | "datesChanged" | "guestsAdded" | "checkInReleased" | "checkedIn"
  | "checkedOut" | "cancelled" | "refunded" | "reviewed" | "issueReported" | "noteAdded";

export type BookingEvent = { at: string; kind: BookingEventKind; actor: Role; note?: string };

/** A night or day a home or car cannot be booked, for a reason other than a booking. */
export type Block = { supplyId: string; date: string; reason: "maintenance" | "owner" };

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

/* ------------------------------------------------------------------- audit */

/**
 * Who did what, to which thing, and when. Every write a member of staff
 * makes records one, and the admin audit log reads them back.
 */
export type AuditEntry = {
  id: string;
  /** ISO instant. */
  at: string;
  actor: Role;
  /** Dotted verb, e.g. "booking.cancel", "listing.update". */
  action: string;
  /** The id or reference of the thing acted on. */
  target: string;
  detail?: string;
};

/* ----------------------------------------------------------- notifications */

export type NotificationCategory = "booking" | "payment" | "message" | "stay" | "work" | "system";

export type NotificationKind =
  | "bookingConfirmed" | "paymentReceived" | "paymentFailed" | "momoPending" | "checkInReady"
  | "rentDue" | "newMessage" | "reviewRequest" | "viewingConfirmed"
  | "newBooking" | "arrivalToday" | "newAsk" | "newIncident" | "inspectionDue"
  | "jobOffered" | "jobChanged" | "payoutSent" | "documentExpiring";

export type Channel = "inApp" | "email" | "sms" | "whatsapp" | "push";

/**
 * Something that happened that a person should hear about.
 *
 * Addressed to a role, because there are no user accounts yet; Phase 2
 * addresses it to a user. `params` are already formatted for reading (an
 * amount is "RWF 165,000", not minor units), since a notification states
 * what was true when it was sent, not what a converter says today.
 */
export type AppNotification = {
  id: string;
  audience: Role;
  kind: NotificationKind;
  category: NotificationCategory;
  params: Record<string, string | number>;
  href: string;
  /** ISO instant. */
  createdAt: string;
  readAt?: string;
};

export type NotificationPrefs = {
  channels: Partial<Record<NotificationKind, Channel[]>>;
  /** Kigali times, "HH:MM". Null when off. */
  quietHours: { from: string; to: string } | null;
};

export type { ExtraKey, ExtraSelection } from "./extras";

/* ----------------------------------------------------------- booking flow */

export type GuestDetails = {
  name: string;
  email: string;
  phone: string;
  /** Booking for someone else; then `travellerName` is required. */
  forSomeoneElse?: boolean;
  travellerName?: string;
  /** "HH:MM", Kigali time. */
  arrivalTime?: string;
  purpose?: "work" | "leisure";
  requests?: string;
};

export type Participant = { name: string; age: number; nationality?: string; passport?: string };

export type RentApplication = {
  occupants: number;
  employer: string;
  incomeBand: "under500k" | "500kTo1m" | "1mTo2m" | "over2m";
  idFileName?: string;
  moveIn: string;
  months: number;
};

export type PaymentRail = "card" | "mobileMoney" | "bankTransfer";
