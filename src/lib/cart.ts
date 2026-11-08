"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CartItem } from "./cart-checks";

/**
 * The trip cart, kept on this device until accounts exist. Same pattern as
 * saved.ts: the server snapshot is "off and empty", so every first render
 * and every new device starts without a cart, and turning it on is always
 * the guest's choice.
 */
type CartState = { enabled: boolean; items: CartItem[] };

const KEY = "homelink.cart.v1";
const EVENT = "homelink:cart";
const OFF: CartState = { enabled: false, items: [] };

let cache: { raw: string | null; state: CartState } = { raw: null, state: OFF };

function read(): CartState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return OFF;
  }
  if (raw === cache.raw) return cache.state;
  let state = OFF;
  try {
    const parsed = JSON.parse(raw ?? "null");
    if (parsed && typeof parsed.enabled === "boolean" && Array.isArray(parsed.items)) state = parsed;
  } catch {
    // A corrupt cart is an empty one, not a broken header.
  }
  cache = { raw, state };
  return state;
}

function write(next: CartState) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode: the cart lasts for this page only.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useCart() {
  const state = useSyncExternalStore(subscribe, read, () => OFF);

  const enable = useCallback((seed?: CartItem) => {
    const cur = read();
    write({ enabled: true, items: seed && !cur.items.some((i) => i.id === seed.id) ? [...cur.items, seed] : cur.items });
  }, []);
  const disable = useCallback(() => write(OFF), []);
  const add = useCallback((item: CartItem) => {
    const cur = read();
    write({ enabled: true, items: [...cur.items.filter((i) => i.id !== item.id), item] });
  }, []);
  const remove = useCallback((id: string) => {
    const cur = read();
    write({ ...cur, items: cur.items.filter((i) => i.id !== id) });
  }, []);
  const clear = useCallback(() => write({ ...read(), items: [] }), []);

  return { ...state, enable, disable, add, remove, clear };
}
