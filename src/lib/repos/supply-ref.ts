import { getTranslations } from "next-intl/server";
import type { Booking, ServiceKind } from "@/lib/domain/types";
import { repos } from "@/lib/repos";

/**
 * What a booking is a booking *of*.
 *
 * A booking carries a `supplyItemId` and a denormalised title, which is enough
 * for a receipt and not enough for a screen: every dashboard wants the
 * photograph, the place, and a link back to the thing itself. Four screens
 * needed that resolution — trips, inventory, the queue, a thread header — and
 * writing the same three-way switch in each is how they drift apart.
 *
 * The shape returned here is deliberately UI-flavoured rather than a domain
 * entity. Callers want a row, not a `Listing | Vehicle | Experience` union
 * they have to narrow again.
 */
export type SupplyRef = {
  kind: ServiceKind;
  name: string;
  /**
   * One short line of context under the name: place for a stay, meeting point
   * for a day out, class and gearbox for a car.
   *
   * Short is the requirement, not a preference. The first version used the
   * vehicle's `summary` here, and "The default Rwandan hire car for a reason.
   * Handles the hills and the unpaved stretches without drama." wrapped to two
   * lines in a booking row and pushed the reference below the fold. A summary
   * sells a thing; a row identifies one you have already paid for.
   */
  detail: string;
  imageSeed: string;
  image?: string;
  /** Back to the public page. Cancelled and completed bookings link here too:
   *  "book that again" is the most common thing to want from a history. */
  href: string;
  inspectorName: string;
};

export async function supplyRefFor(booking: Booking): Promise<SupplyRef | null> {
  const r = repos();

  if (booking.service === "car") {
    const vehicle = await r.mobility.byId(booking.supplyItemId);
    if (!vehicle) return null;
    const t = await getTranslations("cars");
    return {
      kind: "car",
      name: vehicle.name,
      detail: [
        t(`class.${vehicle.vehicleClass}`),
        t(`transmission.${vehicle.transmission}`),
        t("seats", { count: vehicle.seats }),
      ].join(" · "),
      imageSeed: vehicle.imageSeed,
      image: vehicle.images?.[0],
      href: `/cars/${vehicle.slug}`,
      inspectorName: vehicle.verification.inspectorName,
    };
  }

  if (booking.service === "experience") {
    const experience = await r.experiences.byId(booking.supplyItemId);
    if (!experience) return null;
    return {
      kind: "experience",
      name: experience.name,
      detail: experience.meetingPoint,
      imageSeed: experience.imageSeed,
      image: experience.images?.[0],
      href: `/experiences/${experience.slug}`,
      inspectorName: experience.verification.inspectorName,
    };
  }

  const listing = await r.stays.byId(booking.supplyItemId);
  if (!listing) return null;
  return {
    kind: "stay",
    name: listing.name,
    detail: `${listing.neighbourhood} · ${listing.city}`,
    imageSeed: listing.imageSeed,
    image: listing.images?.[0],
    href: `/stays/${listing.slug}`,
    inspectorName: listing.verification.inspectorName,
  };
}
