"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Saved places, kept on this device until accounts exist.
 *
 * Phase 2 moves the list onto the account; the hook's shape is what the
 * components depend on, so that move changes this file and nothing that calls
 * it. `useSyncExternalStore` with an empty server snapshot keeps the first
 * render identical on server and client, then fills in — no hydration warning,
 * and a heart that is never wrongly filled for a moment.
 */

export type SavedKind = "stay" | "sale" | "car" | "experience";
export type SavedItem = { id: string; kind: SavedKind; savedAt: string };

const KEY = "homelink.saved.v1";
const EVENT = "homelink:saved";
const EMPTY: SavedItem[] = [];

let cache: { raw: string | null; items: SavedItem[] } = { raw: null, items: EMPTY };

function read(): SavedItem[] {
  const raw = window.localStorage.getItem(KEY);
  if (raw === cache.raw) return cache.items;
  let items: SavedItem[] = EMPTY;
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) items = parsed.filter((i) => i && typeof i.id === "string");
  } catch {
    // A corrupt entry is treated as an empty list rather than a crash on
    // every page that shows a heart.
  }
  cache = { raw, items };
  return items;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function useSaved() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);

  const toggle = useCallback((id: string, kind: SavedKind) => {
    const current = read();
    const next = current.some((i) => i.id === id)
      ? current.filter((i) => i.id !== id)
      : [{ id, kind, savedAt: new Date().toISOString() }, ...current];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const has = useCallback((id: string) => items.some((i) => i.id === id), [items]);

  return { items, has, toggle };
}
