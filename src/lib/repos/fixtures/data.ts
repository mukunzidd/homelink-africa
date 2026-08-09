import type {
  AddOnRequest,
  Booking,
  Conversation,
  Experience,
  Listing,
  Message,
  Payout,
  Trip,
  Vehicle,
  VerificationRecord,
  VerificationTask,
} from "@/lib/domain/types";
import { money } from "@/lib/domain/money";

/**
 * Phase 1 fixture data.
 *
 * Shapes match the domain types exactly, so the Supabase implementation in
 * Phase 2 is a swap rather than a rewrite. Prices are stored in the currency
 * the supplier is actually paid in — RWF for local supply — and converted for
 * display. RWF amounts are whole francs because RWF has no minor unit.
 */

function verification(
  id: string,
  inspectorName: string,
  inspectedAt: string,
  checklistPoints = 34,
): VerificationRecord {
  return {
    id,
    inspectorName,
    inspectedAt,
    checklistPoints,
    photographedByHomeLink: true,
    ownerIdentityConfirmed: true,
  };
}

export const LISTINGS: Listing[] = [
  {
    id: "lst_kacyiru_garden",
    slug: "kacyiru-garden-apartment",
    name: "Garden apartment with hill view",
    neighbourhood: "Kacyiru",
    city: "Kigali",
    bedrooms: 2,
    sleeps: 4,
    amenities: ["backupPower", "fibre", "furnished", "parking", "garden"],
    nightlyRate: money(165_000, "RWF"),
    monthlyRate: money(2_900_000, "RWF"),
    modes: ["nightly", "lease"],
    verification: verification("ver_001", "Jean-Claude U.", "2026-10-12"),
    imageSeed: "kacyiru",
    images: ["/images/listings/interior-1.jpg", "/images/listings/interior-2.jpg", "/images/listings/interior-3.jpg", "/images/listings/interior-4.jpg", "/images/listings/interior-5.jpg"],
    summary:
      "Quiet street five minutes from the ministries, with a walled garden and a generator that actually starts.",
    unitsAvailable: 3,
  },
  {
    id: "lst_kimihurura_townhouse",
    slug: "kimihurura-townhouse",
    name: "Kimihurura townhouse",
    neighbourhood: "Kimihurura",
    city: "Kigali",
    bedrooms: 3,
    sleeps: 6,
    amenities: ["backupPower", "fibre", "furnished", "parking", "security"],
    nightlyRate: money(219_000, "RWF"),
    monthlyRate: money(3_800_000, "RWF"),
    modes: ["nightly", "lease"],
    verification: verification("ver_002", "Aline M.", "2026-10-03"),
    imageSeed: "kimihurura",
    images: ["/images/listings/interior-3.jpg", "/images/listings/interior-6.jpg", "/images/listings/interior-7.jpg", "/images/listings/interior-8.jpg", "/images/listings/interior-1.jpg"],
    summary:
      "Three floors, a roof terrace facing the valley, and walking distance to the restaurants on KG 5.",
    unitsAvailable: 2,
  },
  {
    id: "lst_nyarutarama_villa",
    slug: "nyarutarama-lake-villa",
    name: "Villa near the lake",
    neighbourhood: "Nyarutarama",
    city: "Kigali",
    bedrooms: 4,
    sleeps: 8,
    amenities: ["backupPower", "fibre", "furnished", "parking", "garden", "security"],
    nightlyRate: money(340_000, "RWF"),
    monthlyRate: money(5_600_000, "RWF"),
    modes: ["nightly", "lease"],
    verification: verification("ver_003", "Jean-Claude U.", "2026-09-28", 41),
    imageSeed: "nyarutarama",
    images: ["/images/listings/interior-5.jpg", "/images/listings/interior-8.jpg", "/images/listings/interior-6.jpg", "/images/listings/interior-2.jpg", "/images/listings/interior-7.jpg"],
    summary:
      "Built for a family that entertains: a long kitchen, a lawn, and a gate that opens onto the golf course road.",
    unitsAvailable: 1,
  },
  {
    id: "lst_remera_studio",
    slug: "remera-studio",
    name: "Bright studio near the stadium",
    neighbourhood: "Remera",
    city: "Kigali",
    bedrooms: 1,
    sleeps: 2,
    amenities: ["fibre", "furnished", "water"],
    nightlyRate: money(62_000, "RWF"),
    monthlyRate: money(950_000, "RWF"),
    modes: ["nightly", "lease"],
    verification: verification("ver_004", "Aline M.", "2026-10-19"),
    imageSeed: "remera",
    images: ["/images/listings/interior-2.jpg", "/images/listings/interior-1.jpg", "/images/listings/interior-4.jpg", "/images/listings/interior-3.jpg", "/images/listings/interior-6.jpg"],
    summary:
      "Small, clean, and close to the bus lines. The obvious first place for someone arriving to work in Kigali.",
    unitsAvailable: 5,
  },
  {
    id: "lst_kiyovu_apartment",
    slug: "kiyovu-city-apartment",
    name: "City apartment in Kiyovu",
    neighbourhood: "Kiyovu",
    city: "Kigali",
    bedrooms: 2,
    sleeps: 4,
    amenities: ["backupPower", "fibre", "furnished", "workspace", "security"],
    nightlyRate: money(198_000, "RWF"),
    monthlyRate: money(3_200_000, "RWF"),
    modes: ["nightly", "lease"],
    verification: verification("ver_005", "Patrick N.", "2026-10-22"),
    imageSeed: "kiyovu",
    images: ["/images/listings/interior-7.jpg", "/images/listings/interior-4.jpg", "/images/listings/interior-8.jpg", "/images/listings/interior-5.jpg", "/images/listings/interior-2.jpg"],
    summary:
      "A desk by the window with real fibre behind it, in the quietest pocket of the city centre.",
    unitsAvailable: 2,
  },
  {
    id: "lst_gikondo_family",
    slug: "gikondo-family-house",
    name: "Family house with a yard",
    neighbourhood: "Gikondo",
    city: "Kigali",
    bedrooms: 3,
    sleeps: 6,
    amenities: ["parking", "water", "garden", "furnished"],
    nightlyRate: money(128_000, "RWF"),
    monthlyRate: money(1_950_000, "RWF"),
    modes: ["nightly", "lease"],
    verification: verification("ver_006", "Patrick N.", "2026-10-08"),
    imageSeed: "gikondo",
    images: ["/images/listings/interior-6.jpg", "/images/listings/interior-5.jpg", "/images/listings/interior-1.jpg", "/images/listings/interior-7.jpg", "/images/listings/interior-3.jpg"],
    summary:
      "Older build, well kept, with the kind of yard children actually use. Long-term lease preferred.",
    unitsAvailable: 4,
  },
];

