import type { Booking } from "@/lib/domain/types";
import type { Quote } from "@/lib/domain/pricing";
import { repos } from "@/lib/repos";
import { addDays, formatDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay, formatStamp } from "@/lib/domain/instants";
import { checkInReleased, refundPreview } from "@/lib/domain/policies";
import { money } from "@/lib/domain/money";
import { ManageBooking, type ManageProps } from "./manage-booking";

/**
 * Works out where a booking is in its life (coming up, check-in released,
 * under way, over) and everything the guest can do from there, on the
 * server: the refund they would get today, whether the door code may be
 * shown yet, whether they have reviewed. The client part only renders it.
 */
export async function ManagePanel({ booking, intlLocale }: { booking: Booking; intlLocale: string }) {
  if (booking.status === "cancelled") return null;
  const today = kigaliDay();
  const stay = booking.service === "stay";
  const lease = booking.stayMode === "lease";
  const over = booking.status === "completed" || (stay ? booking.endDate <= today : booking.endDate < today);
  const started = booking.startDate <= today;
  const phase: ManageProps["phase"] = over ? "after" : started ? "during" : checkInReleased(booking.startDate, new Date()) ? "released" : "before";

  const listing = stay ? await repos().stays.byId(booking.supplyItemId) : null;
  const vehicle = booking.service === "car" ? await repos().mobility.byId(booking.supplyItemId) : null;
  const experience = booking.service === "experience" ? await repos().experiences.byId(booking.supplyItemId) : null;
  const maxParty = listing?.sleeps ?? vehicle?.seats ?? experience?.groupMax ?? booking.party;

  const quote: Quote = {
    nights: stay ? nightsBetween(booking.startDate, booking.endDate) : 0,
    lines: booking.lines ?? [{ key: stay ? "accommodation" : booking.service === "car" ? "hire" : "seats", amount: booking.total }],
    total: booking.total,
    escrowHeld: booking.escrowHeld,
  };
  const preview =
    phase === "before" || phase === "released"
      ? refundPreview(booking.service, quote, booking.startDate, today, {
          hireDays: nightsBetween(booking.startDate, booking.endDate) + 1,
          permitShare: experience?.permitShare ? money(experience.permitShare.minor * booking.party, experience.permitShare.currency) : undefined,
        })
      : null;

  const [review, issues] = await Promise.all([
    repos().reviews.forBooking(booking.id),
    repos().incidents.forBooking(booking.id),
  ]);

  const props: ManageProps = {
    reference: booking.reference,
    service: booking.service,
    lease,
    phase,
    party: booking.party,
    maxParty,
    start: booking.startDate,
    end: booking.endDate,
    today,
    refund: preview?.refund ?? null,
    kept: preview?.kept ?? null,
    releaseWhen: formatDate(addDays(booking.startDate, -2), intlLocale, { weekday: "long", day: "numeric", month: "long" }),
    checkIn: stay && phase !== "before" && listing?.checkIn ? listing.checkIn : null,
    manager: listing?.propertyManager.name ?? null,
    reviewed: !!review,
    issues: issues.length,
    onlineCheckIn: booking.onlineCheckIn?.adults.map((a) => a.name) ?? null,
    guestName: booking.guest?.name ?? "",
    bookAgainHref: stay ? `/stays/${listing?.slug ?? ""}` : vehicle ? `/cars/${vehicle.slug}` : `/experiences/${experience?.slug ?? ""}`,
    deposit: lease && listing?.monthlyRate && listing.leaseTerms ? money(listing.monthlyRate.minor * listing.leaseTerms.depositMonths, listing.monthlyRate.currency) : null,
    timeline: (booking.timeline ?? []).map((e) => ({ kind: e.kind, when: formatStamp(e.at, intlLocale), note: e.note })),
  };
  return <ManageBooking {...props} />;
}
