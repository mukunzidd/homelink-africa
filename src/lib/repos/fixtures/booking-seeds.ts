import type { Block, Booking, Incident, Listing, MaintenanceTicket, Partner, PartnerDocument, PaymentRecord, Review, StatementLine, Viewing } from "@/lib/domain/types";
import { quoteRent, quoteStay } from "@/lib/domain/pricing";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";

/** One payment per fixture booking, so the payments screens have rows. */
export function seedPayments(bookings: Booking[]): PaymentRecord[] {
  const base: PaymentRecord[] = bookings.map((b, i) => ({
    id: `pmt_${String(i + 1).padStart(3, "0")}`,
    bookingId: b.id,
    rail: i % 2 ? "mobileMoney" : "card",
    kind: "full",
    amount: b.total,
    status: b.status === "cancelled" ? "refunded" : "succeeded",
    at: `${addDays(b.startDate, -21)}T09:30:00.000Z`,
  }));
  // The renting tenant has paid the three months after the first, which
  // leaves this month's rent showing as overdue.
  const lease = bookings.find((b) => b.id === "bkg_phase_leaseActive");
  if (lease?.lines) {
    const rent = lease.lines.find((l) => l.key === "rent")!.amount;
    for (let m = 1; m <= 3; m++) {
      const [y, mo] = lease.startDate.split("-").map(Number);
      const n = y * 12 + (mo - 1) + m;
      base.push({
        id: `pmt_rent_${m}`,
        bookingId: lease.id,
        rail: "mobileMoney",
        kind: "rent",
        amount: rent,
        status: "succeeded",
        at: `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}-01T08:00:00.000Z`,
      });
    }
  }
  return base;
}

/**
 * Maintenance on two homes, a week and a fortnight out, so the calendar and
 * the "dates taken" state both have something real to show.
 */
export function seedBlocks(now: Date): Block[] {
  const today = kigaliDay(now);
  const out: Block[] = [];
  for (let i = 0; i < 3; i++) out.push({ supplyId: "lst_kiyovu_apartment", date: addDays(today, 7 + i), reason: "maintenance" });
  for (let i = 0; i < 2; i++) out.push({ supplyId: "lst_rebero_hilltop", date: addDays(today, 14 + i), reason: "maintenance" });
  return out;
}


/**
 * One guest booking in each phase the booking page has: arriving in five
 * days, arriving tomorrow (check-in details released), in the stay now,
 * ended three days ago, and a year's renting that ended last week. Dated
 * from today so the page always has every phase to show.
 */