export const VEHICLES: Vehicle[] = [
  {
    id: "veh_rav4",
    slug: "toyota-rav4",
    name: "Toyota RAV4",
    vehicleClass: "suv",
    seats: 5,
    transmission: "automatic",
    driveModes: ["selfDrive", "withDriver"],
    dailyRate: money(58_000, "RWF"),
    withDriverSupplement: money(25_000, "RWF"),
    verification: verification("ver_v01", "Eric H.", "2026-10-15", 22),
    imageSeed: "rav4",
    images: [
      "/images/cars/rav4-1.jpg",
      "/images/cars/rav4-2.jpg",
      "/images/cars/rav4-3.jpg",
      "/images/cars/rav4-4.jpg",
      "/images/cars/rav4-5.jpg",
    ],
    summary:
      "The default Rwandan hire car for a reason. Handles the hills and the unpaved stretches without drama.",
    unitsAvailable: 6,
  },
  {
    id: "veh_landcruiser",
    slug: "toyota-land-cruiser",
    name: "Toyota Land Cruiser",
    vehicleClass: "suv",
    seats: 7,
    transmission: "manual",
    driveModes: ["withDriver"],
    dailyRate: money(145_000, "RWF"),
    withDriverSupplement: money(0, "RWF"),
    verification: verification("ver_v02", "Eric H.", "2026-10-11", 22),
    imageSeed: "landcruiser",
    images: [
      "/images/cars/landcruiser-1.jpg",
      "/images/cars/landcruiser-2.jpg",
      "/images/cars/landcruiser-3.jpg",
      "/images/cars/landcruiser-4.jpg",
      "/images/cars/landcruiser-5.jpg",
    ],
    summary:
      "For the parks. Comes with a driver who has done the Nyungwe and Akagera roads many times.",
    unitsAvailable: 2,
  },
  {
    id: "veh_corolla",
    slug: "toyota-corolla",
    name: "Toyota Corolla",
    vehicleClass: "saloon",
    seats: 5,
    transmission: "automatic",
    driveModes: ["selfDrive", "withDriver"],
    dailyRate: money(38_000, "RWF"),
    withDriverSupplement: money(25_000, "RWF"),
    verification: verification("ver_v03", "Eric H.", "2026-10-18", 22),
    imageSeed: "corolla",
    images: [
      "/images/cars/corolla-1.jpg",
      "/images/cars/corolla-2.jpg",
      "/images/cars/corolla-3.jpg",
      "/images/cars/corolla-4.jpg",
      "/images/cars/corolla-5.jpg",
    ],
    summary: "City car. Cheap to run, easy to park, fine on any tarmac road in the country.",
    unitsAvailable: 8,
  },
  {
    id: "veh_hiace",
    slug: "toyota-hiace",
    name: "Toyota HiAce",
    vehicleClass: "minibus",
    seats: 12,
    transmission: "manual",
    driveModes: ["withDriver"],
    dailyRate: money(120_000, "RWF"),
    withDriverSupplement: money(0, "RWF"),
    verification: verification("ver_v04", "Eric H.", "2026-09-30", 22),
    imageSeed: "hiace",
    images: [
      "/images/cars/hiace-1.jpg",
      "/images/cars/hiace-2.jpg",
      "/images/cars/hiace-3.jpg",
      "/images/cars/hiace-4.jpg",
      "/images/cars/hiace-5.jpg",
    ],
    summary: "Group transport with a driver. The usual choice for a family arriving together.",
    unitsAvailable: 3,
  },
];

