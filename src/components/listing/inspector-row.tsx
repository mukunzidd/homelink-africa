import { getLocale, getTranslations } from "next-intl/server";
import type { VerificationRecord } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";

/**
 * The inspector, given a face.
 *
 * Every marketplace at this scale puts a person at the top of a listing — a
 * host, an owner, a superhost badge. HomeLink's equivalent is not the owner,
 * because the owner is not who the guest is trusting. It is the person from
 * our team who walked through the place, and the whole product rests on them
 * being a specific, named human rather than "our team".
 *
 * Initials rather than a photograph: a fabricated headshot on a page about
 * verification would be exactly the wrong lie to tell.
 */
export async function InspectorRow({ record }: { record: VerificationRecord }) {
  const t = await getTranslations("detail");
  const locale = (await getLocale()) as Locale;

  const initials = record.inspectorName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="grid size-12 flex-none place-items-center rounded-full border border-trust/35 bg-trust-tint text-[15px] font-bold text-trust"
      >
        {initials}
      </span>

      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-ink">
          {t("hostedBy")} {record.inspectorName}
        </p>
        <p className="text-[13px] text-ink-2">
          {t("inspectorRole")} ·{" "}
          {formatDate(record.inspectedAt, INTL_LOCALES[locale], {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
