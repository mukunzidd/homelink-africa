import { cookies } from "next/headers";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { toIcs } from "@/lib/booking/ics";

/** The booking as a calendar file, for the guest who holds it. */
export async function GET(_req: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  const b = await repos().bookings.byReference(reference);
  if (!b || role !== "guest") return new Response("Not found", { status: 404 });
  // An all-day event ends the day after its last day, per RFC 5545.
  const lastDay = b.service === "stay" ? b.endDate : b.endDate;
  const end = new Date(Date.parse(`${lastDay}T00:00:00Z`) + (b.service === "stay" ? 0 : 86_400_000)).toISOString().slice(0, 10);
  const body = toIcs({
    uid: `${b.reference}@homelink.africa`,
    title: b.title,
    start: b.startDate,
    end,
    location: b.pickup?.detail || b.title,
    description: `HomeLink booking ${b.reference}. Check-in details arrive 48 hours before.`,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${b.reference}.ics"`,
    },
  });
}
