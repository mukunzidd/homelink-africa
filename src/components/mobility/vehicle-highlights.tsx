import { getLocale, getTranslations } from "next-intl/server";
import type { Vehicle } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import {
  CarIcon,
  GearIcon,
  RoadIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  HighlightList,
  pickHighlights,
} from "@/components/ui/highlight-list";

/**
 * What a car earns.
 *
 * A stay's third fact is an amenity; a car's is how it will behave on the road
 * someone is actually going to drive. Every candidate here reads off the
 * vehicle record, so the four vehicles in the fixtures produce four different
 * sets: the Corolla argues its gearbox and its fleet depth, the Land Cruiser
 * its driver and its ground clearance, the HiAce that the whole group fits in
 * one van. If a candidate would be true of every vehicle it does not belong.
 */
export async function VehicleHighlights({ vehicle }: { vehicle: Vehicle }) {
  const t = await getTranslations("carHighlight");
  const locale = (await getLocale()) as Locale;
  const record = vehicle.verification;

  const inspectedOn = formatDate(record.inspectedAt, INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
  });

  const driverOnly = !vehicle.driveModes.includes("selfDrive");

  const items = pickHighlights([
    {
      key: "inspected",
      icon: <ShieldIcon size={22} />,
      title: t("inspected"),
      body: t("inspectedBody", {
        name: record.inspectorName,
        date: inspectedOn,
        points: record.checklistPoints,
      }),
      show: true,
    },
    {
      key: "driver",
      icon: <UsersIcon size={22} />,
      title: t("driver"),
      body: t("driverBody"),
      show: driverOnly,
    },
    {
      // Only worth saying to someone who will be doing the driving.
      key: "automatic",
      icon: <GearIcon size={22} />,
      title: t("automatic"),
      body: t("automaticBody"),
      show: vehicle.transmission === "automatic" && !driverOnly,
    },
    {
      key: "unpaved",
      icon: <RoadIcon size={22} />,
      title: t("unpaved"),
      body: t("unpavedBody"),
      show: vehicle.vehicleClass === "suv",
    },
    {
      key: "group",
      icon: <CarIcon size={22} />,
      title: t("group"),
      body: t("groupBody", { count: vehicle.seats }),
      show: vehicle.seats >= 7,
    },
    {
      // Thin inventory is the usual reason a date change kills a booking.
      key: "fleet",
      icon: <CarIcon size={22} />,
      title: t("fleet"),
      body: t("fleetBody", { count: vehicle.unitsAvailable }),
      show: vehicle.unitsAvailable >= 6,
    },
  ]);

  return <HighlightList items={items} />;
}