export const EXPERIENCES: Experience[] = [
  {
    id: "exp_gorillas",
    slug: "volcanoes-gorilla-trek",
    name: "Gorilla trek in Volcanoes National Park",
    interests: ["wildlife", "hiking"],
    durationHours: 10,
    minAge: 15,
    groupMax: 8,
    // USD 1,500.00 — the park permit is priced in dollars, not francs.
    pricePerPerson: money(150_000, "USD"),
    guideName: "Emmanuel R.",
    verification: verification("ver_e01", "Aline M.", "2026-09-14", 18),
    imageSeed: "gorillas",
    images: [
      "/images/experiences/gorillas-1.jpg",
      "/images/experiences/gorillas-2.jpg",
      "/images/experiences/gorillas-3.jpg",
      "/images/experiences/gorillas-4.jpg",
      "/images/experiences/gorillas-5.jpg",
    ],
    summary:
      "A full day at altitude with a park-licensed tracker. Permits handled by us, transport from Kigali included.",
    meetingPoint: "Kinigi park headquarters",
  },
  {
    id: "exp_kigali_walk",
    slug: "kigali-city-walk",
    name: "Kigali on foot",
    interests: ["city", "culture", "food"],
    durationHours: 4,
    minAge: 8,
    groupMax: 12,
    pricePerPerson: money(45_000, "RWF"),
    guideName: "Solange K.",
    verification: verification("ver_e02", "Patrick N.", "2026-10-06", 18),
    imageSeed: "kigaliwalk",
    images: [
      "/images/experiences/kigali-1.jpg",
      "/images/experiences/kigali-2.jpg",
      "/images/experiences/kigali-3.jpg",
      "/images/experiences/kigali-4.jpg",
      "/images/experiences/kigali-5.jpg",
    ],
    summary:
      "Nyamirambo, the markets, and lunch cooked by a women's cooperative. The city as people actually live it.",
    meetingPoint: "Nyamirambo Women's Centre",
  },
  {
    id: "exp_kivu",
    slug: "lake-kivu-day",
    name: "A day on Lake Kivu",
    interests: ["lake", "food"],
    durationHours: 8,
    minAge: 5,
    groupMax: 10,
    pricePerPerson: money(85_000, "RWF"),
    guideName: "Didier B.",
    verification: verification("ver_e03", "Aline M.", "2026-10-01", 18),
    imageSeed: "kivu",
    images: [
      "/images/experiences/kivu-1.jpg",
      "/images/experiences/kivu-2.jpg",
      "/images/experiences/kivu-3.jpg",
      "/images/experiences/kivu-4.jpg",
      "/images/experiences/kivu-5.jpg",
    ],
    summary: "Boat out to the islands, swimming where it is safe, and fish grilled on the shore.",
    meetingPoint: "Rubavu public beach",
  },
  {
    id: "exp_nyungwe",
    slug: "nyungwe-canopy-walk",
    name: "Nyungwe canopy walk",
    interests: ["wildlife", "hiking"],
    durationHours: 12,
    minAge: 12,
    groupMax: 10,
    pricePerPerson: money(120_000, "RWF"),
    guideName: "Emmanuel R.",
    verification: verification("ver_e04", "Patrick N.", "2026-09-22", 18),
    imageSeed: "nyungwe",
    images: [
      "/images/experiences/nyungwe-1.jpg",
      "/images/experiences/nyungwe-2.jpg",
      "/images/experiences/nyungwe-3.jpg",
      "/images/experiences/nyungwe-4.jpg",
      "/images/experiences/nyungwe-5.jpg",
    ],
    summary: "The suspended bridge above the rainforest, plus a chance at the colobus troops on the way in.",
    meetingPoint: "Nyungwe reception centre",
  },
];

