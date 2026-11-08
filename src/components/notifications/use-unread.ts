"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppNotification } from "@/lib/domain/types";

/** Fired after anything marks notifications read, so every bell refetches. */
export const NOTIFICATIONS_CHANGED = "homelink:notifications";

export function notifyChanged() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

/**
 * The unread count, kept fresh by a 30-second poll while the tab is visible
 * and by `NOTIFICATIONS_CHANGED` after a local change. `onArrive` is told
 * about the newest unread one whenever the count goes up, which is how a
 * toast learns what to say. Phase 2 replaces the poll with Realtime.
 */
export function useUnread(enabled: boolean, onArrive?: (n: AppNotification) => void) {
  const [count, setCount] = useState(0);

  const load = useCallback(
    async (announce: boolean) => {
      try {
        const res = await fetch(`/api/notifications/unread${announce ? "?latest=1" : ""}`, { cache: "no-store" });
        const data: { count: number; latest?: AppNotification | null } = await res.json();
        setCount((prev) => {
          if (announce && data.count > prev && data.latest && onArrive) onArrive(data.latest);
          return data.count;
        });
      } catch {
        // Offline or mid-deploy: keep the last count rather than flashing 0.
      }
    },
    [onArrive],
  );

  useEffect(() => {
    if (!enabled) return;
    let first = true;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void load(!first);
      first = false;
    };
    tick();
    const timer = window.setInterval(tick, 30_000);
    const onChange = () => void load(false);
    const onVisible = () => tick();
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, load]);

  return { count, reload: () => load(true) };
}