export function seedPhaseBookings(listings: Listing[], now: Date): Booking[] {
  const today = kigaliDay(now);
  const at = new Date(now.getTime() - 21 * 86_400_000).toISOString();
  const guest = { name: "Ange Uwase", email: "ange@example.rw", phone: "+250 788 123 456" };
  const make = (id: string, listingId: string, from: number, to: number, status: Booking["status"], lease = false, who = guest): Booking => {
    const l = listings.find((x) => x.id === listingId)!;
    const start = addDays(today, from);
    const end = addDays(today, to);
    // A year of renting is a month plus the deposit up front, not 365 nights.
    const q = lease ? quoteRent(l, 12)! : quoteStay(l, start, end)!;
    // Placed three weeks ago, or two weeks before it began if that is
    // earlier: a renting that started a year ago was not booked last month.
    const placed = new Date(Math.min(now.getTime() - 21 * 86_400_000, Date.parse(`${addDays(start, -14)}T09:00:00Z`))).toISOString();
    return {
      id: `bkg_phase_${id}`,
      reference: `HL-P${id.slice(0, 3).toUpperCase()}-${String(Math.abs(from) % 100).padStart(2, "0")}`,
      service: "stay",
      supplyItemId: l.id,
      title: l.name,
      startDate: start,
      endDate: end,
      party: 2,
      total: q.total,
      lines: q.lines,
      status,
      // Checking in is what releases escrow, so only bookings not yet begun hold it.
      escrowHeld: q.escrowHeld && status === "confirmed",
      stayMode: lease ? "lease" : "nightly",
      guest: who,
      paymentPlan: "full",
      timeline: [
        { at: placed, kind: "placed", actor: "guest" },
        { at: placed, kind: "paid", actor: "guest" },
        ...(status === "active" || status === "completed"
          ? [{ at: `${start}T12:30:00.000Z`, kind: "checkedIn" as const, actor: "ops" as const }]
          : []),
        ...(status === "completed" ? [{ at: `${end}T09:00:00.000Z`, kind: "checkedOut" as const, actor: "ops" as const }] : []),
      ],
    };
  };
  return [
    make("soon", "lst_gikondo_family", 5, 9, "confirmed"),
    make("released", "lst_kibagabaga_bungalow", 1, 4, "confirmed"),
    // A clean booked for the middle of the stay, which falls today.
    { ...make("during", "lst_nyamirambo_rooftop", -2, 3, "active"), extras: [{ key: "midStayClean", quantity: 1 }] },
    make("ended", "lst_remera_studio", -7, -3, "completed"),
    make("leaseEnd", "lst_gacuriro_estate", -372, -7, "completed", true),
    activeLease(),
    // A turnover on today's board: one family out of the Sonatubes flat,
    // another in, so the desk's day always has its tightest job on it.
    make("leaveToday", "lst_kicukiro_flat", -4, 0, "active", false, { name: "Tomás Herrera", email: "tomas@example.es", phone: "+34 612 345 678" }),
    { ...make("arriveToday", "lst_kicukiro_flat", 0, 3, "confirmed", false, { name: "Grace Wanjiru", email: "grace@example.ke", phone: "+254 712 345 678" }), guest: { name: "Grace Wanjiru", email: "grace@example.ke", phone: "+254 712 345 678", arrivalTime: "16:00" } },
  ];

  /** A year's renting that started on the 1st, four months ago, and is under way. */
  function activeLease(): Booking {
    const l = listings.find((x) => x.leaseTerms && x.monthlyRate && x.id !== "lst_gacuriro_estate")!;
    const [y, m] = today.split("-").map(Number);
    const n = y * 12 + (m - 1) - 4;
    const start = `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}-01`;
    const e = n + 12;
    const end = `${Math.floor(e / 12)}-${String((e % 12) + 1).padStart(2, "0")}-01`;
    const q = quoteRent(l, 12)!;
    return {
      id: "bkg_phase_leaseActive",
      reference: "HL-PRNT-12",
      service: "stay",
      supplyItemId: l.id,
      title: l.name,
      startDate: start,
      endDate: end,
      party: 2,
      total: q.total,
      lines: q.lines,
      status: "active",
      escrowHeld: false,
      stayMode: "lease",
      guest,
      paymentPlan: "full",
      application: { occupants: 2, employer: "University of Rwanda", incomeBand: "1mTo2m", moveIn: start, months: 12 },
      timeline: [
        { at: `${addDays(start, -20)}T09:00:00.000Z`, kind: "placed", actor: "guest" },
        { at: `${addDays(start, -20)}T09:00:00.000Z`, kind: "paid", actor: "guest" },
        { at: `${start}T10:00:00.000Z`, kind: "checkedIn", actor: "ops" },
      ],
    };
  }
}

/** A few reviews, so a listing's reviews section has something to show. */
export function seedReviews(): Review[] {
  const r = (id: string, supplyId: string, name: string, scores: number[], text: string, at: string): Review => ({
    id,
    bookingId: `bkg_seed_${id}`,
    supplyId,
    guestFirstName: name,
    ratings: {
      cleanliness: scores[0],
      accuracy: scores[1],
      checkIn: scores[2],
      communication: scores[3],
      location: scores[4],
      value: scores[5],
    },
    text,
    createdAt: at,
  });
  return [
    r("rv1", "lst_kimihurura_studio", "Claire", [5, 5, 5, 5, 5, 4], "Five minutes to the convention centre on foot, and the generator kicked in twice without us noticing anything but the sound.", "2026-10-02T08:00:00Z"),
    r("rv2", "lst_kimihurura_studio", "Tomás", [5, 4, 5, 5, 5, 4], "Exactly what the photos show. Aline answered at 23:00 when our flight was late.", "2026-09-14T08:00:00Z"),
    r("rv3", "lst_kimihurura_studio", "Grace", [4, 5, 4, 5, 5, 5], "Quiet, clean, fast wifi. The desk is the right height for a full day of calls.", "2026-08-21T08:00:00Z"),
    r("rv4", "lst_kacyiru_garden", "Jonas", [5, 5, 5, 4, 4, 4], "The garden is the reason to book. Breakfast outside every morning.", "2026-10-11T08:00:00Z"),
    r("rv5", "lst_kacyiru_garden", "Amani", [5, 5, 4, 5, 4, 5], "Easy to reach the embassies; the team arranged a driver the same afternoon.", "2026-09-30T08:00:00Z"),
    r("rv6", "lst_kacyiru_garden", "Sophie", [4, 4, 5, 5, 4, 4], "Water pressure was low one morning and fixed by lunchtime.", "2026-09-03T08:00:00Z"),
  ];
}

