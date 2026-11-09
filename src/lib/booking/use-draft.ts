"use client";

import { useCallback, useEffect, useState } from "react";
import { draftId, draftReducer, newDraft, type BookingDraft, type DraftAction } from "./draft";
import { HOLD_MINUTES } from "@/lib/domain/policies";

const PREFIX = "homelink.draft.v1.";

function load(id: string): BookingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(PREFIX + id);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

function save(d: BookingDraft) {
  try {
    window.sessionStorage.setItem(PREFIX + d.id, JSON.stringify(d));
  } catch {
    // Private mode or a full quota: the draft lives for this page view only.
  }
}

/**
 * A booking in progress, kept in this tab's sessionStorage.
 *
 * sessionStorage rather than localStorage: a half-filled card form should
 * not reappear in a tab opened next week, and closing the tab is how people
 * abandon a checkout. A refresh mid-way, which is the case that matters,
 * keeps everything.
 *
 * The first render is a fresh draft on both server and client, so hydration
 * matches; the stored draft replaces it right after mount. A stored draft
 * whose hold has run out is kept, with its hold flagged as expired rather
 * than silently restarted: the guest is told, and decides.
 */
export function useBookingDraft(
  init: Pick<BookingDraft, "flow" | "slug" | "start" | "end" | "party">,
): [BookingDraft, (a: DraftAction) => void, { restored: boolean; reset(): void }] {
  const id = draftId(init.flow, init.slug, init.start, init.end, init.party);
  const [draft, setDraft] = useState<BookingDraft>(() => newDraft(init, new Date()));
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const stored = load(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setDraft(stored);
    else {
      // A new key with nothing stored is a new draft: put it in state too,
      // or the page keeps editing the previous dates' draft.
      const fresh = newDraft(init, new Date());
      save(fresh);
      setDraft(fresh);
    }
    setRestored(true);
    // init is keyed by id; re-running for a new object with the same id is pointless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const dispatch = useCallback((a: DraftAction) => {
    setDraft((d) => {
      const next = draftReducer(d, a);
      save(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.sessionStorage.removeItem(PREFIX + id);
    } catch {}
  }, [id]);

  return [draft, dispatch, { restored, reset }];
}

export { HOLD_MINUTES };