export const BOOKINGS: Booking[] = [
  {
    id: "bkg_001",
    reference: "HL-4KQ2-8M",
    service: "stay",
    supplyItemId: "lst_kacyiru_garden",
    title: "Garden apartment with hill view",
    startDate: "2026-11-14",
    endDate: "2026-11-17",
    party: 2,
    total: money(495_000, "RWF"),
    status: "confirmed",
    escrowHeld: true,
    stayMode: "nightly",
  },
  {
    id: "bkg_002",
    reference: "HL-7XB1-2P",
    service: "car",
    supplyItemId: "veh_rav4",
    title: "Toyota RAV4, self-drive",
    startDate: "2026-11-14",
    endDate: "2026-11-17",
    party: 2,
    total: money(174_000, "RWF"),
    status: "confirmed",
    escrowHeld: false,
  },
  {
    id: "bkg_003",
    reference: "HL-9DL5-4T",
    service: "experience",
    supplyItemId: "exp_kigali_walk",
    title: "Kigali on foot",
    startDate: "2026-11-15",
    endDate: "2026-11-15",
    party: 2,
    total: money(90_000, "RWF"),
    status: "confirmed",
    escrowHeld: false,
  },
];

/*
 * A history, because a dashboard with nothing behind it is a screen nobody has
 * really looked at. These three are deliberately awkward: one stay that ran and
 * released, one day out booked on its own with no trip around it, and one
 * cancelled hire. A list that only ever shows tidy confirmed rows hides every
 * state the layout actually has to survive.
 */
export const PAST_BOOKINGS: Booking[] = [
  {
    id: "bkg_004",
    reference: "HL-2RN8-6C",
    service: "stay",
    supplyItemId: "lst_remera_studio",
    title: "Bright studio near the stadium",
    startDate: "2026-03-02",
    endDate: "2026-03-09",
    party: 1,
    total: money(434_000, "RWF"),
    status: "completed",
    escrowHeld: false,
    stayMode: "nightly",
  },
  {
    id: "bkg_005",
    reference: "HL-6TS3-9J",
    service: "experience",
    supplyItemId: "exp_kivu",
    title: "A day on Lake Kivu",
    startDate: "2026-03-07",
    endDate: "2026-03-07",
    party: 2,
    total: money(170_000, "RWF"),
    status: "completed",
    escrowHeld: false,
  },
  {
    id: "bkg_006",
    reference: "HL-8WM4-1F",
    service: "car",
    supplyItemId: "veh_corolla",
    title: "Toyota Corolla, self-drive",
    startDate: "2026-05-18",
    endDate: "2026-05-21",
    party: 2,
    total: money(114_000, "RWF"),
    status: "cancelled",
    escrowHeld: false,
  },
];

