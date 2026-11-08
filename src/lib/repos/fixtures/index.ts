import type {
  AuditRepo,
  ExperiencesRepo,
  FxRepo,
  MessagingRepo,
  MobilityRepo,
  NotificationsRepo,
  OpsRepo,
  Repositories,
  SalesRepo,
  StaysRepo,
  TripRepo,
} from "@/lib/repos/types";
import type { Conversation, HousekeepingTask, Listing, PartnerJob, Role, SharedLocation, StaffMember } from "@/lib/domain/types";
import { turnoverTasks } from "@/lib/workspace/day-board";
import { readsAs } from "@/lib/preferences/role";
import { convert, formatMoney, money, type Money } from "@/lib/domain/money";
import { listingPatchErrors } from "@/lib/workspace/listing-patch";
import { addDays, isIsoDate, nightsBetween } from "@/lib/domain/dates";
import { CHECKLIST } from "@/lib/workspace/inspection";
import { FX_RATES } from "./data";
import { kigaliDay } from "@/lib/domain/instants";
import { nextId, recordAudit, store } from "./store";
import { availability, makeBookings, makeTrips } from "./bookings";
import { MESSAGE_LIMITS, type IncidentsRepo, type AdminRepo, type FinanceRepo, type PartnersRepo, type SiteSettings, type RatesRepo, type ReviewsRepo, type ViewingsRepo, type WorkRepo } from "@/lib/repos/types";
import type { Review } from "@/lib/domain/types";
import { NOTIFICATION_CATALOG, defaultPrefs } from "@/lib/notifications/catalog";

/**
 * In-memory implementations for Phase 1.
 *
 * Deliberately dumb: filtering happens in plain array operations because the
 * Supabase implementation will push all of it into SQL anyway. What matters
 * here is that the *signatures* are right, not that the filtering is fast.
 */

/** Homes the public may see: anything not explicitly unpublished. */
const live = () => store().listings.filter((l) => l.published !== false);

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "home";

