import { defineRouting } from "next-intl/routing";

/**
 * Every route carries its locale (`/en/stays/…`, `/rw/stays/…`) so that
 * public listing pages are indexable per language. Product & UX §6 treats
 * language as one of five coordinated localization layers, not just strings.
 */
export const routing = defineRouting({
  locales: ["en", "fr", "rw"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  rw: "Kinyarwanda",
};

/**
 * BCP 47 tags for Intl formatting. Distinct from the route segment: the
 * segment is `rw`, but number and date formatting needs the region.
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  rw: "rw-RW",
};