export const TRIPS: Trip[] = [
  {
    id: "trp_001",
    name: "Kigali, November",
    displayCurrency: "USD",
    status: "booked",
    bookingIds: ["bkg_001", "bkg_002", "bkg_003"],
  },
  /*
   * Deliberately covers only two of the three March-to-May bookings. Trips are
   * an optional grouping (Product & UX Principle 2), and the cancelled hire
   * sits outside any of them — which is the case that catches a dashboard
   * written as "render the trips" rather than "render the bookings".
   */
  {
    id: "trp_002",
    name: "Lake Kivu, March",
    displayCurrency: "RWF",
    status: "completed",
    bookingIds: ["bkg_004", "bkg_005"],
  },
];

/*
 * Threads, scoped and role-aware.
 *
 * A booking carries more than one of these and they are different rooms. The
 * guest asks the concierge about a late arrival; the concierge asks the host
 * whether the generator is fuelled. Both are about the same night in the same
 * flat, and neither participant should see the other conversation.
 *
 * Note who is *not* in the guest's threads: the owner of the flat. That is the
 * product working as designed — the guest's counterparty is HomeLink, and the
 * concierge carries the message across. The two places a supplier does talk to
 * a guest directly are the driver and the guide, because both physically meet
 * them.
 */
/*
 * The queue behind the badge.
 *
 * Written so the four states are all present at once, because a queue where
 * everything is in the same state teaches nothing about the layout. Notes
 * carry the reason a row is stuck; in a real ops tool that sentence is the
 * most-read text on the screen and the one a template always leaves out.
 */