/** Repairs in flight across the homes, so maintenance and the tenant's page have rows. */
export function seedTickets(now: Date): MaintenanceTicket[] {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
  return [
    { id: "tkt_001", listingId: "lst_kiyovu_apartment", title: "Generator not starting automatically", description: "Switch-over takes 3 minutes instead of 10 seconds.", priority: "urgent", status: "scheduled", createdAt: at(2), assignee: "Jean B. (electrician)", scheduledFor: kigaliDay(now), source: "inspection" },
    { id: "tkt_002", listingId: "lst_rebero_hilltop", title: "Repaint the guest bathroom ceiling", description: "Damp patch after the rains; dried out, needs sealing and paint.", priority: "normal", status: "open", createdAt: at(5), source: "staff" },
    { id: "tkt_003", listingId: "lst_nyamirambo_rooftop", title: "Shower drains slowly", description: "Guest reported water pooling.", priority: "normal", status: "inProgress", createdAt: at(1), assignee: "Eric P. (plumber)", source: "guest" },
    { id: "tkt_004", listingId: "lst_kimihurura_studio", title: "Replace a cracked kitchen tile", description: "Next to the fridge.", priority: "low", status: "done", createdAt: at(12), assignee: "Jean B.", source: "inspection" },
  ];
}

/**
 * Two problems reported from stays under way, so the incidents page and the
 * desk's day both have something open: one that needs someone now, one
 * that can wait for the cleaner.
 */
export function seedIncidents(now: Date): Incident[] {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  return [
    { id: "inc_001", bookingId: "bkg_phase_during", category: "water", urgency: "now", description: "No hot water since this morning; the heater light is off.", status: "open", createdAt: ago(2) },
    { id: "inc_002", bookingId: "bkg_phase_leaveToday", category: "internet", urgency: "whenever", description: "Wi-fi drops in the bedroom; fine in the living room.", status: "open", createdAt: ago(20), assignee: "Patrick N." },
  ];
}

const HISTORY_GUESTS = [
  ["Claire Dubois", "claire@example.fr", "+33 6 12 34 56 78"],
  ["Jonas Becker", "jonas@example.de", "+49 151 2345 6789"],
  ["Amani Mwangi", "amani@example.ke", "+254 722 345 678"],
  ["Sophie Martin", "sophie@example.be", "+32 470 12 34 56"],
  ["Eric Habimana", "eric@example.rw", "+250 788 456 123"],
  ["Priya Nair", "priya@example.in", "+91 98765 43210"],
  ["Daniel Okafor", "daniel@example.ng", "+234 803 123 4567"],
  ["Aline Mukamana", "aline@example.rw", "+250 788 987 654"],
  ["Lucas Silva", "lucas@example.br", "+55 11 91234 5678"],
  ["Fatou Diallo", "fatou@example.sn", "+221 77 123 45 67"],
] as const;

/** Bookings placed per week over the last twelve, oldest first: a slow August, a busier autumn. */
const PER_WEEK = [2, 3, 2, 4, 3, 5, 4, 6, 5, 4, 6, 5];

/**
 * Twelve weeks of ordinary nightly bookings, so the overview's numbers and
 * the finance pages have a history to show rather than one day's worth.
 * Deterministic (no randomness, so screenshots compare), dated from today,
 * and placed only where the home has a unit free on every night, checked
 * against everything already booked.
 */
