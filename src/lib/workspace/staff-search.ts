import type { Booking, BookingStatus } from "@/lib/domain/types";

export type StaffHit = {
  reference: string;
  guest: string;
  title: string;
  start: string;
  end: string;
  status: BookingStatus;
  match: "reference" | "guest" | "property";
};

/** Accents off and lower case, but hyphens and @ kept: they are half of a reference and an email. */
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * What the desk types into ⌘K: a reference read down the phone, a guest's
 * name, or the home they are in. References need the HL- prefix or four
 * characters, because two letters of a code match half the book and the
 * desk would stop trusting the first row. References rank first: someone
 * typing one knows exactly which booking they want.
 */
export function staffSearch(query: string, bookings: Booking[], limit = 6): StaffHit[] {
  const q = plain(query);
  if (q.length < 2) return [];
  const bare = q.replace(/-/g, "");
  const byRef = q.startsWith("hl-") || bare.length >= 4;
  const tiers: Record<StaffHit["match"], StaffHit[]> = { reference: [], guest: [], property: [] };
  for (const b of bookings) {
    const ref = b.reference.toLowerCase();
    const match: StaffHit["match"] | null =
      byRef && (ref.includes(q) || ref.replace(/-/g, "").includes(bare))
        ? "reference"
        : plain(b.guest?.name ?? "").includes(q) || plain(b.guest?.email ?? "").includes(q)
          ? "guest"
          : q.length >= 3 && plain(b.title).includes(q)
            ? "property"
            : null;
    if (match) {
      tiers[match].push({ reference: b.reference, guest: b.guest?.name ?? "", title: b.title, start: b.startDate, end: b.endDate, status: b.status, match });
    }
  }
  return [...tiers.reference, ...tiers.guest, ...tiers.property].slice(0, limit);
}
