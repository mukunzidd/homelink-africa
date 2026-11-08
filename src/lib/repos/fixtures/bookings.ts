import type {
  Booking,
  BookingEvent,
  Experience,
  Listing,
  NotificationKind,
  Role,
  ServiceKind,
  Vehicle,
} from "@/lib/domain/types";
import type { AvailabilityRepo, BookingRepo, NotificationsRepo } from "@/lib/repos/types";
import type { Quote } from "@/lib/domain/pricing";
import { bookingReference, quoteBooking } from "@/lib/domain/pricing";
import { formatMoney, money } from "@/lib/domain/money";
import { addDays, isIsoDate, nightsBetween } from "@/lib/domain/dates";
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
      const today = kigaliDay();
      const supply = supplyForDraft(draft);
      if (!supply || !isIsoDate(draft.start) || !isIsoDate(draft.end)) return { ok: false, reason: "invalid" };
      if (draft.start < today || (supply.kind !== "experience" && draft.end < draft.start)) {
        return { ok: false, reason: "invalid" };
      }
      if (!Number.isInteger(draft.party) || draft.party < 1) return { ok: false, reason: "invalid" };

      // Every step before pay, checked again here: the browser's say-so is not enough.
      const people: PeopleRules | undefined =
        supply.kind === "experience"
          ? { minAge: supply.item.minAge, requiresPermit: !!supply.item.requiresPermit }
          : undefined;
      const steps = STEPS[draft.flow].filter((s) => s !== "pay");
      if (!steps.every((s) => stepComplete(draft, s, people))) return { ok: false, reason: "invalid" };

      const quote = quoteFor(supply, draft, today);
      if (!quote) return { ok: false, reason: "invalid" };

      if (
        clientTotal.currency !== quote.total.currency ||
        Math.abs(clientTotal.minor - quote.total.minor) > 1
      ) {
        return { ok: false, reason: "priceChanged", quote };
      }

      const end = supply.kind === "experience" ? draft.start : draft.end;
      if (!(await availability.isFree(supply.item.id, draft.start, end, { party: draft.party }))) {
        return { ok: false, reason: "unavailable" };
      }

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

      return { ok: true, booking };
    },

    async cancel(reference, by, reason, today) {
      const b = find(reference);
      if (b.status === "cancelled") return b;
      const supply = supplyById(b.supplyItemId);
      const preview = refundPreview(b.service as ServiceKind, storedQuote(b), b.startDate, today, {
        hireDays: nightsBetween(b.startDate, b.endDate) + 1,
        permitShare: supply?.kind === "experience" ? supply.item.permitShare : undefined,
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

    async payments(bookingId) {
      return store()
        .payments.filter((p) => !bookingId || p.bookingId === bookingId)
        .sort((a, b) => b.at.localeCompare(a.at));
    },
  };
  return repo;
}