export function seedHistory(listings: Listing[], existing: Booking[], now: Date): Booking[] {
  const today = kigaliDay(now);
  const homes = listings.filter((l) => l.nightlyRate);
  const out: Booking[] = [];
  const all = () => [...existing, ...out];
  const fits = (l: Listing, start: string, end: string) => {
    const live = all().filter((b) => b.supplyItemId === l.id && b.status !== "cancelled");
    for (let d = start; d < end; d = addDays(d, 1)) {
      if (live.filter((b) => b.startDate <= d && d < b.endDate).length >= l.unitsAvailable) return false;
    }
    return true;
  };
  let n = 0;
  PER_WEEK.forEach((count, w) => {
    for (let k = 0; k < count; k++, n++) {
      const placed = addDays(today, -7 * (11 - w) - ((k * 3) % 7));
      if (placed > today) continue;
      const lead = 4 + ((n * 7) % 26);
      const nights = 2 + ((n * 5) % 5);
      // Try homes in turn from a different one each time until one is free.
      for (let tryNo = 0; tryNo < homes.length; tryNo++) {
        const l = homes[(n + tryNo) % homes.length];
        const start = addDays(placed, lead);
        const end = addDays(start, nights);
        if (!fits(l, start, end)) continue;
        const q = quoteStay(l, start, end);
        if (!q) continue;
        const [name, email, phone] = HISTORY_GUESTS[n % HISTORY_GUESTS.length];
        const status: Booking["status"] = n % 17 === 5 ? "cancelled" : end <= today ? "completed" : start <= today ? "active" : "confirmed";
        const at = `${placed}T${String(8 + (n % 10)).padStart(2, "0")}:15:00.000Z`;
        const code = (1_200_000 + n * 7919).toString(36).toUpperCase();
        out.push({
          id: `bkg_hist_${String(n).padStart(3, "0")}`,
          reference: `HL-${code.slice(0, 4)}-${code.slice(-2)}H`,
          service: "stay",
          supplyItemId: l.id,
          title: l.name,
          startDate: start,
          endDate: end,
          party: 1 + (n % Math.max(1, l.sleeps)),
          total: q.total,
          lines: q.lines,
          status,
          escrowHeld: q.escrowHeld && status === "confirmed",
          stayMode: "nightly",
          guest: { name, email, phone },
          paymentPlan: "full",
          ...(status === "cancelled" ? { refund: q.total } : {}),
          timeline: [
            { at, kind: "placed", actor: "guest" },
            { at, kind: "paid", actor: "guest" },
            ...(status === "cancelled" ? [{ at, kind: "cancelled" as const, actor: "guest" as const }] : []),
            ...(status === "active" || status === "completed" ? [{ at: `${start}T12:30:00.000Z`, kind: "checkedIn" as const, actor: "ops" as const }] : []),
            ...(status === "completed" ? [{ at: `${end}T09:00:00.000Z`, kind: "checkedOut" as const, actor: "ops" as const }] : []),
          ],
        });
        break;
      }
    }
  });
  return out;
}

/**
 * The drivers and guides. Names match the bookings, threads and payouts
 * already seeded ("Eric H.", "Solange K."), so every screen agrees on who
 * is who. Eric's licence runs out in under a month: the expiring-document
 * warning has something real to show.
 */
export function seedPartners(now: Date): { partners: Partner[]; docs: PartnerDocument[] } {
  const today = kigaliDay(now);
  const partners: Partner[] = [
    { id: "ptn_eric", role: "driver", name: "Eric Hakizimana", shortName: "Eric H.", phone: "+250 788 300 411", supplyIds: ["veh_rav4", "veh_landcruiser"], rating: 4.9, joinedAt: "2025-03-10" },
    { id: "ptn_jeanpaul", role: "driver", name: "Jean-Paul Nshimiyimana", shortName: "Jean-Paul N.", phone: "+250 788 300 522", supplyIds: ["veh_corolla", "veh_hiace"], rating: 4.7, joinedAt: "2025-08-02" },
    { id: "ptn_emmanuel", role: "guide", name: "Emmanuel Rukundo", shortName: "Emmanuel R.", phone: "+250 788 300 633", supplyIds: ["exp_gorillas", "exp_nyungwe"], rating: 4.95, joinedAt: "2024-11-20" },
    { id: "ptn_solange", role: "guide", name: "Solange Kamikazi", shortName: "Solange K.", phone: "+250 788 300 744", supplyIds: ["exp_kigali_walk"], rating: 4.9, joinedAt: "2025-01-15" },
    { id: "ptn_didier", role: "guide", name: "Didier Bizimana", shortName: "Didier B.", phone: "+250 788 300 855", supplyIds: ["exp_kivu"], rating: 4.8, joinedAt: "2025-06-01" },
  ];
  const d = (id: string, partnerId: string, kind: PartnerDocument["kind"], days: number): PartnerDocument => ({ id, partnerId, kind, expires: addDays(today, days) });
  const docs: PartnerDocument[] = [
    d("doc_eric_licence", "ptn_eric", "licence", 24),
    d("doc_eric_id", "ptn_eric", "id", 900),
    d("doc_jp_licence", "ptn_jeanpaul", "licence", 410),
    d("doc_jp_insurance", "ptn_jeanpaul", "insurance", 75),
    d("doc_emm_permit", "ptn_emmanuel", "permit", 160),
    d("doc_sol_permit", "ptn_solange", "permit", 300),
    d("doc_did_permit", "ptn_didier", "permit", -3),
  ];
  return { partners, docs };
}