export const VERIFICATION_QUEUE: VerificationTask[] = [
  {
    id: "vt_001",
    kind: "new",
    service: "stay",
    name: "Two-bedroom in Gacuriro",
    where: "Gacuriro, Kigali",
    requestedAt: "2026-08-03",
    scheduledFor: "2026-08-14",
    inspectorName: "Aline M.",
    status: "scheduled",
    note: "Owner has three units in the block and is offering one. Confirm which door on the day.",
  },
  {
    id: "vt_002",
    kind: "new",
    service: "car",
    name: "Toyota Prado, 2019",
    where: "Kicukiro, Kigali",
    requestedAt: "2026-08-05",
    status: "requested",
    note: "Operator wants it listed for self-drive. No inspection booked until the insurance certificate arrives.",
  },
  {
    id: "vt_003",
    kind: "new",
    service: "experience",
    name: "Coffee farm morning, Huye",
    where: "Huye",
    requestedAt: "2026-07-28",
    inspectorName: "Patrick N.",
    status: "inspected",
    note: "Ran it on 6 August. Worth listing, but the transfer from Kigali is three hours each way — price it as a full day or drop it.",
  },
  {
    id: "vt_004",
    kind: "reinspection",
    service: "stay",
    name: "Villa near the lake",
    where: "Nyarutarama, Kigali",
    requestedAt: "2026-08-08",
    status: "requested",
    note: "Verified 28 September, so it is coming up on a year. Re-walk before the December bookings open.",
  },
  {
    id: "vt_005",
    kind: "new",
    service: "stay",
    name: "Serviced flat, KG 11 Ave",
    where: "Kimihurura, Kigali",
    requestedAt: "2026-07-19",
    inspectorName: "Jean-Claude U.",
    status: "published",
    note: "Live since 2 August.",
  },
  /*
   * The rest of a real week. Five rows is a list; a queue is the thing you
   * scroll, and the difference is what tells you whether the screen needs
   * filtering and paging at all. It did, and with five rows that was invisible.
   */
  {
    id: "vt_006",
    kind: "new",
    service: "car",
    name: "Toyota Coaster, 26 seats",
    where: "Nyabugogo, Kigali",
    requestedAt: "2026-08-06",
    status: "requested",
    note: "Bigger than anything we list. Decide whether group transport at this size is a lane before booking a visit.",
  },
  {
    id: "vt_007",
    kind: "new",
    service: "experience",
    name: "Sunrise on Mount Kigali",
    where: "Nyarugenge, Kigali",
    requestedAt: "2026-08-07",
    scheduledFor: "2026-08-12",
    inspectorName: "Patrick N.",
    status: "scheduled",
    note: "Guide wants a 05:00 start. Walk it at that hour or not at all — the whole thing is the light.",
  },
  {
    id: "vt_008",
    kind: "reinspection",
    service: "car",
    name: "Toyota HiAce",
    where: "Kicukiro, Kigali",
    requestedAt: "2026-08-04",
    scheduledFor: "2026-08-11",
    inspectorName: "Eric H.",
    status: "scheduled",
    note: "Driver reported the sliding door catching. Not listed-off, but check before the November group.",
  },
  {
    id: "vt_009",
    kind: "new",
    service: "stay",
    name: "Two rooms above the bakery",
    where: "Nyamirambo, Kigali",
    requestedAt: "2026-07-30",
    inspectorName: "Aline M.",
    status: "inspected",
    note: "Clean and cheap, and the bakery starts at 04:00 directly below the bedroom. List it with that written on the page or not at all.",
  },
  {
    id: "vt_010",
    kind: "new",
    service: "stay",
    name: "Compound house, Kibagabaga",
    where: "Kibagabaga, Kigali",
    requestedAt: "2026-08-01",
    status: "requested",
    note: "Owner is abroad and wants to sign remotely. Identity check cannot be done on the day, so book the visit and the paperwork separately.",
  },
  {
    id: "vt_011",
    kind: "new",
    service: "experience",
    name: "Pottery afternoon, Gatagara",
    where: "Nyanza",
    requestedAt: "2026-07-24",
    inspectorName: "Aline M.",
    status: "inspected",
    note: "Genuinely good and two hours from Kigali. Same transfer problem as the coffee farm — decide the pattern once and apply it to both.",
  },
  {
    id: "vt_012",
    kind: "reinspection",
    service: "stay",
    name: "Bright studio near the stadium",
    where: "Remera, Kigali",
    requestedAt: "2026-08-02",
    status: "requested",
    note: "Guest reported morning water pressure in March and it is still on the record. Re-walk before it takes another booking.",
  },
  {
    id: "vt_013",
    kind: "new",
    service: "car",
    name: "Suzuki Jimny, 2021",
    where: "Remera, Kigali",
    requestedAt: "2026-07-26",
    inspectorName: "Eric H.",
    status: "published",
    note: "Live since 5 August.",
  },
  {
    id: "vt_014",
    kind: "new",
    service: "experience",
    name: "Night market food walk",
    where: "Nyamirambo, Kigali",
    requestedAt: "2026-07-21",
    inspectorName: "Patrick N.",
    status: "published",
    note: "Live since 30 July.",
  },
];

/*
 * Every "message the team" button on the confirmation and trips screens lands
 * here as a job for a person. That is the honest shape of the product today,
 * and the length of this list is the argument for building any of it into the
 * checkout later.
 */
export const ADDON_REQUESTS: AddOnRequest[] = [
  {
    id: "req_001",
    bookingId: "bkg_001",
    asked: "A car at the airport for the whole week, and someone to drive it — we do not want to drive ourselves the first few days.",
    requestedAt: "2026-11-09",
    status: "open",
    owner: "Aline M.",
  },
  {
    id: "req_002",
    bookingId: "bkg_003",
    asked: "Could the Sunday walk start an hour later? Our flight lands late on Saturday.",
    requestedAt: "2026-11-08",
    status: "quoted",
    owner: "Aline M.",
  },
  {
    id: "req_003",
    bookingId: "bkg_002",
    asked: "A child seat for the RAV4, for a four-year-old.",
    requestedAt: "2026-11-07",
    status: "arranged",
    owner: "Patrick N.",
  },
];

/*
 * The same escrow state a guest reads as safety, read from behind as a job.
 * Amounts are what supply is actually paid; commission is not modelled yet, so
 * these are stated rather than derived from the booking total.
 */
