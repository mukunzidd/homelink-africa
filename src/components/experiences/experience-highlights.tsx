import { getLocale, getTranslations } from "next-intl/server";
import type { Experience } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import {
  BowlIcon,
  ClockIcon,
  CompassIcon,
  KeyIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";
import {
  HighlightList,
  pickHighlights,
} from "@/components/ui/highlight-list";

/**
 * What a day out earns.
 *
 * The verification claim is different in kind here: nobody walked through a
 * trek, they went on it. So the lead fact says our inspector did the whole
 * day, not that they checked a room.
 *
 * The permit line appears only where a permit exists, which the fixtures
 * express as a price quoted in dollars — the Volcanoes permit is the one
 * thing on this site sold in a currency the supplier is not paid in, and it
 * is also the single largest reason a gorilla trek falls through. Everything
 * else keys off duration, group size, and what is on the plate.
 */
export async function ExperienceHighlights({
  experience,
}: {
  experience: Experience;
}) {
  const t = await getTranslations("experienceHighlight");
  const locale = (await getLocale()) as Locale;
  const record = experience.verification;

  const inspectedOn = formatDate(record.inspectedAt, INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
  });

  const items = pickHighlights([
    {
      key: "inspected",
      icon: <ShieldIcon size={22} />,
      title: t("inspected"),
      body: t("inspectedBody", { name: record.inspectorName, date: inspectedOn }),
      show: true,
    },
    {
      key: "permit",
      icon: <KeyIcon size={22} />,
      title: t("permit"),
      body: t("permitBody"),
      show: experience.pricePerPerson.currency === "USD",
    },
    {
      key: "halfDay",
      icon: <ClockIcon size={22} />,
      title: t("halfDay"),
      body: t("halfDayBody", { count: experience.durationHours }),
      show: experience.durationHours <= 4,
    },
    {
      key: "smallGroup",
      icon: <UsersIcon size={22} />,
      title: t("smallGroup"),
      body: t("smallGroupBody", { count: experience.groupMax }),
      show: experience.groupMax <= 10,
    },
    {
      key: "food",
      icon: <BowlIcon size={22} />,
      title: t("food"),
      body: t("foodBody"),
      show: experience.interests.includes("food"),
    },
    {
      key: "fullDay",
      icon: <CompassIcon size={22} />,
      title: t("fullDay"),
      body: t("fullDayBody", { count: experience.durationHours }),
      show: experience.durationHours >= 8,
    },
  ]);

  return <HighlightList items={items} />;
}