/** Three viewing requests on homes for sale, in the three states the sales page acts on. */
export function seedViewings(now: Date): Viewing[] {
  const today = kigaliDay(now);
  const at = new Date(now.getTime() - 2 * 86_400_000).toISOString();
  return [
    { id: "vwg_001", saleId: "sale_gacuriro_house", mode: "inPerson", date: addDays(today, 3), time: "10:00", contact: { name: "Ange Uwase", email: "ange@example.rw", phone: "+250 788 123 456" }, notes: "Coming with my partner; we would like to see the garden.", status: "requested", createdAt: at },
    { id: "vwg_002", saleId: "sale_kimihurura_apartment", mode: "video", date: addDays(today, 5), time: "15:30", contact: { name: "Jonas Becker", email: "jonas@example.de", phone: "+49 151 2345 6789" }, status: "confirmed", createdAt: at },
    { id: "vwg_003", saleId: "sale_rebero_villa", mode: "inPerson", date: addDays(today, -4), time: "11:00", contact: { name: "Priya Nair", email: "priya@example.in", phone: "+91 98765 43210" }, status: "done", createdAt: at },
  ];
}

/**
 * The Mobile Money operator's statement for the last few weeks: three
 * lines already matched, two that match a payment by amount but were never
 * linked (the reconciliation page suggests them), and two that match
 * nothing (a guest paid twice, and a transfer with no booking).
 */
export function seedStatement(payments: PaymentRecord[], now: Date): StatementLine[] {
  const momo = payments.filter((p) => p.rail === "mobileMoney" && p.status === "succeeded").sort((a, b) => b.at.localeCompare(a.at));
  const shift = (iso: string, minutes: number) => new Date(Date.parse(iso) + minutes * 60_000).toISOString();
  const lines: StatementLine[] = [];
  momo.slice(0, 5).forEach((p, i) => {
    lines.push({ id: `stm_${String(i + 1).padStart(3, "0")}`, at: shift(p.at, i < 3 ? 4 : 600), amount: { ...p.amount }, phone: `+250 78${i} 55${i} 0${i}${i}`, ref: `MP${261108 - i * 37}.${1400 + i}`, ...(i < 3 ? { paymentId: p.id } : {}) });
  });
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  lines.push({ id: "stm_901", at: ago(3), amount: { minor: 241_250, currency: "RWF" }, phone: "+250 788 123 456", ref: "MP260905.0917" });
  lines.push({ id: "stm_902", at: ago(9), amount: { minor: 75_000, currency: "RWF" }, phone: "+250 722 900 114", ref: "MP260830.2211" });
  return lines.sort((a, b) => b.at.localeCompare(a.at));
}

/** The two most recent cancellations' refunds wait for admin to approve them. */
export function seedPendingRefunds(bookings: Booking[], payments: PaymentRecord[]): PaymentRecord[] {
  return bookings
    .filter((b) => b.status === "cancelled" && b.refund && b.refund.minor > 0)
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 2)
    .map((b, i) => ({
      id: `pmt_refund_${i + 1}`,
      bookingId: b.id,
      rail: payments.find((p) => p.bookingId === b.id)?.rail ?? "card",
      kind: "refund" as const,
      amount: { ...b.refund! },
      status: "pending" as const,
      at: b.timeline?.find((e) => e.kind === "cancelled")?.at ?? new Date().toISOString(),
    }));
}
