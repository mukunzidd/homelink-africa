/**
 * Applies the stored theme before first paint.
 *
 * Without this the page renders in the OS theme and then snaps to the stored
 * choice once React hydrates — a visible flash. The script is tiny, runs
 * synchronously, and fails silently if storage is unavailable.
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