export const PAYOUTS: Payout[] = [
  {
    id: "pay_001",
    bookingId: "bkg_001",
    payee: "Placide K.",
    amount: money(405_000, "RWF"),
    status: "held",
    releaseOn: "2026-11-14",
  },
  {
    id: "pay_002",
    bookingId: "bkg_002",
    payee: "Eric H.",
    amount: money(142_000, "RWF"),
    status: "due",
    releaseOn: "2026-11-14",
  },
  {
    id: "pay_003",
    bookingId: "bkg_003",
    payee: "Solange K.",
    amount: money(73_000, "RWF"),
    status: "due",
    releaseOn: "2026-11-15",
  },
  {
    id: "pay_004",
    bookingId: "bkg_004",
    payee: "Placide K.",
    amount: money(356_000, "RWF"),
    status: "paid",
    releaseOn: "2026-03-09",
  },
  {
    id: "pay_005",
    bookingId: "bkg_005",
    payee: "Didier B.",
    amount: money(139_000, "RWF"),
    status: "paid",
    releaseOn: "2026-03-07",
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: "cnv_001",
    subject: "Arrival details, Garden apartment",
    scope: { kind: "booking", id: "bkg_001" },
    participantNames: ["Marie L.", "Aline M."],
    participantRoles: ["guest", "ops"],
    lastMessagePreview:
      "Your flight lands at 19:40, so I will have someone at the gate with the keys.",
    lastMessageAt: "2026-11-09T14:22:00Z",
    unreadCount: 0,
  },
  {
    id: "cnv_002",
    subject: "Car pickup at the airport",
    scope: { kind: "booking", id: "bkg_002" },
    participantNames: ["Marie L.", "Eric H."],
    participantRoles: ["guest", "driver"],
    lastMessagePreview: "The RAV4 is booked out to you from Saturday morning.",
    lastMessageAt: "2026-11-08T09:05:00Z",
    unreadCount: 0,
  },
  {
    id: "cnv_003",
    subject: "Where we meet on Sunday",
    scope: { kind: "booking", id: "bkg_003" },
    participantNames: ["Marie L.", "Solange K."],
    participantRoles: ["guest", "guide"],
    lastMessagePreview:
      "We start at the Women's Centre at 09:00. Wear something you can walk the hill in.",
    lastMessageAt: "2026-11-07T16:40:00Z",
    unreadCount: 0,
  },
  {
    id: "cnv_004",
    subject: "Generator and keys, 14 November",
    scope: { kind: "booking", id: "bkg_001" },
    participantNames: ["Aline M.", "Placide K."],
    participantRoles: ["ops", "host"],
    lastMessagePreview: "Tank is full and I ran it for ten minutes this morning.",
    lastMessageAt: "2026-11-09T11:15:00Z",
    unreadCount: 0,
  },
  {
    id: "cnv_005",
    subject: "RAV4 handover, bay 12",
    scope: { kind: "booking", id: "bkg_002" },
    participantNames: ["Aline M.", "Eric H."],
    participantRoles: ["ops", "driver"],
    lastMessagePreview: "Serviced on Thursday. I will leave it fuelled.",
    lastMessageAt: "2026-11-06T07:20:00Z",
    unreadCount: 0,
  },
  {
    id: "cnv_006",
    subject: "How was the studio?",
    scope: { kind: "booking", id: "bkg_004" },
    participantNames: ["Marie L.", "Patrick N."],
    participantRoles: ["guest", "ops"],
    lastMessagePreview: "Glad it worked. The water tank complaint is with the owner.",
    lastMessageAt: "2026-03-10T08:05:00Z",
    unreadCount: 0,
  },
  {
    // Trip-scoped rather than booking-scoped. Rarer, and the one thread that
    // is about the shape of the week rather than about a single line of it.
    id: "cnv_007",
    subject: "Your November week",
    scope: { kind: "trip", id: "trp_001" },
    participantNames: ["Marie L.", "Aline M."],
    participantRoles: ["guest", "ops"],
    lastMessagePreview:
      "I will come back to you about a week out, once you have the flight numbers.",
    lastMessageAt: "2026-11-09T14:31:00Z",
    unreadCount: 0,
  },
];