const stays: StaysRepo = {
  async all() {
    return [...store().listings];
  },

  async update(id, patch) {
    const l = store().listings.find((x) => x.id === id);
    if (!l) throw new Error(`No listing ${id}`);
    const errors = listingPatchErrors(patch, l);
    if (errors.length) throw new Error(`Invalid: ${errors.join(", ")}`);
    Object.assign(l, structuredClone(patch));
    return l;
  },

  async create({ name, neighbourhood }) {
    const base = slugify(name);
    let slug = base;
    for (let i = 2; store().listings.some((l) => l.slug === slug); i++) slug = `${base}-${i}`;
    const made: Listing = {
      id: nextId("lst"),
      slug,
      name: name.trim(),
      neighbourhood: neighbourhood.trim(),
      city: "Kigali",
      location: { lat: -1.9441, lng: 30.0619 },
      bedrooms: 1,
      sleeps: 2,
      amenities: [],
      nightlyRate: money(50_000, "RWF"),
      modes: ["nightly"],
      // Not inspected yet: no inspector, no points. It cannot go live like this.
      verification: { id: `ver_${slug}`, inspectorName: "", inspectedAt: new Date().toISOString().slice(0, 10), checklistPoints: 0, photographedByHomeLink: false, ownerIdentityConfirmed: false },
      propertyManager: { name: "", since: new Date().toISOString().slice(0, 10) },
      houseRules: [],
      imageSeed: slug,
      images: [],
      summary: "",
      unitsAvailable: 1,
      published: false,
    };
    store().listings.push(made);
    return made;
  },

  async setPublished(id, published) {
    const l = store().listings.find((x) => x.id === id);
    if (!l) throw new Error(`No listing ${id}`);
    // Nothing unverified is ever listed: a home goes live only once someone has stood in it.
    if (published && (!l.verification.inspectorName || l.verification.checklistPoints < 1)) throw new Error("Not inspected");
    l.published = published;
    return l;
  },

  async list(query = {}) {
    let out = live();

    if (query.neighbourhood) {
      const needle = query.neighbourhood.trim().toLowerCase();
      // Contains rather than equals: the field is a free-text combobox, so
      // "kacy" and "Kacyiru " both have to find the same place.
      out = out.filter((l) => l.neighbourhood.toLowerCase().includes(needle));
    }
    if (query.minBedrooms !== undefined) {
      out = out.filter((l) => l.bedrooms >= query.minBedrooms!);
    }
    if (query.minSleeps !== undefined) {
      out = out.filter((l) => l.sleeps >= query.minSleeps!);
    }
    if (query.amenities?.length) {
      out = out.filter((l) =>
        query.amenities!.every((a) => l.amenities.includes(a as never)),
      );
    }
    if (query.band === "long") {
      out = out.filter((l) => l.modes.includes("lease"));
    } else {
      out = out.filter((l) => l.modes.includes("nightly"));
    }
    if (query.maxPrice) {
      const ceiling = query.maxPrice;
      const lease = query.band === "long";
      out = out.filter((l) => {
        const rate = lease ? l.monthlyRate : l.nightlyRate;
        return !!rate && rate.minor <= convert(ceiling, rate.currency, FX_RATES).minor;
      });
    }
    // `verifiedOnly` is a no-op today: nothing unverified is ever listed.
    // The filter exists because Phase 3 opens a vetted-marketplace lane.

    const byNewest = (a: (typeof out)[number], b: (typeof out)[number]) =>
      b.verification.inspectedAt.localeCompare(a.verification.inspectedAt);

    switch (query.sort) {
      case "priceAsc":
        out.sort((a, b) => a.nightlyRate.minor - b.nightlyRate.minor);
        break;
      case "priceDesc":
        out.sort((a, b) => b.nightlyRate.minor - a.nightlyRate.minor);
        break;
      case "newest":
        out.sort(byNewest);
        break;
      case "size":
        out.sort((a, b) => b.bedrooms - a.bedrooms);
        break;
      default:
        // "Recommended" is recency of verification until there is behaviour to
        // rank on. Named honestly rather than dressed up as an algorithm.
        out.sort(byNewest);
    }

    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return live().find((l) => l.slug === slug) ?? null;
  },

  async byId(id) {
    return store().listings.find((l) => l.id === id) ?? null;
  },

  async featured(limit = 3) {
    // Admin's picks first, in admin's order; the most recently inspected fill the rest.
    const picks = store().content.featured.map((id) => live().find((l) => l.id === id)).filter((l): l is Listing => !!l);
    const rest = live()
      .filter((l) => !picks.includes(l))
      .sort((a, b) => b.verification.inspectedAt.localeCompare(a.verification.inspectedAt));
    return [...picks, ...rest].slice(0, limit);
  },

  async neighbourhoods() {
    return [...new Set(live().map((l) => l.neighbourhood))].sort((a, b) =>
      a.localeCompare(b),
    );
  },

  async neighbourhoodsWithCounts() {
    const counts = new Map<string, number>();
    for (const l of live()) {
      counts.set(l.neighbourhood, (counts.get(l.neighbourhood) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },
};

const SALE_STATUS = ["onMarket", "underOffer", "sold"] as const;

const sales: SalesRepo = {
  async all() {
    return [...store().sales];
  },
  async update(id, patch) {
    const h = store().sales.find((x) => x.id === id);
    if (!h) throw new Error(`No home ${id}`);
    if (patch.price && (patch.price.currency !== h.price.currency || !Number.isInteger(patch.price.minor) || patch.price.minor <= 0)) throw new Error("Bad price");
    if (patch.saleStatus !== undefined && !SALE_STATUS.includes(patch.saleStatus as never)) throw new Error("Bad status");
    if (patch.price) h.price = { ...patch.price };
    if (patch.saleStatus) h.saleStatus = patch.saleStatus;
    return h;
  },
  async list(query = {}) {
    let out = store().sales.filter((h) => h.saleStatus !== "sold");
    if (query.neighbourhood) {
      const needle = query.neighbourhood.trim().toLowerCase();
      out = out.filter((h) => h.neighbourhood.toLowerCase().includes(needle));
    }
    if (query.minBedrooms !== undefined) out = out.filter((h) => h.bedrooms >= query.minBedrooms!);
    if (query.kind) out = out.filter((h) => h.kind === query.kind);
    if (query.maxPrice) {
      const ceiling = query.maxPrice;
      out = out.filter((h) => h.price.minor <= convert(ceiling, h.price.currency, FX_RATES).minor);
    }
    switch (query.sort) {
      case "priceAsc":
        out.sort((a, b) => a.price.minor - b.price.minor);
        break;
      case "priceDesc":
        out.sort((a, b) => b.price.minor - a.price.minor);
        break;
      case "size":
        out.sort((a, b) => b.floorSqm - a.floorSqm);
        break;
      default:
        // Recommended is newest on the market, named for what it is.
        out.sort((a, b) => b.listedAt.localeCompare(a.listedAt));
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },
  async bySlug(slug) {
    return store().sales.find((h) => h.slug === slug) ?? null;
  },
  async byId(id) {
    return store().sales.find((h) => h.id === id) ?? null;
  },
  async neighbourhoods() {
    return [...new Set(store().sales.map((h) => h.neighbourhood))].sort((a, b) => a.localeCompare(b));
  },
};

const mobility: MobilityRepo = {
  async list(query = {}) {
    let out = [...store().vehicles];
    if (query.driveMode) {
      out = out.filter((v) => v.driveModes.includes(query.driveMode!));
    }
    if (query.minSeats !== undefined) {
      out = out.filter((v) => v.seats >= query.minSeats!);
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return store().vehicles.find((v) => v.slug === slug) ?? null;
  },

  async byId(id) {
    return store().vehicles.find((v) => v.id === id) ?? null;
  },
};

const experiences: ExperiencesRepo = {
  async list(query = {}) {
    let out = [...store().experiences];
    if (query.interest) {
      out = out.filter((e) => e.interests.includes(query.interest!));
    }
    if (query.maxDurationHours !== undefined) {
      out = out.filter((e) => e.durationHours <= query.maxDurationHours!);
    }
    return query.limit ? out.slice(0, query.limit) : out;
  },

  async bySlug(slug) {
    return store().experiences.find((e) => e.slug === slug) ?? null;
  },

  async byId(id) {
    return store().experiences.find((e) => e.id === id) ?? null;
  },
};

/** Newest first, so "coming up" and "earlier" both read outward from today. */

const tripReads: Pick<TripRepo, "listForCurrentUser" | "byId"> = {
  async listForCurrentUser() {
    return [...store().trips];
  },
  async byId(id) {
    return store().trips.find((t) => t.id === id) ?? null;
  },
};

/**
 * Unread is a fact about a reader, not about a thread.
 *
 * Your own messages are never unread to you, and a message someone else has
 * already opened is not unread to them. Phase 2 stores read receipts per
 * participant; the fixture approximates it with one `readAt` per message,
 * which is enough to make the state visible on the screen.
 */
function unreadFor(conversationId: string, role: Role): number {
  const reader = readsAs(role);
  return store().messages.filter(
    (m) => m.conversationId === conversationId && m.authorRole !== reader && !m.readAt,
  ).length;
}

function visibleTo(role: Role) {
  const reader = readsAs(role);
  // Admin runs the homes and the desk both, so it is in every room.
  return (c: Conversation) =>
    reader === "admin" || c.participantRoles.includes(reader);
}

function forReader(c: Conversation, role: Role) {
  return { ...c, unreadCount: unreadFor(c.id, role) };
}

const messaging: MessagingRepo = {
  async forRole(role) {
    return store().conversations.filter(visibleTo(role))
      .map((c) => forReader(c, role))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  },

  async byId(conversationId, role) {
    const found = store().conversations.find(
      (c) => c.id === conversationId && visibleTo(role)(c),
    );
    return found ? forReader(found, role) : null;
  },

  async messages(conversationId) {
    return store().messages.filter((m) => m.conversationId === conversationId).sort((a, b) =>
      a.sentAt.localeCompare(b.sentAt),
    );
  },

  async forBooking(bookingId, role) {
    const found = store().conversations.find(
      (c) =>
        c.scope.kind === "booking" &&
        c.scope.id === bookingId &&
        visibleTo(role)(c),
    );
    return found ? forReader(found, role) : null;
  },

  async send(conversationId, role, input) {
    const c = store().conversations.find((x) => x.id === conversationId && visibleTo(role)(x));
    if (!c) throw new Error("Not in this thread");
    const body = input.body.trim().slice(0, MESSAGE_LIMITS.body);
    const wanted = input.attachments ?? [];
    if (wanted.length > MESSAGE_LIMITS.photos) throw new Error("Too many photos");
    const held = wanted.map((a) => {
      const u = store().uploads.find((x) => x.id === a.id && x.conversationId === c.id && x.by === role && !x.messageId);
      if (!u) throw new Error("No such photo");
      return { u, alt: a.alt.trim().slice(0, 200) };
    });
    const location = input.location ? cleanLocation(input.location) : undefined;
    if (!body && !held.length && !location) throw new Error("Nothing to send");

    const reader = readsAs(role);
    const at = new Date().toISOString();
    const i = c.participantRoles.indexOf(reader);
    const authorName = i >= 0 ? c.participantNames[i] : "HomeLink";
    const id = nextId("msg");
    const message = {
      id,
      conversationId: c.id,
      authorName,
      authorRole: reader,
      body,
      sentAt: at,
      ...(location ? { location } : {}),
      ...(held.length
        ? { attachments: held.map(({ u, alt }) => ({ id: u.id, url: fileUrl(u.id), alt })) }
        : {}),
    };
    for (const { u } of held) u.messageId = id;
    store().messages.push(message);
    c.lastMessagePreview = body
      ? body.slice(0, 120)
      : location
        ? `📍 ${location.name || location.address || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}`.slice(0, 120)
        : `📷 ${held.length}`;
    c.lastMessageAt = at;

    // Everyone else in the room hears about it; admin is in every room by
    // visibility, but is only told about threads it is a party to.
    for (const audience of new Set(c.participantRoles.filter((r) => r !== reader))) {
      await notifications.create({
        audience,
        kind: "newMessage",
        params: { from: authorName, subject: c.subject },
        href: audience === "guest" ? `/messages?thread=${c.id}` : `/manage/inbox?thread=${c.id}`,
      });
    }
    return message;
  },

  async upload(conversationId, role, file) {
    const c = store().conversations.find((x) => x.id === conversationId && visibleTo(role)(x));
    if (!c) throw new Error("Not in this thread");
    if (!(MESSAGE_LIMITS.mimes as readonly string[]).includes(file.mime) || sniff(file.bytes) !== file.mime) throw new Error("Not a photo");
    if (file.bytes.byteLength > MESSAGE_LIMITS.bytes) throw new Error("Too big");
    // Unsent photos are held in memory; without a ceiling a loop of uploads
    // that never sends is a way to fill it.
    const pending = store().uploads.filter((u) => u.conversationId === c.id && u.by === role && !u.messageId).length;
    if (pending >= MESSAGE_LIMITS.pending) throw new Error("Too many unsent photos");
    const id = nextId("upl");
    store().uploads.push({ id, conversationId: c.id, by: role, mime: file.mime, bytes: file.bytes });
    return { id, url: fileUrl(id) };
  },

  async file(id, role) {
    const u = store().uploads.find((x) => x.id === id);
    if (!u) return null;
    const c = store().conversations.find((x) => x.id === u.conversationId && visibleTo(role)(x));
    // Before it is sent, a photo is only its uploader's.
    if (!c || (!u.messageId && u.by !== role)) return null;
    return { mime: u.mime, bytes: u.bytes };
  },

  async markRead(conversationId, role) {
    const c = store().conversations.find((x) => x.id === conversationId && visibleTo(role)(x));
    if (!c) return 0;
    const reader = readsAs(role);
    const at = new Date().toISOString();
    let n = 0;
    for (const m of store().messages) {
      if (m.conversationId === c.id && m.authorRole !== reader && !m.readAt) {
        m.readAt = at;
        n++;
      }
    }
    return n;
  },
};

/** A point on the earth with short text, or a throw. */
function cleanLocation(l: SharedLocation): SharedLocation {
  const lat = Number(l.lat);
  const lng = Number(l.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error("Not a place");
  const name = typeof l.name === "string" ? l.name.trim().slice(0, 120) : "";
  const address = typeof l.address === "string" ? l.address.trim().slice(0, 200) : "";
  // Six decimals is ten centimetres; anything finer is noise from the phone.
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round(lat), lng: round(lng), ...(name ? { name } : {}), ...(address ? { address } : {}) };
}

const fileUrl = (id: string) => `/api/messages/files/${id}`;

/** What the bytes say they are; the browser's word for it is not enough. */
function sniff(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/**
 * Ordered by what still needs doing, then oldest first inside that.
 *
 * Sorting by date alone was tried and looked wrong the moment it was on a
 * screen: the oldest verification task is the one that shipped a week ago, so
 * a queue sorted by age leads with finished work and buries the two rows
 * nobody has touched. Same for payouts, where the March ones that are already
 * paid pushed November's held money off the bottom.
 *
 * Age still decides within a state, because a queue sorted newest-first is a
 * queue whose bottom never gets read.
 */
const VERIFY_ORDER = ["requested", "scheduled", "inspected", "published"];
const PAYOUT_ORDER = ["held", "due", "paid"];
const REQUEST_ORDER = ["open", "quoted", "arranged", "declined"];

function byState<T>(order: string[], stateOf: (item: T) => string) {
  return (a: T, b: T) => order.indexOf(stateOf(a)) - order.indexOf(stateOf(b));
}

/** The desk's people. Phase 2 reads them from staff accounts. */
const TEAM = ["Aline M.", "Patrick N.", "Claudine U.", "Eric H."];

function findAsk(id: string) {
  const a = store().addOnRequests.find((x) => x.id === id);
  if (!a) throw new Error(`No ask ${id}`);
  return a;
}

function findTask(id: string) {
  const t = store().verificationQueue.find((x) => x.id === id);
  if (!t) throw new Error(`No inspection ${id}`);
  return t;
}

/**
 * Posts into the guest's thread on a booking, opening one if the booking has
 * none yet: a quote the guest cannot see is not a quote.
 */
function postToGuest(bookingId: string, authorName: string, authorRole: Role, body: string) {
  const b = store().bookings.find((x) => x.id === bookingId);
  if (!b) throw new Error("No such booking");
  const at = new Date().toISOString();
  // Only the guest and the desk: a driver or guide on the same booking
  // shares other threads, and must not read what the guest is charged.
  let c = store().conversations.find(
    (x) => x.scope.kind === "booking" && x.scope.id === bookingId && x.participantRoles.includes("guest") && x.participantRoles.every((r) => r === "guest" || r === "ops" || r === "admin"),
  );
  if (!c) {
    c = {
      id: nextId("cnv"),
      subject: b.title,
      scope: { kind: "booking", id: bookingId },
      participantNames: [b.guest?.name ?? "Guest", "HomeLink"],
      participantRoles: ["guest", "ops"],
      lastMessagePreview: "",
      lastMessageAt: at,
      unreadCount: 0,
    };
    store().conversations.push(c);
  }
  store().messages.push({ id: nextId("msg"), conversationId: c.id, authorName, authorRole, body, sentAt: at });
  c.lastMessagePreview = body.slice(0, 120);
  c.lastMessageAt = at;
  return c;
}

const ops: OpsRepo = {
  async team() {
    return TEAM;
  },

  async updateAsk(id, by, patch) {
    const a = findAsk(id);
    if (patch.owner !== undefined && !TEAM.includes(patch.owner)) throw new Error("Not on the team");
    if (patch.owner !== undefined) a.owner = patch.owner;
    if (patch.status) a.status = patch.status;
    recordAudit({ actor: by, action: "ask.update", target: id, detail: JSON.stringify(patch) });
    return a;
  },

  async quoteAsk(id, by, price, note) {
    const a = findAsk(id);
    if (!Number.isInteger(price.minor) || price.minor <= 0) throw new Error("A quote needs a price");
    a.quote = price;
    a.quoteNote = note.trim().slice(0, 300);
    a.status = "quoted";
    const amount = formatMoney(price, "en-RW");
    postToGuest(a.bookingId, a.owner ?? "HomeLink", readsAs(by), `${a.quoteNote ? `${a.quoteNote}. ` : ""}We can arrange this for ${amount}. Reply here to go ahead, or to change anything.`);
    recordAudit({ actor: by, action: "ask.quote", target: id, detail: amount });
    return a;
  },

  async scheduleInspection(id, by, date, inspector, today) {
    const t = findTask(id);
    if (!isIsoDate(date) || date < today || !TEAM.includes(inspector) || t.status === "published") return { ok: false, reason: "invalid" };
    t.scheduledFor = date;
    t.inspectorName = inspector;
    if (t.status === "requested") t.status = "scheduled";
    recordAudit({ actor: by, action: "inspection.schedule", target: id, detail: `${date} ${inspector}` });
    return { ok: true };
  },

  async recordInspection(id, by, checklist, notes) {
    const t = findTask(id);
    if (t.status !== "scheduled" && t.status !== "inspected") throw new Error("Schedule the visit first");
    t.checklist = Object.fromEntries(CHECKLIST[t.service].map((k) => [k, checklist[k] === true]));
    t.inspectionNotes = notes.trim().slice(0, 1000);
    t.status = "inspected";
    recordAudit({ actor: by, action: "inspection.record", target: id });
    return t;
  },

  async publishInspection(id, by) {
    const t = findTask(id);
    if (t.status !== "inspected") return { ok: false, reason: "notInspected" };
    t.status = "published";
    let draftId: string | undefined;
    if (t.kind === "new") {
      draftId = nextId("drf");
      store().drafts.push({ id: draftId, taskId: t.id, service: t.service, name: t.name, where: t.where, createdAt: new Date().toISOString() });
      t.draftId = draftId;
    }
    recordAudit({ actor: by, action: "inspection.publish", target: id });
    return { ok: true, draftId };
  },

  async drafts() {
    return [...store().drafts].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async verificationQueue() {
    return [...store().verificationQueue].sort(
      (a, b) =>
        byState(VERIFY_ORDER, (t: typeof a) => t.status)(a, b) ||
        a.requestedAt.localeCompare(b.requestedAt),
    );
  },
  async addOnRequests() {
    return [...store().addOnRequests].sort(
      (a, b) =>
        byState(REQUEST_ORDER, (r: typeof a) => r.status)(a, b) ||
        a.requestedAt.localeCompare(b.requestedAt),
    );
  },
  async payouts() {
    return [...store().payouts].sort(
      (a, b) =>
        byState(PAYOUT_ORDER, (p: typeof a) => p.status)(a, b) ||
        // Settled rows read most-recent-first; outstanding ones read soonest.
        (a.status === "paid"
          ? b.releaseOn.localeCompare(a.releaseOn)
          : a.releaseOn.localeCompare(b.releaseOn)),
    );
  },
};

const fx: FxRepo = {
  async rates() {
    return store().settings.fxDisplay;
  },
  base() {
    return "RWF";
  },
};

const notifications: NotificationsRepo = {
  async forRole(role, filter = {}) {
    return store()
      .notifications.filter(
        (n) =>
          n.audience === role &&
          (!filter.category || n.category === filter.category) &&
          (!filter.unreadOnly || !n.readAt),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async unreadCount(role) {
    return store().notifications.filter((n) => n.audience === role && !n.readAt).length;
  },

  async markRead(role, ids) {
    const at = new Date().toISOString();
    let marked = 0;
    for (const n of store().notifications) {
      // Another role's id is skipped silently: an error would confirm it exists.
      if (n.audience === role && !n.readAt && ids.includes(n.id)) {
        n.readAt = at;
        marked++;
      }
    }
    return marked;
  },

  async markAllRead(role) {
    const ids = store().notifications.filter((n) => n.audience === role && !n.readAt).map((n) => n.id);
    return notifications.markRead(role, ids);
  },

  async create(input) {
    const entry = NOTIFICATION_CATALOG[input.kind];
    if (!entry || !entry.audiences.includes(input.audience)) {
      throw new Error(`${input.kind} is not sent to ${input.audience}`);
    }
    const made = {
      ...input,
      id: nextId("ntf"),
      category: entry.category,
      createdAt: new Date().toISOString(),
    };
    store().notifications.push(made);
    return made;
  },

  async prefs(role) {
    const s = store();
    s.prefs[role] ??= defaultPrefs(role);
    return structuredClone(s.prefs[role]);
  },

  async setPrefs(role, prefs) {
    store().prefs[role] = structuredClone(prefs);
  },
};

const audit: AuditRepo = {
  async record(entry) {
    return recordAudit(entry);
  },
  async list(filter = {}) {
    return store()
      .audit.filter(
        (e) =>
          (!filter.actor || e.actor === filter.actor) &&
          (!filter.action || e.action.startsWith(filter.action)) &&
          (!filter.from || e.at >= filter.from) &&
          (!filter.to || e.at <= filter.to),
      )
      .sort((a, b) => b.at.localeCompare(a.at));
  },
};

const bookings = makeBookings(notifications);
const trips = makeTrips(notifications, tripReads);

const incidents: IncidentsRepo = {
  async forBooking(bookingId) {
    return store().incidents.filter((i) => i.bookingId === bookingId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async all() {
    return [...store().incidents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async create(input) {
    const b = store().bookings.find((x) => x.id === input.bookingId);
    if (!b) throw new Error("No such booking");
    const made = {
      ...input,
      description: input.description.slice(0, 1000),
      id: nextId("inc"),
      status: "open" as const,
      createdAt: new Date().toISOString(),
    };
    store().incidents.push(made);
    b.timeline = [...(b.timeline ?? []), { at: made.createdAt, kind: "issueReported", actor: "guest", note: input.category }];
    for (const audience of ["ops", "admin"] as const) {
      await notifications.create({
        audience,
        kind: "newIncident",
        params: { name: b.title, category: input.category },
        href: "/manage/incidents",
      });
    }
    return made;
  },
  async update(id, patch) {
    const i = store().incidents.find((x) => x.id === id);
    if (!i) throw new Error(`No incident ${id}`);
    // Named fields only: whatever else a caller sends is ignored.
    if (patch.status !== undefined) {
      if (!["open", "inProgress", "resolved"].includes(patch.status)) throw new Error("No such status");
      i.status = patch.status;
    }
    if (patch.assignee !== undefined) {
      if (typeof patch.assignee !== "string" || (patch.assignee !== "" && !TEAM.includes(patch.assignee))) throw new Error("Not on the team");
      i.assignee = patch.assignee || undefined;
    }
    return i;
  },

  async toTicket(id, by) {
    const i = store().incidents.find((x) => x.id === id);
    if (!i) throw new Error(`No incident ${id}`);
    if (i.ticketId) return store().tickets.find((t) => t.id === i.ticketId) ?? null;
    const b = store().bookings.find((x) => x.id === i.bookingId);
    if (!b || b.service !== "stay") return null;
    const ticket = await work.createTicket({
      listingId: b.supplyItemId,
      bookingId: b.id,
      title: i.description.slice(0, 80),
      description: i.description,
      photoName: i.photoName,
      priority: i.urgency === "now" ? "urgent" : i.urgency === "today" ? "normal" : "low",
      assignee: i.assignee,
      source: "guest",
    });
    i.ticketId = ticket.id;
    i.status = "inProgress";
    recordAudit({ actor: by, action: "incident.toTicket", target: id, detail: ticket.id });
    return ticket;
  },
};

const ASPECTS = ["cleanliness", "accuracy", "checkIn", "communication", "location", "value"] as const;

const reviews: ReviewsRepo = {
  async forSupply(supplyId) {
    return store().reviews.filter((r) => r.supplyId === supplyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async forBooking(bookingId) {
    return store().reviews.find((r) => r.bookingId === bookingId) ?? null;
  },
  async create({ bookingId, ratings, text }) {
    const b = store().bookings.find((x) => x.id === bookingId);
    if (!b) throw new Error("No such booking");
    if (b.endDate >= kigaliDay() || b.status === "cancelled") throw new Error("Reviews open once it is over");
    if (store().reviews.some((r) => r.bookingId === bookingId)) throw new Error("Already reviewed");
    const clean = Object.fromEntries(
      ASPECTS.map((a) => [a, Math.min(5, Math.max(1, Math.round(Number(ratings[a]) || 0)))]),
    ) as Review["ratings"];
    const made: Review = {
      id: nextId("rev"),
      bookingId,
      supplyId: b.supplyItemId,
      ratings: clean,
      text: text.trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
      guestFirstName: (b.guest?.name ?? "Guest").split(/\s+/)[0],
    };
    store().reviews.push(made);
    b.timeline = [...(b.timeline ?? []), { at: made.createdAt, kind: "reviewed", actor: "guest" }];
    return made;
  },
};

const HK_STATUS: HousekeepingTask["status"][] = ["todo", "inProgress", "ready", "issue"];

/**
 * The day's cleans, worked out from the bookings each time so they can
 * never disagree with them. Mid-stay visits are spread evenly through the
 * stay: one visit on a five-night stay is the middle day.
 */
function cleansOn(date: string): Omit<HousekeepingTask, "assignee" | "status" | "note">[] {
  const bookings = store().bookings.filter((b) => b.service === "stay" && b.status !== "cancelled");
  const turnovers = turnoverTasks(bookings, date).map((t) => ({
    id: `hk_${date}_${t.listingId}_turnover`,
    listingId: t.listingId,
    date,
    kind: "turnover" as const,
    window: { from: t.from, until: t.nextBookingId ? t.until : "18:00" },
    bookingId: t.outBookingId,
    ...(t.nextBookingId ? { nextBookingId: t.nextBookingId } : {}),
  }));
  const mid = bookings.flatMap((b) => {
    const visits = b.extras?.find((e) => e.key === "midStayClean")?.quantity ?? 0;
    if (!visits || b.stayMode === "lease") return [];
    const nights = nightsBetween(b.startDate, b.endDate);
    const days = Array.from({ length: visits }, (_, i) => addDays(b.startDate, Math.max(1, Math.floor(((i + 1) * nights) / (visits + 1)))));
    return days.includes(date)
      ? [{ id: `hk_${date}_${b.supplyItemId}_mid_${b.id}`, listingId: b.supplyItemId, date, kind: "midStay" as const, window: { from: "10:00", until: "13:00" }, bookingId: b.id }]
      : [];
  });
  return [...turnovers, ...mid];
}

/** The bookings a driver or guide works: cars and days out still to come or under way. */
function jobsOf(): PartnerJob[] {
  const today = kigaliDay();
  return store()
    .bookings.filter((b) => (b.service === "car" || b.service === "experience") && (b.status === "confirmed" || b.status === "active") && b.endDate >= today)
    .map((b) => ({
      bookingId: b.id,
      reference: b.reference,
      role: b.service === "car" ? ("driver" as const) : ("guide" as const),
      supplyId: b.supplyItemId,
      title: b.title,
      start: b.startDate,
      end: b.endDate,
      guest: b.guest?.name ?? "",
      party: b.party,
      ...(b.partnerId ? { partnerId: b.partnerId } : {}),
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}

const WORK_ROLES: StaffMember["role"][] = ["ops", "admin", "driver", "guide"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const activeAdmins = () => store().staff.filter((m) => m.role === "admin" && m.status === "active");

function checkSettings(s: SiteSettings) {
  const ok = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`Invalid ${what}`);
  };
  for (const [k, e] of Object.entries(s.catalog.extras)) ok(!!e && Number.isInteger(e.price.minor) && e.price.minor >= 0 && e.price.minor <= 10_000_000 && e.price.currency === "RWF" && typeof e.enabled === "boolean", `extra ${k}`);
  for (const [code, p] of Object.entries(s.catalog.promos)) ok(/^[A-Z0-9]{3,20}$/.test(code) && Number.isInteger(p.percent) && p.percent >= 1 && p.percent <= 90 && Number.isInteger(p.capRwf) && p.capRwf >= 0 && isIsoDate(p.validUntil) && (!p.lane || ["stay", "car", "experience"].includes(p.lane)), `promo ${code}`);
  for (const [lane, d] of Object.entries(s.catalog.windows)) ok(Number.isInteger(d) && d >= 0 && d <= 60, `window ${lane}`);
  ok(s.fxDisplay.RWF === 1 && Object.values(s.fxDisplay).every((r) => typeof r === "number" && r > 0 && Number.isFinite(r)), "rates");
  ok(Object.values(s.bank).every((v) => typeof v === "string" && v.length <= 80), "bank");
}

const admin: AdminRepo = {
  async staff() {
    return [...store().staff].sort((a, b) => a.status.localeCompare(b.status) || a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  },
  async invite(email, role, by) {
    const e = email.trim().toLowerCase();
    if (!EMAIL.test(e) || e.length > 120) throw new Error("Bad email");
    if (!WORK_ROLES.includes(role)) throw new Error("Bad role");
    if (store().staff.some((m) => m.email === e)) throw new Error("Already on the team");
    const made: StaffMember = { id: nextId("stf"), name: e.split("@")[0], email: e, role, status: "invited" };
    store().staff.push(made);
    recordAudit({ actor: by, action: "staff.invite", target: made.id, detail: `${e} as ${role}` });
    return made;
  },
  async setRole(id, role, by) {
    const m = store().staff.find((x) => x.id === id);
    if (!m || !WORK_ROLES.includes(role)) throw new Error("No such person or role");
    if (m.role === "admin" && role !== "admin" && m.status === "active" && activeAdmins().length <= 1) throw new Error("The last admin cannot be demoted");
    m.role = role;
    recordAudit({ actor: by, action: "staff.role", target: id, detail: role });
    return m;
  },
  async deactivate(id, by) {
    const m = store().staff.find((x) => x.id === id);
    if (!m) throw new Error("No such person");
    if (m.role === "admin" && m.status === "active" && activeAdmins().length <= 1) throw new Error("The last admin cannot be deactivated");
    m.status = "deactivated";
    recordAudit({ actor: by, action: "staff.deactivate", target: id, detail: m.email });
    return m;
  },
  async settings() {
    return structuredClone(store().settings);
  },
  async updateSettings(patch, by) {
    const next: SiteSettings = { ...structuredClone(store().settings), ...structuredClone(patch) };
    checkSettings(next);
    store().settings = next;
    recordAudit({ actor: by, action: "settings.update", target: Object.keys(patch).join(","), detail: "" });
    return structuredClone(next);
  },
  async content() {
    return structuredClone(store().content);
  },
  async updateContent(patch, by) {
    const next = { ...structuredClone(store().content), ...structuredClone(patch) };
    for (const a of next.announcements) if (!a.text.trim() || a.text.length > 200 || !isIsoDate(a.start) || !isIsoDate(a.end) || a.end < a.start) throw new Error("Bad announcement");
    next.featured = next.featured.filter((id, i, all) => all.indexOf(id) === i && store().listings.some((l) => l.id === id)).slice(0, 12);
    store().content = next;
    recordAudit({ actor: by, action: "content.update", target: Object.keys(patch).join(","), detail: "" });
    return structuredClone(next);
  },
  async activeAnnouncements(on) {
    return store().content.announcements.filter((a) => a.start <= on && on <= a.end);
  },
};

const finance: FinanceRepo = {
  async payments(filter = {}) {
    return store()
      .payments.filter((p) => p.kind !== "refund" && (!filter.rail || p.rail === filter.rail) && (!filter.status || p.status === filter.status))
      .sort((a, b) => b.at.localeCompare(a.at));
  },
  async refunds() {
    return store().payments.filter((p) => p.kind === "refund").sort((a, b) => b.at.localeCompare(a.at));
  },
  async approveRefund(id, by) {
    const r = store().payments.find((p) => p.id === id && p.kind === "refund");
    if (!r || r.status !== "pending") throw new Error("Nothing to approve");
    r.status = "succeeded";
    recordAudit({ actor: by, action: "refund.approve", target: id, detail: `${r.amount.minor} ${r.amount.currency}` });
  },
  async statement() {
    return { lines: [...store().statement].sort((a, b) => b.at.localeCompare(a.at)) };
  },
  async reconcile(lineId, paymentId, by) {
    const s = store();
    const line = s.statement.find((l) => l.id === lineId);
    const p = s.payments.find((x) => x.id === paymentId);
    if (!line || line.paymentId) throw new Error("No open line");
    if (!p || p.rail !== "mobileMoney" || p.amount.currency !== line.amount.currency || p.amount.minor !== line.amount.minor) throw new Error("Not this payment");
    if (s.statement.some((l) => l.paymentId === paymentId)) throw new Error("Already matched");
    line.paymentId = paymentId;
    recordAudit({ actor: by, action: "payment.reconcile", target: paymentId, detail: line.ref });
  },
  async releaseDeposit(bookingId, deductions, reason, by) {
    const b = store().bookings.find((x) => x.id === bookingId);
    const deposit = b?.lines?.find((l) => l.key === "deposit")?.amount;
    if (!b || b.stayMode !== "lease" || !deposit) throw new Error("No deposit held");
    if (store().payments.some((p) => p.bookingId === b.id && p.kind === "refund" && p.status !== "failed")) throw new Error("Already returned");
    if (deductions.currency !== deposit.currency || !Number.isInteger(deductions.minor) || deductions.minor < 0 || deductions.minor > deposit.minor) throw new Error("Bad deductions");
    if (deductions.minor > 0 && !reason.trim()) throw new Error("A deduction needs a reason");
    const at = new Date().toISOString();
    store().payments.push({ id: nextId("pmt"), bookingId: b.id, rail: "bankTransfer", kind: "refund", amount: money(deposit.minor - deductions.minor, deposit.currency), status: "succeeded", at });
    if (b.moveOut) b.moveOut = { ...b.moveOut, status: "returned", returnedAt: at };
    recordAudit({ actor: by, action: "deposit.release", target: b.id, detail: `less ${deductions.minor} ${deductions.currency}${reason.trim() ? `: ${reason.trim().slice(0, 300)}` : ""}` });
  },
  async payouts() {
    return [...store().payouts].sort((a, b) => a.releaseOn.localeCompare(b.releaseOn));
  },
  async markPayoutPaid(id, by) {
    const p = store().payouts.find((x) => x.id === id);
    if (!p || p.status !== "due") throw new Error("Not due");
    p.status = "paid";
    recordAudit({ actor: by, action: "payout.paid", target: id, detail: `${p.amount.minor} ${p.amount.currency} to ${p.payee}` });
  },
};

const partners: PartnersRepo = {
  async list() {
    return [...store().partners].sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
  },
  async byId(id) {
    return store().partners.find((p) => p.id === id) ?? null;
  },
  async documents(partnerId) {
    return store().partnerDocs.filter((d) => d.partnerId === partnerId).sort((a, b) => a.expires.localeCompare(b.expires));
  },
  async jobs(filter = {}) {
    return jobsOf().filter(
      (j) => (!filter.partnerId || j.partnerId === filter.partnerId) && (!filter.unassigned || !j.partnerId) && (!filter.role || j.role === filter.role),
    );
  },
  async offers(partnerId) {
    return store().jobOffers.filter((j) => j.partnerId === partnerId).sort((a, b) => a.start.localeCompare(b.start));
  },
  async respond(offerId, partnerId, accept, reason) {
    const j = store().jobOffers.find((x) => x.id === offerId);
    if (!j || j.partnerId !== partnerId) throw new Error("Not your offer");
    if (j.status !== "offered") throw new Error("Already answered");
    if (j.offerExpiresAt && Date.parse(j.offerExpiresAt) < Date.now()) throw new Error("This offer has run out");
    const why = (reason ?? "").trim().slice(0, 300);
    if (!accept && !why) throw new Error("A reason is needed");
    j.status = accept ? "accepted" : "declined";
    if (!accept) j.declineReason = why;
    const b = store().bookings.find((x) => x.id === j.bookingId);
    const p = store().partners.find((x) => x.id === partnerId);
    if (accept && b) {
      b.partnerId = partnerId;
      for (const audience of ["ops", "admin"] as const) {
        await notifications.create({ audience, kind: "jobAccepted", params: { name: p?.shortName ?? "", what: b.title, date: j.start }, href: `/manage/bookings/${b.reference}` });
      }
    }
    recordAudit({ actor: p?.role ?? "driver", action: accept ? "job.accept" : "job.decline", target: b?.reference ?? j.bookingId, detail: why });
    return { ...j };
  },
  async replaceDocument(docId, partnerId, doc) {
    const d = store().partnerDocs.find((x) => x.id === docId);
    if (!d || d.partnerId !== partnerId) throw new Error("Not your document");
    if (!isIsoDate(doc.expires) || doc.expires <= kigaliDay()) throw new Error("Must be valid past today");
    const name = doc.fileName.trim().slice(0, 120);
    if (!name) throw new Error("No file");
    d.expires = doc.expires;
    d.fileName = name;
    recordAudit({ actor: store().partners.find((x) => x.id === partnerId)?.role ?? "driver", action: "document.replace", target: docId, detail: `${name} until ${doc.expires}` });
    return { ...d };
  },
  async assign(bookingId, partnerId, by) {
    const job = jobsOf().find((j) => j.bookingId === bookingId);
    const b = store().bookings.find((x) => x.id === bookingId);
    if (!job || !b) throw new Error("Not a job still to do");
    if (partnerId === null) {
      delete b.partnerId;
    } else {
      const p = store().partners.find((x) => x.id === partnerId);
      if (!p || p.role !== job.role) throw new Error("Not this partner's kind of work");
      b.partnerId = p.id;
    }
    recordAudit({ actor: by, action: "job.assign", target: bookingId, detail: partnerId ?? "nobody" });
  },
};

const rates: RatesRepo = {
  async forRange(listingId, from, to) {
    const l = store().listings.find((x) => x.id === listingId);
    if (!l) throw new Error(`No listing ${listingId}`);
    const out: { date: string; rate: Money; own: boolean }[] = [];
    for (let d = from; d < to; d = addDays(d, 1)) {
      const own = l.nightlyRates?.[d];
      out.push({ date: d, rate: own ?? l.nightlyRate, own: !!own });
    }
    return out;
  },
  async setRange(listingId, from, to, rate) {
    const l = store().listings.find((x) => x.id === listingId);
    if (!l) throw new Error(`No listing ${listingId}`);
    if (!isIsoDate(from) || !isIsoDate(to) || to <= from || nightsBetween(from, to) > 366) throw new Error("Bad range");
    if (rate && (rate.currency !== l.nightlyRate.currency || !(rate.minor > 0) || !Number.isInteger(rate.minor))) throw new Error("Bad rate");
    const next = { ...(l.nightlyRates ?? {}) };
    for (let d = from; d < to; d = addDays(d, 1)) {
      // A rate equal to the base is the base: no point keeping it as an exception.
      if (rate && rate.minor !== l.nightlyRate.minor) next[d] = { ...rate };
      else delete next[d];
    }
    l.nightlyRates = next;
  },
};

const work: WorkRepo = {
  async housekeeping(date) {
    const kept = store().housekeeping;
    return cleansOn(date).map((t) => ({ ...t, ...(kept[t.id] ?? { status: "todo" as const }) }));
  },
  async updateHousekeeping(id, by, patch) {
    const date = /^hk_(\d{4}-\d{2}-\d{2})_/.exec(id)?.[1];
    const task = date ? cleansOn(date).find((t) => t.id === id) : undefined;
    if (!task) throw new Error(`No housekeeping task ${id}`);
    if (patch.status !== undefined && !HK_STATUS.includes(patch.status)) throw new Error("No such status");
    const cur = store().housekeeping[id] ?? { status: "todo" as const };
    const next = {
      ...cur,
      ...(patch.assignee !== undefined ? { assignee: patch.assignee || undefined } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.note !== undefined ? { note: patch.note.trim().slice(0, 500) || undefined } : {}),
    };
    store().housekeeping[id] = next;
    recordAudit({ actor: by, action: "housekeeping.update", target: id, detail: JSON.stringify(patch) });
    return { ...task, ...next };
  },
  async tickets(filter = {}) {
    return store()
      .tickets.filter((t) => (!filter.listingId || t.listingId === filter.listingId) && (!filter.status || filter.status.includes(t.status)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async createTicket(t) {
    const made = { ...t, id: nextId("tkt"), status: "open" as const, createdAt: new Date().toISOString() };
    store().tickets.push(made);
    return made;
  },
  async updateTicket(id, patch) {
    const t = store().tickets.find((x) => x.id === id);
    if (!t) throw new Error(`No ticket ${id}`);
    Object.assign(t, patch);
    return t;
  },
};

const viewings: ViewingsRepo = {
  async create(v) {
    const made = { ...v, id: nextId("vwg"), status: "requested" as const, createdAt: new Date().toISOString() };
    store().viewings.push(made);
    return made;
  },
  async forCurrentUser() {
    // One preview account: viewings seeded for other people are the sales
    // desk's to see, not hers. Anything requested in the preview is hers.
    return (await viewings.all()).filter((v) => v.id !== "vwg_002" && v.id !== "vwg_003");
  },
  async all() {
    return [...store().viewings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  },
  async taken(saleId) {
    return store()
      .viewings.filter((v) => v.saleId === saleId && v.status !== "cancelled")
      .map((v) => ({ date: v.date, time: v.time }));
  },
  async setStatus(id, status, move) {
    const v = store().viewings.find((x) => x.id === id);
    if (!v) throw new Error(`No viewing ${id}`);
    v.status = status;
    if (move) Object.assign(v, move);
    return v;
  },
};

export const fixtureRepositories: Repositories = {
  stays,
  sales,
  mobility,
  experiences,
  bookings,
  availability,
  viewings,
  incidents,
  reviews,
  work,
  rates,
  partners,
  finance,
  admin,
  trips,
  messaging,
  ops,
  notifications,
  audit,
  fx,
};
