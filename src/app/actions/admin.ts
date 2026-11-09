"use server";

import { refresh, revalidatePath } from "next/cache";
import type { Announcement, ServiceKind, SiteContent, StaffMember } from "@/lib/domain/types";
import type { SiteSettings } from "@/lib/repos/types";
import type { ExtraKey } from "@/lib/domain/extras";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess, type WorkspaceSection } from "@/lib/workspace/nav";

/**
 * People, content and settings. Each checks its section here; the
 * repository then checks the values as a whole and refuses anything out of
 * range, so a bad field never half-saves.
 */
async function may(section: WorkspaceSection) {
  const role = await currentRole();
  if (!canAccess(role, section)) throw new Error("Not allowed");
  return role;
}

async function attempt<T>(fn: () => Promise<T>) {
  try {
    await fn();
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

const ROLES: StaffMember["role"][] = ["ops", "admin", "driver", "guide"];
const role = (r: unknown) => (ROLES.includes(r as StaffMember["role"]) ? (r as StaffMember["role"]) : null);

export async function inviteStaff(email: string, r: string) {
  const by = await may("people");
  const rr = role(r);
  if (typeof email !== "string" || !rr) return { ok: false as const };
  return attempt(() => repos().admin.invite(email, rr, by));
}

export async function setStaffRole(id: string, r: string) {
  const by = await may("people");
  const rr = role(r);
  if (!rr) return { ok: false as const };
  return attempt(() => repos().admin.setRole(String(id), rr, by));
}

export async function deactivateStaff(id: string) {
  const by = await may("people");
  return attempt(() => repos().admin.deactivate(String(id), by));
}

/** The whole site's layout reads announcements, and the landing page the featured homes. */
function revalidateSite() {
  revalidatePath("/[locale]", "layout");
}

export async function saveContent(raw: { announcements?: unknown; featured?: unknown; neighbourhoods?: unknown }) {
  const by = await may("content");
  const patch: Partial<SiteContent> = {};
  if (Array.isArray(raw.announcements)) {
    patch.announcements = raw.announcements.slice(0, 5).map((a: Partial<Announcement>, i) => ({
      id: typeof a.id === "string" && a.id ? a.id.slice(0, 40) : `ann_${Date.now()}_${i}`,
      text: String(a.text ?? "").trim().slice(0, 200),
      start: String(a.start ?? ""),
      end: String(a.end ?? ""),
    }));
  }
  if (Array.isArray(raw.featured)) patch.featured = raw.featured.filter((x): x is string => typeof x === "string").slice(0, 12);
  if (raw.neighbourhoods && typeof raw.neighbourhoods === "object") {
    patch.neighbourhoods = Object.fromEntries(
      Object.entries(raw.neighbourhoods as Record<string, { text?: unknown; showLandmarks?: unknown }>)
        .slice(0, 40)
        .map(([name, v]) => [name.slice(0, 40), { text: typeof v?.text === "string" ? v.text.trim().slice(0, 300) : undefined, showLandmarks: v?.showLandmarks !== false }]),
    );
  }
  const r = await attempt(() => repos().admin.updateContent(patch, by));
  if (r.ok) revalidateSite();
  return r;
}

const LANES: ServiceKind[] = ["stay", "car", "experience"];

/** Prices come in as francs (RWF has no minor unit); rates as numbers per franc. */
export async function saveSettings(raw: {
  extras?: Record<string, { francs: number; enabled: boolean }>;
  promos?: { code: string; percent: number; capRwf: number; validUntil: string; lane?: string }[];
  windows?: Record<string, number>;
  fxDisplay?: Record<string, number>;
  bank?: Record<string, string>;
}) {
  const by = await may("settings");
  const current = await repos().admin.settings();
  const patch: Partial<SiteSettings> = {};
  if (raw.extras || raw.promos || raw.windows) {
    const catalog = structuredClone(current.catalog);
    if (raw.extras) {
      for (const [k, v] of Object.entries(raw.extras)) {
        if (!(k in catalog.extras)) continue;
        catalog.extras[k as ExtraKey] = { price: { minor: Math.round(Number(v.francs)), currency: "RWF" }, enabled: v.enabled === true };
      }
    }
    if (raw.promos) {
      catalog.promos = Object.fromEntries(
        raw.promos.slice(0, 30).map((p) => [
          String(p.code).trim().toUpperCase(),
          { percent: Math.round(Number(p.percent)), capRwf: Math.round(Number(p.capRwf)), validUntil: String(p.validUntil), ...(LANES.includes(p.lane as ServiceKind) ? { lane: p.lane as ServiceKind } : {}) },
        ]),
      );
    }
    if (raw.windows) for (const lane of LANES) if (lane in raw.windows) catalog.windows[lane] = Math.round(Number(raw.windows[lane]));
    patch.catalog = catalog;
  }
  // Typed as francs for one unit ("1 USD = 1,290"), the way people quote it; stored per franc.
  if (raw.fxDisplay) patch.fxDisplay = { ...current.fxDisplay, ...Object.fromEntries(Object.entries(raw.fxDisplay).filter(([k, v]) => k in current.fxDisplay && k !== "RWF" && Number(v) > 0).map(([k, v]) => [k, 1 / Number(v)])) };
  if (raw.bank) patch.bank = { ...current.bank, ...Object.fromEntries(Object.entries(raw.bank).filter(([k]) => k in current.bank).map(([k, v]) => [k, String(v).trim()])) };
  const r = await attempt(() => repos().admin.updateSettings(patch, by));
  if (r.ok) revalidateSite();
  return r;
}
