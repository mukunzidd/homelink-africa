import type {
  DriveMode,
  ExtraSelection,
  GuestDetails,
  Participant,
  PaymentRail,
  RentApplication,
} from "@/lib/domain/types";
import type { IsoDate } from "@/lib/domain/dates";
import { FLIGHT, VALID } from "./validation";

/**
 * A booking in progress: everything the guest has said so far, step by step.
 *
 * Kept in the browser's sessionStorage until it is paid (see use-draft), and
 * checked again on the server when it is. The steps differ by lane, the
 * shape does not: a car asks about the driver first, a day out about the
 * people, a long-term stay for an application and a signature.
 */

export type FlowKind = "stay" | "rent" | "car" | "experience" | "trip";
export type StepKey = "driver" | "people" | "details" | "application" | "extras" | "review" | "agreement" | "pay";

export const STEPS: Record<FlowKind, readonly StepKey[]> = {
  stay: ["details", "extras", "review", "pay"],
  rent: ["details", "application", "review", "agreement", "pay"],
  car: ["driver", "details", "extras", "review", "pay"],
  experience: ["people", "details", "review", "pay"],
  trip: ["details", "extras", "review", "pay"],
};

export type Pickup = { kind: "airport" | "hotel" | "address"; detail: string; flight?: string };

export type BookingDraft = {
  id: string;
  flow: FlowKind;
  slug: string;
  start: IsoDate;
  end: IsoDate;
  party: number;
  driveMode?: DriveMode;
  slot?: string;
  pickup?: Pickup;
  licenceFileName?: string;
  dietary?: string;
  guest: Partial<GuestDetails>;
  participants: Participant[];
  extras: ExtraSelection[];
  promoCode?: string;
  acceptedRules: boolean;
  application?: RentApplication;
  agreement?: { signedName: string; agreedAt: string };
  plan: "full" | "deposit";
  rail: PaymentRail;
  /** ISO instant the 15-minute hold started. */
  holdStartedAt: string;
};

export type DraftAction =
  | { type: "guest"; value: Partial<GuestDetails> }
  | { type: "participants"; value: Participant[] }
  | { type: "extras"; value: ExtraSelection[] }
  | { type: "promo"; value: string | undefined }
  | { type: "acceptRules"; value: boolean }
  | { type: "application"; value: RentApplication }
  | { type: "sign"; signedName: string; at: string }
  | { type: "plan"; value: "full" | "deposit" }
  | { type: "rail"; value: PaymentRail }
  | { type: "driveMode"; value: DriveMode }
  | { type: "pickup"; value: Pickup | undefined }
  | { type: "slot"; value: string }
  | { type: "licence"; fileName: string | undefined }
  | { type: "dietary"; value: string }
  | { type: "restartHold"; at: string };

/** Stable for the same lane, item, dates and party, so a refresh finds the same draft. */
export function draftId(flow: FlowKind, slug: string, start: IsoDate, end: IsoDate, party: number): string {
  const seed = `${flow}|${slug}|${start}|${end}|${party}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `d${h.toString(36)}`;
}

export function newDraft(
  init: Pick<BookingDraft, "flow" | "slug" | "start" | "end" | "party">,
  now: Date,
): BookingDraft {
  return {
    ...init,
    id: draftId(init.flow, init.slug, init.start, init.end, init.party),
    guest: {},
    participants: [],
    extras: [],
    acceptedRules: false,
    plan: "full",
    rail: "card",
    holdStartedAt: now.toISOString(),
  };
}

export function draftReducer(d: BookingDraft, a: DraftAction): BookingDraft {
  switch (a.type) {
    case "guest":
      return { ...d, guest: { ...d.guest, ...a.value } };
    case "participants":
      return { ...d, participants: a.value };
    case "extras":
      return { ...d, extras: a.value };
    case "promo":
      return { ...d, promoCode: a.value?.trim() ? a.value.trim().toUpperCase() : undefined };
    case "acceptRules":
      return { ...d, acceptedRules: a.value };
    case "application":
      return { ...d, application: a.value };
    case "sign":
      return { ...d, agreement: { signedName: a.signedName, agreedAt: a.at } };
    case "plan":
      return { ...d, plan: a.value };
    case "rail":
      return { ...d, rail: a.value };
    case "driveMode":
      return { ...d, driveMode: a.value };
    case "pickup":
      return { ...d, pickup: a.value };
    case "slot":
      return { ...d, slot: a.value };
    case "licence":
      return { ...d, licenceFileName: a.fileName };
    case "dietary":
      return { ...d, dietary: a.value };
    case "restartHold":
      return { ...d, holdStartedAt: a.at };
  }
}

const norm = (s: string | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** What a lane's item asks of the people step; only days out have one. */
export type PeopleRules = { minAge: number; requiresPermit: boolean };

export function stepComplete(d: BookingDraft, step: StepKey, people?: PeopleRules): boolean {
  switch (step) {
    case "details": {
      const g = d.guest;
      const ok =
        VALID["guest-name"](g.name ?? "") &&
        VALID["guest-email"](g.email ?? "") &&
        VALID["guest-phone"](g.phone ?? "");
      return ok && (!g.forSomeoneElse || (g.travellerName ?? "").trim().length >= 2);
    }
    case "driver": {
      if (!d.driveMode) return false;
      if (d.driveMode === "selfDrive" && !d.licenceFileName) return false;
      const flight = d.pickup?.flight?.trim().toUpperCase();
      return !flight || FLIGHT.test(flight);
    }
    case "people": {
      const rules = people ?? { minAge: 0, requiresPermit: false };
      if (!d.slot || d.participants.length !== d.party) return false;
      return d.participants.every(
        (p) =>
          p.name.trim().length >= 2 &&
          Number.isInteger(p.age) &&
          p.age >= Math.max(rules.minAge, 0) &&
          p.age <= 110 &&
          (!rules.requiresPermit || ((p.nationality ?? "").length > 0 && (p.passport ?? "").trim().length >= 5)),
      );
    }
    case "application": {
      const a = d.application;
      return !!a && a.occupants >= 1 && a.employer.trim().length >= 2 && !!a.incomeBand && !!a.moveIn && a.months >= 1;
    }
    case "extras":
      return true;
    case "review":
      return d.acceptedRules;
    case "agreement":
      return !!d.agreement && norm(d.agreement.signedName) === norm(d.guest.name) && norm(d.guest.name).length > 0;
    case "pay":
      return false;
  }
}

export function firstIncompleteStep(d: BookingDraft, people?: PeopleRules): StepKey {
  return STEPS[d.flow].find((s) => !stepComplete(d, s, people)) ?? "pay";
}

/** A step can be opened once every step before it is done. */
export function canEnter(d: BookingDraft, step: StepKey, people?: PeopleRules): boolean {
  const steps = STEPS[d.flow];
  const i = steps.indexOf(step);
  if (i < 0) return false;
  return steps.slice(0, i).every((s) => stepComplete(d, s, people));
}
