import { getLocale, getTranslations } from "next-intl/server";
import type { VerificationRecord } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { PersonRow } from "@/components/ui/person-row";

/**
 * The inspector, at the top of every detail page in every lane.
 *
 * Every marketplace at this scale puts a person there — a host, an owner, a
 * superhost badge. HomeLink's equivalent is not the owner, because the owner
 * is not who the guest is trusting. It is the person from our team who walked
 * through the place, drove the car, or went on the trek, and the whole product
 * rests on them being a specific, named human rather than "our team".
 *
 * The row is identical across lanes on purpose. The promise does not change
 * with the noun, so neither should the way it is made.
 */
export async function InspectorRow({ record }: { record: VerificationRecord }) {
  const t = await getTranslations("detail");
  const locale = (await getLocale()) as Locale;

  const inspectedOn = formatDate(record.inspectedAt, INTL_LOCALES[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PersonRow
      name={record.inspectorName}
      title={`${t("hostedBy")} ${record.inspectorName}`}
      detail={`${t("inspectorRole")} · ${inspectedOn}`}
    />
  );
}
