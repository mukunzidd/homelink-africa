/**
 * An all-day calendar event (RFC 5545), written by hand rather than pulled
 * in as a dependency: it is forty lines, and the rules that matter (CRLF,
 * escaping, folding at 75 octets) are the ones tested.
 */
export type IcsEvent = { uid: string; title: string; start: string; end: string; location: string; description: string };

// RFC 5545 TEXT: backslash, semicolon and comma are escaped, and every line
// break (CRLF, LF or a lone CR) becomes the two characters \n. The
// replacement for ";" is written with a doubled backslash: a single one in a
// JS string escapes nothing, so it was silently just ";" before.
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
const day = (d: string) => d.replace(/-/g, "");

/** Fold a content line so no physical line exceeds 75 octets. */
function fold(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (enc.encode(cur + ch).length > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ` ${l}`)).join("\r\n");
}

export function toIcs(e: IcsEvent, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HomeLink Africa//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${esc(e.uid)}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${day(e.start)}`,
    `DTEND;VALUE=DATE:${day(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n") + "\r\n";
}
