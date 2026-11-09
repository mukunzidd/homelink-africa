"use client";

import { useSyncExternalStore } from "react";

/**
 * Applies the stored theme before first paint.
 *
 * Without this the page renders in the OS theme and then snaps to the stored
 * choice once React hydrates, a visible flash. The script is tiny, runs
 * synchronously, and fails silently if storage is unavailable.
 *
 * ## Why it renders only while hydrating
 *
 * The script's whole job is done by the time React starts: it is in the
 * server's HTML, in the head, and the browser runs it while parsing. After
 * that `PreferencesProvider` owns the attribute.
 *
 * React warns ("Encountered a script tag while rendering React component")
 * whenever it has to create a `<script>` element in the browser rather than
 * hydrate one the server sent. On an ordinary page it hydrates, so it stays
 * quiet. On a 404, Next renders the locale layout afresh on the client, so
 * the old version of this component made React build a new, inert script
 * and log that warning on every missing page.
 *
 * `useSyncExternalStore` tells the two cases apart: hydration uses the server
 * snapshot (true), so the server's script is hydrated as it is; a fresh
 * client render uses the client snapshot (false) and renders nothing, since
 * there is nothing left for a script to do. After hydration React re-renders
 * with the client snapshot and drops the element, which had already run.
 *
 * `next/script` actively breaks it. `beforeInteractive` does not emit an
 * inline script; it emits `self.__next_s.push(...)`, a queue drained by
 * Next's own runtime, and every runtime chunk is `async`. The measured result
 * is that the header markup streams over a kilobyte ahead of the queue ever
 * being drained, so the page paints in the wrong theme and the flash comes
 * back. Verified against the served HTML, not assumed.
 *
 * A cookie would remove the script and the flash together, by letting the
 * server put `data-theme` on `<html>` itself. That costs static rendering
 * for every route, so it is a deliberate decision rather than a cleanup; see
 * the milestone notes before reaching for it.
 */
const script = `
(function () {
  try {
    var stored = JSON.parse(localStorage.getItem('homelink.preferences') || '{}');
    if (stored.theme === 'light' || stored.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', stored.theme);
    }
  } catch (e) {}
})();
`;

const subscribe = () => () => {};

export function ThemeScript() {
  const hydrating = useSyncExternalStore(subscribe, () => false, () => true);
  if (!hydrating) return null;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
