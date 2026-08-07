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
 * BCP 47 tags for dates and text. Distinct from the route segment: the
 * segment is `rw`, but formatting needs the region.
 */
export const INTL_LOCALES: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  rw: "rw-RW",
};

/**
 * BCP 47 tags for NUMBERS AND MONEY specifically, which are not always the
 * same tag as the one used for dates.
 *
 * `rw-RW` is the correct tag for Kinyarwanda dates — it gives "2026 Ukwakira
 * 12", which is what we want. But its CLDR number data groups with a period,
 * rendering RWF 165,000 as "RF 165.000". Rwanda writes money the English way:
 * banks, the revenue authority, and every invoice in Kigali use "165,000".
 * A period there reads as a decimal point to a Rwandan, which on a payment
 * screen is the worst possible ambiguity.
 *
 * So numbers use `en-RW` — still the Rwandan region, with the grouping people
 * actually use — while dates and all other text stay in `rw-RW`.
 */
export const NUMBER_LOCALES: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
  rw: "en-RW",
};
