/**
 * `Intl.DateTimeFormat`, except that Kinyarwanda comes out the same on the
 * server and in the browser.
 *
 * Node carries full ICU and formats rw-RW itself; Chrome ships a trimmed
 * ICU without Kinyarwanda and quietly falls back to English. Any client
 * component that rendered a date on the server therefore hydrated "16
 * Ugushyingo 2026" against "Nov 16, 2026", and React threw the tree away.
 * Node's rw data is also thin ("2026 Ugushyingo 16", "ugu. 16, mbe."), so
 * leaning on it would not have been worth keeping anyway.
 *
 * So for rw the layout comes from en-GB, which every runtime has and which
 * already puts the day first, and the names come from the table below
 * (CLDR's own Kinyarwanda names). English joining words such as "at"
 * become a plain space. Every other language goes straight to the runtime.
 */

const RW = {
  monthLong: ["Mutarama", "Gashyantare", "Werurwe", "Mata", "Gicurasi", "Kamena", "Nyakanga", "Kanama", "Nzeri", "Ukwakira", "Ugushyingo", "Ukuboza"],
  monthShort: ["mut.", "gas.", "wer.", "mat.", "gic.", "kam.", "nya.", "kan.", "nze.", "ukw.", "ugu.", "uku."],
  // Sunday first, as getUTCDay counts.
  weekdayLong: ["Ku cyumweru", "Kuwa mbere", "Kuwa kabiri", "Kuwa gatatu", "Kuwa kane", "Kuwa gatanu", "Kuwa gatandatu"],
  // CLDR's narrow forms for rw are the English letters, which are no use in
  // a calendar header, so narrow uses these too.
  weekdayShort: ["cyu.", "mbe.", "kab.", "gtu.", "kan.", "gnu.", "gnd."],
};

export type DateFormatter = {
  format: (date: Date) => string;
  formatRange: (from: Date, to: Date) => string;
};

function isKinyarwanda(locale: string) {
  return /^rw(-|$)/i.test(locale);
}

/** The calendar fields of `date` as the formatter's time zone sees them. */
function fieldsIn(date: Date, timeZone: string | undefined) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, month: "numeric", weekday: "short" }).formatToParts(date);
  const month = Number(parts.find((p) => p.type === "month")!.value) - 1;
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.find((p) => p.type === "weekday")!.value);
  return { month, weekday };
}

export function dateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions = {}): DateFormatter {
  if (!isKinyarwanda(locale)) {
    const f = new Intl.DateTimeFormat(locale, options);
    return { format: (d) => f.format(d), formatRange: (a, b) => f.formatRange(a, b) };
  }

  const base = new Intl.DateTimeFormat("en-GB", options);
  const name = (type: string, value: string, date: Date) => {
    const { month, weekday } = fieldsIn(date, options.timeZone);
    if (type === "month" && (options.month === "long" || options.month === "short")) {
      return options.month === "long" ? RW.monthLong[month] : RW.monthShort[month];
    }
    if (type === "weekday") return options.weekday === "long" ? RW.weekdayLong[weekday] : RW.weekdayShort[weekday];
    if (type === "literal" && /\p{L}/u.test(value)) return " ";
    return value;
  };
  const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

  return {
    format: (d) => tidy(base.formatToParts(d).map((p) => name(p.type, p.value, d)).join("")),
    formatRange: (a, b) =>
      tidy(
        base
          .formatRangeToParts(a, b)
          .map((p) => name(p.type, p.value, p.source === "endRange" ? b : a))
          .join(""),
      ),
  };
}
