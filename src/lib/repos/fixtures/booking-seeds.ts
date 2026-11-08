import type { Block, Booking, Listing, PaymentRecord, Review } from "@/lib/domain/types";
import { quoteRent, quoteStay } from "@/lib/domain/pricing";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";

/** One payment per fixture booking, so the payments screens have rows. */
export function seedPayments(bookings: Booking[]): PaymentRecord[] {
  return bookings.map((b, i) => ({
    id: `pmt_${String(i + 1).padStart(3, "0")}`,
    bookingId: b.id,
    rail: i % 2 ? "mobileMoney" : "card",
    kind: "full",
    amount: b.total,
    status: b.status === "cancelled" ? "refunded" : "succeeded",
    at: `${addDays(b.startDate, -21)}T09:30:00.000Z`,
  }));
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
  const make = (id: string, listingId: string, from: number, to: number, status: Booking["status"], lease = false): Booking => {
    const l = listings.find((x) => x.id === listingId)!;
    const start = addDays(today, from);
    const end = addDays(today, to);
    // A year of renting is a month plus the deposit up front, not 365 nights.
    const q = lease ? quoteRent(l, 12)! : quoteStay(l, start, end)!;
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
      guest,
      paymentPlan: "full",
      timeline: [
        { at, kind: "placed", actor: "guest" },
        { at, kind: "paid", actor: "guest" },
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
    make("during", "lst_nyamirambo_rooftop", -2, 3, "active"),
    make("ended", "lst_remera_studio", -7, -3, "completed"),
    make("leaseEnd", "lst_gacuriro_estate", -372, -7, "completed", true),
  ];
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
