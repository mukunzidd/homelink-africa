import type {
  Booking,
  BookingEvent,
  Experience,
  Listing,
  NotificationKind,
  PaymentRail,
  Role,
  ServiceKind,
  Vehicle,
} from "@/lib/domain/types";
import type { AvailabilityRepo, BookingRepo, NotificationsRepo, TripRepo } from "@/lib/repos/types";
import type { Quote } from "@/lib/domain/pricing";
import { bookingReference, quoteBooking } from "@/lib/domain/pricing";
import { convert, formatMoney, money } from "@/lib/domain/money";
import { addDays, isIsoDate, monthsBetween, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { depositPlan } from "@/lib/domain/payment-plan";
import { refundPreview } from "@/lib/domain/policies";
import { STEPS, stepComplete, type BookingDraft, type PeopleRules } from "@/lib/booking/draft";
import { FX_RATES } from "./data";
import { nextId, recordAudit, store } from "./store";
import { refundableOf } from "@/lib/workspace/paid-state";

/* --------------------------------------------------------------- lookups */

type Supply =
  | { kind: "stay"; item: Listing }
  | { kind: "car"; item: Vehicle }
  | { kind: "experience"; item: Experience };

function supplyById(id: string): Supply | null {
  const s = store();
  const l = s.listings.find((x) => x.id === id);
  if (l) return { kind: "stay", item: l };
  const v = s.vehicles.find((x) => x.id === id);
  if (v) return { kind: "car", item: v };
  const e = s.experiences.find((x) => x.id === id);
  if (e) return { kind: "experience", item: e };
  return null;
}

function supplyForDraft(d: BookingDraft): Supply | null {
  const s = store();
  if (d.flow === "stay" || d.flow === "rent") {
    const item = s.listings.find((x) => x.slug === d.slug);
    return item ? { kind: "stay", item } : null;
  }
  if (d.flow === "car") {
    const item = s.vehicles.find((x) => x.slug === d.slug);
    return item ? { kind: "car", item } : null;
  }
  if (d.flow === "experience") {
    const item = s.experiences.find((x) => x.slug === d.slug);
    return item ? { kind: "experience", item } : null;
  }
  return null;
}

const ACTIVE = new Set(["confirmed", "active"]);
/** The ways to pay that exist; anything else from a client is refused. */
const RAILS: ReadonlySet<string> = new Set<PaymentRail>(["card", "mobileMoney", "bankTransfer"]);

/** The times a day out leaves; one with no list leaves at `departs`. */
function departuresOf(e: Experience): string[] {
  return e.slots?.length ? e.slots : [e.departs];
}
/** Which departure a booking is on, for one booked before slots existed too. */
function departureOf(b: Booking, e: Experience): string {
  return b.slot ?? e.departs;
}
/** Whether any of a booking's deposit has already gone back. */
function depositReturned(bookingId: string): boolean {
  return store().payments.some((p) => p.bookingId === bookingId && p.kind === "refund" && p.status !== "failed");
}
const OTHER_GUESTS = (b: Booking) => b.id.startsWith("bkg_hist_") || b.id === "bkg_phase_leaveToday" || b.id === "bkg_phase_arriveToday";

/** Days a booking occupies: a stay's nights [start, end), a hire's days [start, end]. */
function occupies(b: Booking, date: string): boolean {
  if (b.service === "stay") return b.startDate <= date && date < b.endDate;
  return b.startDate <= date && date <= b.endDate;
}

function eachDay(from: string, to: string, inclusive: boolean): string[] {
  const out: string[] = [];
  const n = nightsBetween(from, to) + (inclusive ? 1 : 0);
  for (let i = 0; i < n; i++) out.push(addDays(from, i));
  return out;
}

/* ---------------------------------------------------------- availability */

export const availability: AvailabilityRepo = {
  async blocked(supplyId, from, to) {
    return store().blocks.filter((b) => b.supplyId === supplyId && b.date >= from && b.date < to);
  },

  async bookedNights(supplyId, from, to) {
    const supply = supplyById(supplyId);
    if (!supply || supply.kind === "experience") return [];
    const units = supply.item.unitsAvailable;
    const live = store().bookings.filter((b) => b.supplyItemId === supplyId && ACTIVE.has(b.status));
    return eachDay(from, to, false).filter((d) => live.filter((b) => occupies(b, d)).length >= units);
  },

  async isFree(supplyId, from, to, opts = {}) {
    const supply = supplyById(supplyId);
    if (!supply) return false;
    const live = store().bookings.filter(
      (b) => b.supplyItemId === supplyId && ACTIVE.has(b.status) && b.id !== opts.exceptBookingId,
    );
    if (supply.kind === "experience") {
      // Counted per departure: a walk that leaves at 09:00 and 14:00 is two
      // groups, and a full morning says nothing about the afternoon.
      const slot = opts.slot ?? supply.item.departs;
      const taken = live
        .filter((b) => b.startDate === from && departureOf(b, supply.item) === slot)
        .reduce((n, b) => n + b.party, 0);
      return taken + (opts.party ?? 1) <= supply.item.groupMax;
    }
    const days = eachDay(from, to, supply.kind === "car");
    const blocked = new Set(store().blocks.filter((b) => b.supplyId === supplyId).map((b) => b.date));
    return days.every(
      (d) => !blocked.has(d) && live.filter((b) => occupies(b, d)).length < supply.item.unitsAvailable,
    );
  },

  async block(supplyId, dates, reason) {
    const s = store();
    const added: string[] = [];
    for (const date of dates) {
      if (!s.blocks.some((b) => b.supplyId === supplyId && b.date === date)) {
        s.blocks.push({ supplyId, date, reason });
        added.push(date);
      }
    }
    return added;
  },

  async unblock(supplyId, dates) {
    const s = store();
    s.blocks = s.blocks.filter((b) => !(b.supplyId === supplyId && dates.includes(b.date)));
  },
};

/* -------------------------------------------------------------- bookings */

const fmt = (m: { minor: number; currency: "RWF" | "USD" | "EUR" | "GBP" }) => formatMoney(m, "en-US");

const refundable = (b: Booking) => refundableOf(b, store().payments);

function event(kind: BookingEvent["kind"], actor: Role, note?: string): BookingEvent {
  return { at: new Date().toISOString(), kind, actor, ...(note ? { note } : {}) };
}

function quoteFor(supply: Supply, d: BookingDraft, today: string) {
  return quoteBooking(
    supply.item,
    {
      kind: supply.kind,
      start: d.start,
      end: supply.kind === "experience" ? d.start : d.end,
      party: d.party,
      driveMode: d.driveMode,
      extras: d.extras,
      promoCode: d.promoCode,
      ...(d.flow === "rent" ? { rentMonths: monthsBetween(d.start, d.end) } : {}),
    },
    today,
    store().settings.catalog,
  );
}

/** A quote for a booking stored before quote lines were kept: its total as one line. */
function storedQuote(b: Booking): Quote {
  const key = b.service === "stay" ? "accommodation" : b.service === "car" ? "hire" : "seats";
  return {
    nights: b.service === "experience" ? 0 : nightsBetween(b.startDate, b.endDate),
    lines: b.lines ?? [{ key, amount: b.total }],
    total: b.total,
    escrowHeld: b.escrowHeld,
  };
}

/**
 * Every check a booking must pass before anything is written: the item
 * exists, the dates are sane, the term (for renting) is the server's, each
 * step is complete, and the nights are free. Shared by a single booking
 * and a trip, so a trip can check all its parts before writing any.
 */
type Prepared = { ok: true; supply: Supply; quote: NonNullable<ReturnType<typeof quoteFor>>; end: string; today: string };
async function prepare(draft: BookingDraft): Promise<Prepared | { ok: false; reason: "invalid" | "unavailable" }> {
      const today = kigaliDay();
  const supply = supplyForDraft(draft);
  if (!supply || !isIsoDate(draft.start) || !isIsoDate(draft.end)) return { ok: false, reason: "invalid" };
  if (draft.start < today || (supply.kind !== "experience" && draft.end < draft.start)) {
    return { ok: false, reason: "invalid" };
  }
  if (!Number.isInteger(draft.party) || draft.party < 1) return { ok: false, reason: "invalid" };
  // Extras arrive from the client; a non-list would throw inside pricing.
  if (draft.extras !== undefined && !Array.isArray(draft.extras)) return { ok: false, reason: "invalid" };
  // A home admin has taken down is not for sale, whatever link got here.
  if (supply.kind === "stay" && supply.item.published === false) return { ok: false, reason: "unavailable" };
  if (supply.kind === "stay" && draft.flow !== "rent" && nightsBetween(draft.start, draft.end) < (supply.item.minNights ?? 1)) {
    return { ok: false, reason: "invalid" };
  }

  // A long-term stay's term is the server's to decide, not the URL's: a
  // 12- or 24-month term, starting on the 1st of a month the home is free,
  // with the application saying the same thing as the dates.
  if (draft.flow === "rent") {
    const terms = supply.kind === "stay" ? supply.item.leaseTerms : undefined;
    const months = monthsBetween(draft.start, draft.end);
    const freeFrom = terms ? `${terms.availableFrom.slice(0, 7)}-01` : "";
    const firstFree = terms && terms.availableFrom !== freeFrom ? `${addDays(freeFrom, 32).slice(0, 7)}-01` : freeFrom;
    if (
      supply.kind !== "stay" ||
      !supply.item.monthlyRate ||
      !terms ||
      !draft.start.endsWith("-01") ||
      draft.end.slice(8) !== "01" ||
      (months !== 12 && months !== 24) ||
      draft.start < firstFree ||
      draft.application?.moveIn !== draft.start ||
      draft.application?.months !== months
    ) {
      return { ok: false, reason: "invalid" };
    }
  }

  // Every step before pay, checked again here: the browser's say-so is not enough.
  const people: PeopleRules | undefined =
    supply.kind === "experience"
      ? { minAge: supply.item.minAge, requiresPermit: !!supply.item.requiresPermit }
      : undefined;
  const steps = STEPS[draft.flow].filter((s) => s !== "pay");
  if (!steps.every((s) => stepComplete(draft, s, people))) return { ok: false, reason: "invalid" };

  const quote = quoteFor(supply, draft, today);
  if (!quote) return { ok: false, reason: "invalid" };

  // A departure the day out does not have would be stored as given.
  if (supply.kind === "experience" && draft.slot && !departuresOf(supply.item).includes(draft.slot)) {
    return { ok: false, reason: "invalid" };
  }

  const end = supply.kind === "experience" ? draft.start : draft.end;
  const slot = supply.kind === "experience" ? (draft.slot ?? supply.item.departs) : undefined;
  if (!(await availability.isFree(supply.item.id, draft.start, end, { party: draft.party, slot }))) {
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, supply, quote, end, today };

}

/** Writes a prepared booking: the row, its payment, the notifications, the audit entry. */
async function commit(
  draft: BookingDraft,
  { supply, quote, end, today }: Prepared,
  payment: { rail: PaymentRail },
  notify: (audiences: Role[], kind: NotificationKind, params: Record<string, string | number>, href: string) => Promise<void>,
  tripId?: string,
): Promise<Booking> {
      const id = nextId("bkg");
  const plan =
    draft.plan === "deposit" ? depositPlan(quote, draft.start, today, FX_RATES) : ({ offered: false } as const);
  const paidNow = plan.offered ? plan.now : quote.total;
  const pending = payment.rail === "bankTransfer";

  const booking: Booking = {
    id,
    reference: bookingReference(`${id}:${draft.id}`),
    service: supply.kind,
    supplyItemId: supply.item.id,
    title: supply.item.name,
    startDate: draft.start,
    endDate: end,
    party: draft.party,
    total: quote.total,
    status: "confirmed",
    escrowHeld: quote.escrowHeld,
    ...(tripId ? { tripId } : {}),
    ...(supply.kind === "stay" ? { stayMode: draft.flow === "rent" ? "lease" : "nightly" } : {}),
    guest: {
      name: draft.guest.name ?? "",
      email: draft.guest.email ?? "",
      phone: draft.guest.phone ?? "",
      ...draft.guest,
    },
    extras: quote.lines.filter((l) => l.extra).map((l) => ({
      key: l.extra!,
      quantity: draft.extras.find((e) => e.key === l.extra)?.quantity ?? 1,
    })),
    ...(quote.promo?.ok ? { promoCode: quote.promo.code } : {}),
    paymentPlan: plan.offered ? "deposit" : "full",
    lines: quote.lines,
    timeline: [event("placed", "guest"), ...(pending ? [] : [event("paid", "guest")])],
    ...(draft.driveMode ? { driveMode: draft.driveMode } : {}),
    ...(draft.pickup ? { pickup: draft.pickup } : {}),
    ...(draft.participants.length ? { participants: draft.participants } : {}),
    ...(draft.slot ? { slot: draft.slot } : {}),
    ...(draft.dietary ? { dietary: draft.dietary } : {}),
    ...(draft.application ? { application: draft.application } : {}),
  };

  const s = store();
  s.bookings.unshift(booking);
  s.payments.push({
    id: nextId("pmt"),
    bookingId: id,
    rail: payment.rail,
    kind: plan.offered ? "deposit" : "full",
    amount: paidNow,
    status: pending ? "pending" : "succeeded",
    at: new Date().toISOString(),
  });

  const href = `/bookings/${booking.reference}`;
  await notify(["guest"], "bookingConfirmed", { name: booking.title, ref: booking.reference }, href);
  if (!pending) await notify(["guest"], "paymentReceived", { amount: fmt(paidNow), ref: booking.reference }, href);
  await notify(
    ["ops", "admin"],
    "newBooking",
    { guest: booking.guest?.name ?? "", name: booking.title, ref: booking.reference },
    `/manage/bookings/${booking.reference}`,
  );
  recordAudit({ actor: "guest", action: "booking.place", target: booking.reference });

  return booking;
}

/**
 * Builds the bookings repo around the notifications repo, so placing a
 * booking can tell the guest and the desk without either module importing
 * the other's internals.
 */
export function makeBookings(notifications: NotificationsRepo): BookingRepo {
  async function notify(audiences: Role[], kind: NotificationKind, params: Record<string, string | number>, href: string) {
    for (const audience of audiences) await notifications.create({ audience, kind, params, href });
  }

  function find(reference: string): Booking {
    const needle = reference.trim().toUpperCase();
    const b = store().bookings.find((x) => x.reference.toUpperCase() === needle);
    if (!b) throw new Error(`No booking ${reference}`);
    return b;
  }

  const repo: BookingRepo = {
    async listForCurrentUser() {
      // There is one preview account. Bookings seeded for other guests (the
      // desk's same-day changeover, twelve weeks of history) are the
      // workspace's to see, not hers; anything placed in the preview is.
      return store().bookings.filter((b) => !OTHER_GUESTS(b));
    },

    async listAll(query = {}) {
      const q = query.q?.trim().toLowerCase();
      return store()
        .bookings.filter(
          (b) =>
            (!query.status || query.status.includes(b.status)) &&
            (!query.service || b.service === query.service) &&
            (!query.from || b.endDate >= query.from) &&
            (!query.to || b.startDate <= query.to) &&
            (!q ||
              b.reference.toLowerCase().includes(q) ||
              b.title.toLowerCase().includes(q) ||
              (b.guest?.name ?? "").toLowerCase().includes(q) ||
              (b.guest?.email ?? "").toLowerCase().includes(q)),
        )
        .sort((a, b) => b.startDate.localeCompare(a.startDate));
    },

    async byId(id) {
      return store().bookings.find((b) => b.id === id) ?? null;
    },

    async byReference(reference) {
      // Case-insensitive: the code is printed in caps and will be typed in both.
      const needle = reference.trim().toUpperCase();
      return store().bookings.find((b) => b.reference.toUpperCase() === needle) ?? null;
    },

    async place({ draft, clientTotal, payment }) {
      if (!RAILS.has(payment.rail)) return { ok: false, reason: "invalid" };
      const ready = await prepare(draft);
      if (!ready.ok) return ready;
      if (clientTotal.currency !== ready.quote.total.currency || Math.abs(clientTotal.minor - ready.quote.total.minor) > 1) {
        return { ok: false, reason: "priceChanged", quote: ready.quote };
      }
      return { ok: true, booking: await commit(draft, ready, payment, notify) };
    },

    async cancel(reference, by, reason, today, opts = {}) {
      const b = find(reference);
      if (b.status === "cancelled") return b;
      // Only what has not begun can be cancelled under the policy. Once it is
      // under way, only staff can end it, as goodwill; once it is over, there
      // is nothing to cancel, and a policy refund then would pay back days
      // already used and free nights already slept.
      if (b.status !== "confirmed" && !(opts.goodwill && b.status === "active")) {
        throw new Error(`Cannot cancel a booking that is ${b.status}`);
      }
      const supply = supplyById(b.supplyItemId);
      const preview = refundPreview(b.service as ServiceKind, storedQuote(b), b.startDate, today, {
        hireDays: nightsBetween(b.startDate, b.endDate) + 1,
        // A permit is per person, so the share kept is one per head.
        permitShare:
          supply?.kind === "experience" && supply.item.permitShare
            ? money(supply.item.permitShare.minor * b.party, supply.item.permitShare.currency)
            : undefined,
      }, store().settings.catalog);
      // Never more than is left of what was paid: a part refund earlier
      // has already given some of the policy's amount back.
      const left = refundable(b);
      preview.refund = opts.goodwill ? left : money(Math.min(preview.refund.minor, left.minor), left.currency);
      b.status = "cancelled";
      b.cancelledAt = new Date().toISOString();
      b.cancelReason = reason;
      b.refund = money((b.refund?.minor ?? 0) + preview.refund.minor, preview.refund.currency);
      b.timeline = [...(b.timeline ?? []), event("cancelled", by, reason)];
      if (preview.refund.minor > 0) {
        b.timeline.push(event("refunded", by));
        store().payments.push({
          id: nextId("pmt"),
          bookingId: b.id,
          rail: store().payments.find((p) => p.bookingId === b.id)?.rail ?? "card",
          kind: "refund",
          amount: preview.refund,
          status: "succeeded",
          at: new Date().toISOString(),
        });
      }
      recordAudit({ actor: by, action: opts.goodwill ? "booking.cancelGoodwill" : "booking.cancel", target: b.reference, detail: reason });
      return b;
    },

    async refund(reference, by, amount, reason) {
      const b = find(reference);
      if (amount.currency !== b.total.currency || !(amount.minor > 0) || !Number.isInteger(amount.minor)) return { ok: false, reason: "invalid" };
      if (amount.minor > refundable(b).minor) return { ok: false, reason: "tooMuch" };
      store().payments.push({
        id: nextId("pmt"),
        bookingId: b.id,
        rail: store().payments.find((p) => p.bookingId === b.id)?.rail ?? "card",
        kind: "refund",
        amount,
        status: "succeeded",
        at: new Date().toISOString(),
      });
      b.refund = money((b.refund?.minor ?? 0) + amount.minor, amount.currency);
      b.timeline = [...(b.timeline ?? []), event("refunded", by, reason)];
      recordAudit({ actor: by, action: "booking.refund", target: b.reference, detail: `${amount.minor} ${amount.currency}: ${reason}` });
      return { ok: true };
    },

    async changeDates(reference, start, end, today, by = "guest") {
      const b = find(reference);
      const supply = supplyById(b.supplyItemId);
      // Only a booking that is still ahead can move: once it has begun, ended
      // or been cancelled, new dates would be a new booking.
      if (b.status !== "confirmed" || b.startDate <= today) return { ok: false, reason: "invalid" };
      if (!supply || !isIsoDate(start) || !isIsoDate(end) || start < today || end < start) {
        return { ok: false, reason: "invalid" };
      }
      // A renting is priced by the month with a deposit; repricing it by the
      // night would drop both and refund the difference. Its dates change by
      // a new agreement, not here.
      if (b.stayMode === "lease") return { ok: false, reason: "invalid" };
      if (supply.kind === "stay" && nightsBetween(start, end) < (supply.item.minNights ?? 1)) return { ok: false, reason: "invalid" };
      const free = await availability.isFree(supply.item.id, start, end, {
        party: b.party,
        exceptBookingId: b.id,
        slot: supply.kind === "experience" ? departureOf(b, supply.item) : undefined,
      });
      if (!free) return { ok: false, reason: "unavailable" };

      const after = quoteBooking(
        supply.item,
        { kind: supply.kind, start, end, party: b.party, driveMode: b.driveMode, extras: b.extras, promoCode: b.promoCode },
        today,
        store().settings.catalog,
      );
      if (!after) return { ok: false, reason: "invalid" };
      const difference = money(after.total.minor - b.total.minor, b.total.currency);

      b.startDate = start;
      b.endDate = end;
      b.total = after.total;
      b.lines = after.lines;
      b.escrowHeld = after.escrowHeld;
      b.timeline = [...(b.timeline ?? []), event("datesChanged", by, `${start} → ${end}`)];
      // A cheaper stay gives the difference back, capped at what is left.
      const owed = difference.minor > 0 ? difference.minor : Math.min(-difference.minor, refundable(b).minor);
      if (owed > 0) {
        store().payments.push({
          id: nextId("pmt"),
          bookingId: b.id,
          rail: "card",
          kind: difference.minor > 0 ? "change" : "refund",
          amount: money(owed, difference.currency),
          status: "succeeded",
          at: new Date().toISOString(),
        });
      }
      recordAudit({ actor: by, action: "booking.changeDates", target: b.reference });
      return { ok: true, booking: b, difference };
    },

    async addEvent(reference, e) {
      const b = find(reference);
      b.timeline = [...(b.timeline ?? []), { ...e, at: new Date().toISOString() }];
      return b;
    },

    async addGuests(reference, party, by = "guest") {
      const b = find(reference);
      const supply = supplyById(b.supplyItemId);
      const max = supply?.kind === "stay" ? supply.item.sleeps : supply?.kind === "car" ? supply.item.seats : supply?.kind === "experience" ? supply.item.groupMax : 0;
      if (!Number.isInteger(party) || party < 1 || party > max) throw new Error(`Party of ${party} does not fit`);
      // Only before it starts: a party is what was planned, not a tally.
      if (b.status !== "confirmed" || b.startDate <= kigaliDay()) throw new Error("Too late to change the party");
      if (party === b.party) return b;
      // More people must still fit the day out's departure, alongside
      // everyone else booked on it.
      if (supply?.kind === "experience" && party > b.party) {
        const fits = await availability.isFree(supply.item.id, b.startDate, b.startDate, { party, exceptBookingId: b.id, slot: departureOf(b, supply.item) });
        if (!fits) throw new Error("No room left on that departure");
      }
      // A day out is priced per person, so more people cost more; a stay or
      // a hire is not, and its price stays as it is.
      if (supply?.kind === "experience") {
        const q = quoteBooking(supply.item, { kind: "experience", start: b.startDate, end: b.startDate, party, promoCode: b.promoCode }, kigaliDay(), store().settings.catalog);
        if (!q) throw new Error("Cannot price");
        const diff = q.total.minor - b.total.minor;
        if (diff !== 0) {
          store().payments.push({
            id: nextId("pmt"),
            bookingId: b.id,
            rail: store().payments.find((p) => p.bookingId === b.id)?.rail ?? "card",
            kind: diff > 0 ? "change" : "refund",
            amount: money(Math.abs(diff), q.total.currency),
            status: "succeeded",
            at: new Date().toISOString(),
          });
        }
        b.total = q.total;
        b.lines = q.lines;
      }
      b.timeline = [...(b.timeline ?? []), event("guestsAdded", by, `${b.party} → ${party}`)];
      b.party = party;
      return b;
    },

    async submitOnlineCheckIn(reference, adults) {
      const b = find(reference);
      const clean = adults
        .filter((a) => a.name.trim().length >= 2 && a.idFileName)
        .slice(0, b.party)
        .map((a) => ({ name: a.name.trim(), idFileName: a.idFileName }));
      if (!clean.length) throw new Error("No adults to check in");
      b.onlineCheckIn = { at: new Date().toISOString(), adults: clean };
      return b;
    },

    async payRent(reference, rail) {
      if (!RAILS.has(rail)) throw new Error("Unknown payment rail");
      const b = find(reference);
      const rent = b.lines?.find((l) => l.key === "rent")?.amount;
      if (b.stayMode !== "lease" || b.status !== "active" || !rent) throw new Error("Not a renting booking under way");
      const p = {
        id: nextId("pmt"),
        bookingId: b.id,
        rail,
        kind: "rent" as const,
        amount: rent,
        status: "succeeded" as const,
        at: new Date().toISOString(),
      };
      store().payments.push(p);
      await notify(["guest"], "paymentReceived", { amount: fmt(rent), ref: b.reference }, "/account/renting");
      return p;
    },

    async checkIn(reference, by) {
      const b = find(reference);
      if (b.status !== "confirmed") return b;
      b.status = "active";
      b.checkedInAt = new Date().toISOString();
      b.escrowHeld = false;
      b.timeline = [...(b.timeline ?? []), event("checkedIn", by)];
      recordAudit({ actor: by, action: "booking.checkIn", target: b.reference });
      return b;
    },

    async checkOut(reference, by) {
      const b = find(reference);
      if (b.status !== "active") return b;
      b.status = "completed";
      b.timeline = [...(b.timeline ?? []), event("checkedOut", by)];
      recordAudit({ actor: by, action: "booking.checkOut", target: b.reference });
      await notify(["guest"], "reviewRequest", { name: b.title }, `/bookings/${b.reference}`);
      return b;
    },

    async addNote(reference, by, text) {
      const b = find(reference);
      const note = { at: new Date().toISOString(), by, text: text.trim().slice(0, 1000) };
      b.staffNotes = [...(b.staffNotes ?? []), note];
      b.timeline = [...(b.timeline ?? []), event("noteAdded", by)];
      recordAudit({ actor: by, action: "booking.note", target: b.reference });
      return b;
    },

    async payments(bookingId) {
      return store()
        .payments.filter((p) => !bookingId || p.bookingId === bookingId)
        .sort((a, b) => b.at.localeCompare(a.at));
    },

    async recordRentPayment(reference, by, amount) {
      const b = store().bookings.find((x) => x.reference === reference);
      const rent = b?.lines?.find((l) => l.key === "rent")?.amount;
      if (!b || b.stayMode !== "lease" || !rent) throw new Error("Not a renting");
      if (amount.currency !== rent.currency || !Number.isInteger(amount.minor) || amount.minor <= 0 || amount.minor > rent.minor * 12) throw new Error("Bad amount");
      const made = { id: nextId("pmt"), bookingId: b.id, rail: "bankTransfer" as const, kind: "rent" as const, amount: { ...amount }, status: "succeeded" as const, at: new Date().toISOString() };
      store().payments.push(made);
      b.timeline = [...(b.timeline ?? []), event("paid", by, "rent")];
      recordAudit({ actor: by, action: "rent.received", target: b.id, detail: `${amount.minor} ${amount.currency}` });
      return made;
    },

    async startMoveOut(reference, by, date) {
      const b = store().bookings.find((x) => x.reference === reference);
      if (!b || b.stayMode !== "lease" || b.status !== "active") throw new Error("Not a renting under way");
      if (b.moveOut) throw new Error("Move-out already booked");
      if (depositReturned(b.id)) throw new Error("Deposit already returned");
      if (!isIsoDate(date) || date < kigaliDay()) throw new Error("Bad date");
      const l = store().listings.find((x) => x.id === b.supplyItemId);
      const deposit = b.lines?.find((x) => x.key === "deposit")?.amount ?? money(0, b.total.currency);
      const taskId = nextId("ver");
      store().verificationQueue.push({
        id: taskId,
        kind: "reinspection",
        service: "stay",
        name: l?.name ?? b.title,
        where: l?.neighbourhood ?? "",
        requestedAt: new Date().toISOString(),
        scheduledFor: date,
        status: "scheduled",
        note: `Move-out of ${b.guest?.name ?? b.reference}: check against the move-in record before the deposit goes back.`,
      });
      b.moveOut = { date, taskId, deposit, status: "scheduled" };
      recordAudit({ actor: by, action: "moveout.start", target: b.id, detail: date });
      return b;
    },

    async returnDeposit(reference, by) {
      const b = store().bookings.find((x) => x.reference === reference);
      if (!b?.moveOut || b.moveOut.status !== "scheduled") throw new Error("No move-out to settle");
      if (depositReturned(b.id)) throw new Error("Deposit already returned");
      const at = new Date().toISOString();
      store().payments.push({ id: nextId("pmt"), bookingId: b.id, rail: "bankTransfer", kind: "refund", amount: { ...b.moveOut.deposit }, status: "succeeded", at });
      b.moveOut = { ...b.moveOut, status: "returned", returnedAt: at };
      b.timeline = [...(b.timeline ?? []), event("refunded", by, "deposit")];
      recordAudit({ actor: by, action: "deposit.return", target: b.id, detail: `${b.moveOut.deposit.minor} ${b.moveOut.deposit.currency}` });
      return b;
    },
  };
  return repo;
}

/**
 * A trip: several bookings paid at once, placed all together or not at all.
 *
 * Every part is prepared (checked, priced, its nights confirmed free)
 * before any is written, and the trip's own stays are checked against each
 * other, so a trip either becomes all its bookings or none of them. The
 * total is compared in RWF, the currency it is charged in, allowing a
 * minor unit of rounding per part.
 */
export function makeTrips(notifications: NotificationsRepo, read: Pick<TripRepo, "listForCurrentUser" | "byId">): TripRepo {
  async function notify(audiences: Role[], kind: NotificationKind, params: Record<string, string | number>, href: string) {
    for (const audience of audiences) await notifications.create({ audience, kind, params, href });
  }
  return {
    ...read,
    async place({ drafts, clientTotal, payment, bookedReferences }) {
      if (!drafts.length) return { ok: false, failed: [] };
      if (!RAILS.has(payment.rail)) return { ok: false, failed: [{ index: -1, reason: "invalid" }] };
      // Indexed by draft, so a failed part never shifts the others.
      const prepared: (Prepared | undefined)[] = [];
      const failed: { index: number; reason: "unavailable" | "invalid" | "priceChanged" }[] = [];
      for (const [index, d] of drafts.entries()) {
        const r = await prepare(d);
        if (r.ok) prepared[index] = r;
        else failed.push({ index, reason: r.reason });
      }
      // Each part was checked against existing bookings; it must also fit
      // alongside the trip's earlier parts on the same home, car or day out.
      const taken = new Map<string, number>();
      drafts.forEach((d, j) => {
        const p = prepared[j];
        if (!p) return;
        const item = p.supply.item;
        const live = store().bookings.filter((x) => x.supplyItemId === item.id && ACTIVE.has(x.status));
        if (p.supply.kind === "experience") {
          const slot = d.slot ?? (item as Experience).departs;
          const key = `${item.id}|${d.start}|${slot}`;
          const existing = live.filter((x) => x.startDate === d.start && departureOf(x, item as Experience) === slot).reduce((n, x) => n + x.party, 0);
          const prior = taken.get(key) ?? 0;
          if (existing + prior + d.party > (item as Experience).groupMax) failed.push({ index: j, reason: "unavailable" });
          taken.set(key, prior + d.party);
          return;
        }
        const units = (item as Listing | Vehicle).unitsAvailable;
        const days = eachDay(d.start, p.end, p.supply.kind === "car");
        const clash = days.some((day) => live.filter((x) => occupies(x, day)).length + (taken.get(`${item.id}|${day}`) ?? 0) >= units);
        if (clash) failed.push({ index: j, reason: "unavailable" });
        for (const day of days) taken.set(`${item.id}|${day}`, (taken.get(`${item.id}|${day}`) ?? 0) + 1);
      });

      // The trip's own stays must not overlap one another.
      drafts.forEach((a, i) =>
        drafts.forEach((b, j) => {
          if (j <= i || (a.flow !== "stay" && a.flow !== "rent") || (b.flow !== "stay" && b.flow !== "rent")) return;
          if (a.start < b.end && b.start < a.end) failed.push({ index: j, reason: "unavailable" });
        }),
      );
      if (failed.length) return { ok: false, failed };

      const sum = prepared.reduce((n, p) => n + (p ? convert(p.quote.total, "RWF", FX_RATES).minor : 0), 0);
      if (clientTotal.currency !== "RWF" || Math.abs(clientTotal.minor - sum) > drafts.length) {
        return { ok: false, failed: [{ index: -1, reason: "priceChanged" }] };
      }

      const tripId = nextId("trp");
      const bookings = [];
      for (const [i, d] of drafts.entries()) bookings.push(await commit(d, prepared[i]!, payment, notify, tripId));
      // Only the guest's own bookings join the trip; a reference is not proof
      // of ownership. Phase 2 checks the signed-in user here instead.
      // The same rule bookings.listForCurrentUser applies.
      const already = store().bookings.filter((b) => bookedReferences.includes(b.reference) && !OTHER_GUESTS(b));
      for (const b of already) b.tripId = tripId;
      const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(new Date(`${drafts[0].start}T00:00:00Z`));
      const trip = {
        id: tripId,
        name: `Kigali, ${month}`,
        displayCurrency: "RWF" as const,
        status: "booked" as const,
        bookingIds: [...bookings.map((b) => b.id), ...already.map((b) => b.id)],
      };
      store().trips.unshift(trip);
      return { ok: true, trip, bookings };
    },
  };
}
