import { getLocale, getTranslations } from "next-intl/server";
import type { VerificationRecord } from "@/lib/domain/types";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, today } from "@/lib/domain/dates";
import { cn } from "@/lib/cn";

/**
 * The inspector, on every result.
 *
 * It replaced a green "Verified" pill that sat on every card. Everything on
 * HomeLink is verified, so the pill said nothing a second time; a named person
 * and a date say who stood in the room and how long ago, which is the claim
 * the product actually makes. Same ring as the detail page's inspector row, at
 * list size.
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export async function InspectedBy({
  record,
  className,
}: {
  record: VerificationRecord;
  className?: string;
}) {
  const t = await getTranslations("list");
  const locale = (await getLocale()) as Locale;
  // The year only when it is not this one: "Nov 22" from last year read as
  // a fortnight ago.
  const thisYear = record.inspectedAt.slice(0, 4) === today().slice(0, 4);
  const date = formatDate(record.inspectedAt, INTL_LOCALES[locale], thisYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });

  return (
    <p className={cn("flex min-w-0 items-center gap-2 text-[12px] text-ink-2", className)}>
      <span
        aria-hidden="true"
        className="grid size-5 flex-none place-items-center rounded-full border border-trust/50 bg-trust-tint text-[9px] font-semibold text-trust"
      >
        {initials(record.inspectorName)}
      </span>
      <span className="truncate">{t("inspectedBy", { date, name: record.inspectorName })}</span>
    </p>
  );
}
