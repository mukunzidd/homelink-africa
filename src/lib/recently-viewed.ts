"use client";

/**
 * The last few places someone opened, on this device.
 *
 * The empty search window used to show the same four example sentences to
 * everyone, every time. Someone coming back to compare two flats wants those
 * two flats, so the window now leads with what they last looked at. Kept in
 * localStorage beside saved items until accounts arrive.
 */
export type Viewed = { href: string; name: string; kind: "stay" | "sale" | "car" | "experience"; image?: string; at: number };

const KEY = "homelink.viewed.v1";

export function readViewed(): Viewed[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.href === "string" && typeof x.name === "string").slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function recordViewed(item: Omit<Viewed, "at">) {
  try {
    const next = [{ ...item, at: Date.now() }, ...readViewed().filter((v) => v.href !== item.href)].slice(0, 4);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or a full quota: forgetting a visit is harmless.
  }
}
