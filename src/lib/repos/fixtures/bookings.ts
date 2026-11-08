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
      const taken = live.filter((b) => b.startDate === from).reduce((n, b) => n + b.party, 0);
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
    for (const date of dates) {
      if (!s.blocks.some((b) => b.supplyId === supplyId && b.date === date)) s.blocks.push({ supplyId, date, reason });
    }
  },

  async unblock(supplyId, dates) {
    const s = store();
    s.blocks = s.blocks.filter((b) => !(b.supplyId === supplyId && dates.includes(b.date)));
  },
};

/* -------------------------------------------------------------- bookings */

const fmt = (m: { minor: number; currency: "RWF" | "USD" | "EUR" | "GBP" }) => formatMoney(m, "en-US");

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

  const end = supply.kind === "experience" ? draft.start : draft.end;
  if (!(await availability.isFree(supply.item.id, draft.start, end, { party: draft.party }))) {
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
      return [...store().bookings];
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
      const ready = await prepare(draft);
      if (!ready.ok) return ready;
      if (clientTotal.currency !== ready.quote.total.currency || Math.abs(clientTotal.minor - ready.quote.total.minor) > 1) {
        return { ok: false, reason: "priceChanged", quote: ready.quote };
      }
      return { ok: true, booking: await commit(draft, ready, payment, notify) };
    },

    async cancel(reference, by, reason, today) {
      const b = find(reference);
      if (b.status === "cancelled") return b;
      const supply = supplyById(b.supplyItemId);
      const preview = refundPreview(b.service as ServiceKind, storedQuote(b), b.startDate, today, {
        hireDays: nightsBetween(b.startDate, b.endDate) + 1,
        // A permit is per person, so the share kept is one per head.
        permitShare:
          supply?.kind === "experience" && supply.item.permitShare
            ? money(supply.item.permitShare.minor * b.party, supply.item.permitShare.currency)
            : undefined,
      });
      b.status = "cancelled";
      b.cancelledAt = new Date().toISOString();
      b.cancelReason = reason;
      b.refund = preview.refund;
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
      recordAudit({ actor: by, action: "booking.cancel", target: b.reference, detail: reason });
      return b;
    },

    async changeDates(reference, start, end, today) {
      const b = find(reference);
      const supply = supplyById(b.supplyItemId);
      if (!supply || !isIsoDate(start) || !isIsoDate(end) || start < today || end < start) {
        return { ok: false, reason: "invalid" };
      }
      if (supply.kind === "stay" && nightsBetween(start, end) < 1) return { ok: false, reason: "invalid" };
      const free = await availability.isFree(supply.item.id, start, end, { party: b.party, exceptBookingId: b.id });
      if (!free) return { ok: false, reason: "unavailable" };

      const after = quoteBooking(
        supply.item,
        { kind: supply.kind, start, end, party: b.party, driveMode: b.driveMode, extras: b.extras, promoCode: b.promoCode },
        today,
      );
      if (!after) return { ok: false, reason: "invalid" };
      const difference = money(after.total.minor - b.total.minor, b.total.currency);

      b.startDate = start;
      b.endDate = end;
      b.total = after.total;
      b.lines = after.lines;
      b.escrowHeld = after.escrowHeld;
      b.timeline = [...(b.timeline ?? []), event("datesChanged", "guest", `${start} → ${end}`)];
      if (difference.minor !== 0) {
        store().payments.push({
          id: nextId("pmt"),
          bookingId: b.id,
          rail: "card",
          kind: difference.minor > 0 ? "change" : "refund",
          amount: money(Math.abs(difference.minor), difference.currency),
          status: "succeeded",
          at: new Date().toISOString(),
        });
      }
      recordAudit({ actor: "guest", action: "booking.changeDates", target: b.reference });
      return { ok: true, booking: b, difference };
    },

    async addEvent(reference, e) {
      const b = find(reference);
      b.timeline = [...(b.timeline ?? []), { ...e, at: new Date().toISOString() }];
      return b;
    },

    async addGuests(reference, party) {
      const b = find(reference);
      const supply = supplyById(b.supplyItemId);
      const max = supply?.kind === "stay" ? supply.item.sleeps : supply?.kind === "car" ? supply.item.seats : supply?.kind === "experience" ? supply.item.groupMax : 0;
      if (!Number.isInteger(party) || party < 1 || party > max) throw new Error(`Party of ${party} does not fit`);
      // Only before it starts: a party is what was planned, not a tally.
      if (b.status !== "confirmed" || b.startDate <= kigaliDay()) throw new Error("Too late to change the party");
      if (party === b.party) return b;
      // A day out is priced per person, so more people cost more; a stay or
      // a hire is not, and its price stays as it is.
      if (supply?.kind === "experience") {
        const q = quoteBooking(supply.item, { kind: "experience", start: b.startDate, end: b.startDate, party, promoCode: b.promoCode }, kigaliDay());
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
      b.timeline = [...(b.timeline ?? []), event("guestsAdded", "guest", `${b.party} → ${party}`)];
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

    async payments(bookingId) {
      return store()
        .payments.filter((p) => !bookingId || p.bookingId === bookingId)
        .sort((a, b) => b.at.localeCompare(a.at));
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
      const prepared: Prepared[] = [];
      const failed: { index: number; reason: "unavailable" | "invalid" | "priceChanged" }[] = [];
      for (const [index, d] of drafts.entries()) {
        const r = await prepare(d);
        if (r.ok) prepared.push(r);
        else failed.push({ index, reason: r.reason });
      }
      // The trip's own stays must not overlap one another.
      drafts.forEach((a, i) =>
        drafts.forEach((b, j) => {
          if (j <= i || (a.flow !== "stay" && a.flow !== "rent") || (b.flow !== "stay" && b.flow !== "rent")) return;
          if (a.start < b.end && b.start < a.end) failed.push({ index: j, reason: "unavailable" });
        }),
      );
      if (failed.length) return { ok: false, failed };

      const sum = prepared.reduce((n, p) => n + convert(p.quote.total, "RWF", FX_RATES).minor, 0);
      if (clientTotal.currency !== "RWF" || Math.abs(clientTotal.minor - sum) > drafts.length) {
        return { ok: false, failed: [{ index: -1, reason: "priceChanged" }] };
      }

      const tripId = nextId("trp");
      const bookings = [];
      for (const [i, d] of drafts.entries()) bookings.push(await commit(d, prepared[i], payment, notify, tripId));
      const already = store().bookings.filter((b) => bookedReferences.includes(b.reference));
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
