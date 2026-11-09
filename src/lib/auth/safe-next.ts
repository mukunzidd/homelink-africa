import type { Locale } from "@/i18n/routing";

/**
 * Where to go after signing in, from a `next` the URL carried.
 *
 * Only a path on this site, in this language: it must start with one `/`
 * followed by the locale, carry no scheme, no backslash, no `//` anywhere
 * and no encoded slash or dot-segment that a browser or a server could
 * later turn into one. Anything else, or nothing, lands on the account.
 * An open redirect on a sign-in page is how a phishing link borrows our
 * domain, so the rule is a whitelist of shape, not a blacklist of hosts.
 */
export function safeNext(next: string | undefined, locale: Locale): string {
  const home = `/${locale}/account`;
  if (!next || next.length > 512) return home;
  if (!(next === `/${locale}` || next.startsWith(`/${locale}/`) || next.startsWith(`/${locale}?`))) return home;
  if (/[\\\s]|\/\/|%2f|%5c|%2e|:/i.test(next.split("?")[0]) || /(^|\/)\.\.?(\/|$)/.test(next)) return home;
  return next;
}