export const MESSAGES: Message[] = [
  {
    id: "msg_001",
    conversationId: "cnv_001",
    authorName: "Marie L.",
    authorRole: "guest",
    body: "We land Saturday evening on RwandAir from Brussels. Is a late check-in workable?",
    sentAt: "2026-11-09T13:40:00Z",
    readAt: "2026-11-09T13:52:00Z",
  },
  {
    id: "msg_002",
    conversationId: "cnv_001",
    authorName: "Aline M.",
    authorRole: "ops",
    body: "Your flight lands at 19:40, so I will have someone at the gate with the keys. The generator is fuelled and the water tank is full.",
    sentAt: "2026-11-09T14:22:00Z",
  },
  {
    id: "msg_003",
    conversationId: "cnv_002",
    authorName: "Marie L.",
    authorRole: "guest",
    body: "Are we collecting the car at the airport or in town?",
    sentAt: "2026-11-08T08:31:00Z",
    readAt: "2026-11-08T08:44:00Z",
  },
  {
    id: "msg_004",
    conversationId: "cnv_002",
    authorName: "Eric H.",
    authorRole: "driver",
    body: "The RAV4 is booked out to you from Saturday morning. I will leave it in the arrivals car park, bay 12.",
    sentAt: "2026-11-08T09:05:00Z",
    readAt: "2026-11-08T09:30:00Z",
  },
  {
    id: "msg_005",
    conversationId: "cnv_003",
    authorName: "Solange K.",
    authorRole: "guide",
    body: "We start at the Women's Centre at 09:00. Wear something you can walk the hill in.",
    sentAt: "2026-11-07T16:40:00Z",
  },
  {
    id: "msg_006",
    conversationId: "cnv_004",
    authorName: "Aline M.",
    authorRole: "ops",
    body: "Guests arrive on the 14th, late. Can you confirm the generator has been run and the tank is full before then?",
    sentAt: "2026-11-09T10:02:00Z",
    readAt: "2026-11-09T10:40:00Z",
  },
  {
    id: "msg_007",
    conversationId: "cnv_004",
    authorName: "Placide K.",
    authorRole: "host",
    body: "Tank is full and I ran it for ten minutes this morning.",
    sentAt: "2026-11-09T11:15:00Z",
  },
  {
    id: "msg_008",
    conversationId: "cnv_005",
    authorName: "Aline M.",
    authorRole: "ops",
    body: "RAV4 out to a guest from the 14th, self-drive. Anything outstanding on it?",
    sentAt: "2026-11-06T06:58:00Z",
    readAt: "2026-11-06T07:10:00Z",
  },
  {
    id: "msg_009",
    conversationId: "cnv_005",
    authorName: "Eric H.",
    authorRole: "driver",
    body: "Serviced on Thursday. I will leave it fuelled.",
    sentAt: "2026-11-06T07:20:00Z",
    readAt: "2026-11-06T07:44:00Z",
  },
  {
    id: "msg_010",
    conversationId: "cnv_006",
    authorName: "Marie L.",
    authorRole: "guest",
    body: "All fine, thank you. The only thing was the water pressure in the mornings.",
    sentAt: "2026-03-09T17:20:00Z",
    readAt: "2026-03-10T07:02:00Z",
  },
  {
    id: "msg_011",
    conversationId: "cnv_006",
    authorName: "Patrick N.",
    authorRole: "ops",
    body: "Glad it worked. The water tank complaint is with the owner.",
    sentAt: "2026-03-10T08:05:00Z",
    readAt: "2026-03-10T09:12:00Z",
  },
  {
    id: "msg_012",
    conversationId: "cnv_007",
    authorName: "Aline M.",
    authorRole: "ops",
    body: "Everything for the week is booked: the flat in Kacyiru, the RAV4 from Saturday, and Sunday on foot in Nyamirambo.",
    sentAt: "2026-11-09T14:28:00Z",
  },
  {
    id: "msg_013",
    conversationId: "cnv_007",
    authorName: "Aline M.",
    authorRole: "ops",
    body: "I will come back to you about a week out, once you have the flight numbers.",
    sentAt: "2026-11-09T14:31:00Z",
  },
];

/**
 * Display-only FX, expressed per 1 RWF. Phase 2 replaces this with a live
 * feed and records the settlement rate against each transaction.
 */
export const FX_RATES = {
  RWF: 1,
  USD: 1 / 1_290,
  EUR: 1 / 1_400,
  GBP: 1 / 1_630,
} as const;
