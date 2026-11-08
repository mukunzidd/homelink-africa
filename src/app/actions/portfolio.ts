"use server";

import { refresh, revalidatePath } from "next/cache";
import type { Amenity, LeaseTerms, Listing, StayMode } from "@/lib/domain/types";
import { CURRENCIES, type CurrencyCode } from "@/lib/domain/money";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess } from "@/lib/workspace/nav";
import { addDays, isIsoDate } from "@/lib/domain/dates";
import { listingPatchErrors, type ListingPatch, type PatchError } from "@/lib/workspace/listing-patch";
import { nightsWithGuests } from "@/lib/workspace/guest-nights";
import { searchChanged } from "@/lib/search";

/**
 * The listing editor's writes. Admin only, checked here. A patch is
 * rebuilt field by field from what the editor may change, never spread
 * from the browser, then checked by the same rules the repository holds.
 */
async function admin() {
  const role = await currentRole();
  if (!canAccess(role, "portfolio")) throw new Error("Not allowed");
  return role;
}

/** The public pages that show a home, in every language, and the search index behind them. */
async function revalidateSite() {
  await searchChanged();
  revalidatePath("/[locale]/stays/[slug]", "page");
  revalidatePath("/[locale]/stays", "page");
  revalidatePath("/[locale]", "page");
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);
const moneyOf = (v: unknown) => {
  const m = v as { minor?: unknown; currency?: unknown } | undefined;
  return m && typeof m.minor === "number" && Number.isFinite(m.minor) && CURRENCIES.includes(m.currency as CurrencyCode)
    ? { minor: Math.round(m.minor), currency: m.currency as CurrencyCode }
    : undefined;
};
const strings = (v: unknown, max: number, each: number) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, each)).filter(Boolean).slice(0, max) : undefined;

/** Keeps only what the editor may change, each in the shape it must have. */
function clean(raw: Record<string, unknown>): ListingPatch {
  const p: ListingPatch = {};
  if ("name" in raw) p.name = str(raw.name, 120)?.trim() ?? "";
  if ("summary" in raw) p.summary = str(raw.summary, 2000) ?? "";
  if ("bedrooms" in raw) p.bedrooms = int(raw.bedrooms) ?? -1;
  if ("sleeps" in raw) p.sleeps = int(raw.sleeps) ?? -1;
  if ("minNights" in raw) p.minNights = int(raw.minNights) ?? 0;
  if ("amenities" in raw) p.amenities = (strings(raw.amenities, 40, 40) ?? []) as Amenity[];
  if ("houseRules" in raw) p.houseRules = strings(raw.houseRules, 30, 300) ?? [];
  if ("images" in raw) p.images = (strings(raw.images, 40, 300) ?? []).filter((src) => src.startsWith("/images/"));
  if ("nightlyRate" in raw) p.nightlyRate = moneyOf(raw.nightlyRate) ?? { minor: 0, currency: "RWF" };
  if ("monthlyRate" in raw) p.monthlyRate = raw.monthlyRate == null ? undefined : (moneyOf(raw.monthlyRate) ?? { minor: 0, currency: "RWF" });
  if ("modes" in raw) p.modes = (strings(raw.modes, 2, 10) ?? []).filter((m): m is StayMode => m === "nightly" || m === "lease");
  if ("leaseTerms" in raw && raw.leaseTerms) {
    const t = raw.leaseTerms as Partial<LeaseTerms>;
    p.leaseTerms = {
      depositMonths: Math.min(6, Math.max(0, int(t.depositMonths) ?? 1)),
      includes: (strings(t.includes, 10, 30) ?? []) as LeaseTerms["includes"],
      availableFrom: isIsoDate(t.availableFrom) ? t.availableFrom : new Date().toISOString().slice(0, 10),
    };
  }
  if ("propertyManager" in raw && raw.propertyManager) {
    const m = raw.propertyManager as Partial<Listing["propertyManager"]>;
    p.propertyManager = { name: str(m.name, 80)?.trim() ?? "", since: isIsoDate(m.since) ? m.since : new Date().toISOString().slice(0, 10) };
  }
  if ("checkIn" in raw && raw.checkIn) {
    const c = raw.checkIn as Partial<NonNullable<Listing["checkIn"]>>;
    p.checkIn = { directions: str(c.directions, 1000) ?? "", doorCode: str(c.doorCode, 40) ?? "", wifiName: str(c.wifiName, 60) ?? "", wifiPassword: str(c.wifiPassword, 60) ?? "" };
  }
  return p;
}

export async function updateListing(id: string, raw: Record<string, unknown>): Promise<{ ok: true } | { ok: false; errors: PatchError[] }> {
  const by = await admin();
  const listing = (await repos().stays.all()).find((l) => l.id === id);
  if (!listing) return { ok: false, errors: [] };
  const patch = clean(raw);
  const errors = listingPatchErrors(patch, listing);
  if (errors.length) return { ok: false, errors };
  await repos().stays.update(id, patch);
  await repos().audit.record({ actor: by, action: "listing.update", target: id, detail: Object.keys(patch).join(",") });
  await revalidateSite();
  refresh();
  return { ok: true };
}

export async function createListing(name: string, neighbourhood: string): Promise<{ ok: true; slug: string } | { ok: false }> {
  const by = await admin();
  const n = str(name, 120)?.trim();
  const where = str(neighbourhood, 60)?.trim();
  if (!n || !where) return { ok: false };
  const made = await repos().stays.create({ name: n, neighbourhood: where });
  await repos().audit.record({ actor: by, action: "listing.create", target: made.id, detail: n });
  refresh();
  return { ok: true, slug: made.slug };
}

export async function setListingPublished(id: string, published: boolean): Promise<{ ok: true } | { ok: false; reason: "notInspected" }> {
  const by = await admin();
  try {
    await repos().stays.setPublished(id, !!published);
  } catch {
    return { ok: false, reason: "notInspected" };
  }
  await repos().audit.record({ actor: by, action: published ? "listing.publish" : "listing.unpublish", target: id, detail: "" });
  await revalidateSite();
  refresh();
  return { ok: true };
}

/** Owner use or a hold, one night at a time from the availability tab. A night with a guest in it cannot be blocked. */
export async function setNightBlocked(id: string, date: string, blocked: boolean): Promise<{ ok: boolean }> {
  const by = await admin();
  if (!isIsoDate(date)) return { ok: false };
  if (blocked) {
    if (nightsWithGuests(await repos().bookings.listAll(), id, date, 1).length) return { ok: false };
    await repos().availability.block(id, [date], "owner");
  } else {
    // Only an owner hold is lifted here; a maintenance block belongs to its ticket.
    const held = await repos().availability.blocked(id, date, addDays(date, 1));
    if (held.some((b) => b.date === date && b.reason !== "owner")) return { ok: false };
    await repos().availability.unblock(id, [date]);
  }
  await repos().audit.record({ actor: by, action: blocked ? "listing.block" : "listing.unblock", target: id, detail: date });
  await revalidateSite();
  refresh();
  return { ok: true };
}
