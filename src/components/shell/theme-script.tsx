/**
 * Applies the stored theme before first paint.
 *
 * Without this the page renders in the OS theme and then snaps to the stored
 * choice once React hydrates — a visible flash. The script is tiny, runs
 * synchronously, and fails silently if storage is unavailable.
 *
 * ## Why this is a bare `<script>` despite the dev warning
 *
 * Next warns that scripts inside React components are never executed on a
 * client render, and points at `next/script`. Both halves are true and neither
 * applies here.
 *
 * The warning describes client renders. This runs on the server, in the
 * document head, and its whole job is finished before hydration starts. That a
 * later client render of the same tree does nothing is the correct outcome, not
 * a bug: by then `PreferencesProvider` owns the attribute.
 *
 * `next/script` actively breaks it. `beforeInteractive` does not emit an inline
 * script — it emits `self.__next_s.push(...)`, a queue drained by Next's own
 * runtime, and every runtime chunk is `async`. The measured result is that the
 * header markup streams over a kilobyte ahead of the queue ever being drained,
 * so the page paints in the wrong theme and the flash comes back. Verified
 * against the served HTML, not assumed.
 *
 * A cookie would remove the script, the flash, and the warning together, by
 * letting the server put `data-theme` on `<html>` itself. That costs static
 * rendering for every route, so it is a deliberate decision rather than a
 * cleanup — see the milestone notes before reaching for it.
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

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
