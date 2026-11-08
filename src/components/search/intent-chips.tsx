"use client";

import { useTranslations } from "next-intl";
import type { SearchIntent } from "@/lib/search/parse";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDateRange } from "@/lib/domain/dates";
import { MoneyText } from "@/components/ui/money-text";
import { SparkIcon } from "@/components/ui/icons";

/**
 * What a sentence was read as, one chip per understood fact.
 *
 * Read-only here, in the palette, where the sentence is still being typed and
 * editing the sentence is the way to change it. On the results page the same
 * facts are URL parameters and the chips there can each be taken back.
 */
export function IntentChips({
  intent,
  locale,
  dateLabel,
  datesAsWords,
}: {
  intent: SearchIntent;
  locale: string;
  /**
   * Pre-formatted on the server when the chips are server-rendered. Node and
   * the browser ship different ICU data — "Nov 9 – 16" differs by a thin
   * space — and a date formatted on both sides fails hydration.
   */
  dateLabel?: string;
  /**
   * Show dates as the words they came from. For statically rendered chips,
   * where a date computed at build time would go stale by the next morning.
   */
  datesAsWords?: boolean;
}) {
  const t = useTranslations("smart");
  const tAmenity = useTranslations("amenities");
  const tInterest = useTranslations("experiences.interest");
  const tSort = useTranslations("results.sort");

  const chips: React.ReactNode[] = [];
  const push = (key: string, node: React.ReactNode) =>
    chips.push(
      <span key={key} className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-surface px-2.5 py-1 text-[13px] font-medium text-ink">
        {node}
      </span>,
    );

  if (intent.lane) push("lane", t(`lane.${intent.lane}`));
  if (intent.neighbourhood) {
    push(
      "place",
      intent.landmark
        ? t("chipNear", { place: intent.neighbourhood, landmark: t(`landmark.${intent.landmark}`) })
        : intent.typed
          ? t("chipTyped", { place: intent.neighbourhood, typed: intent.typed })
          : intent.neighbourhood,
    );
  }
  if (intent.bedrooms) push("beds", t("chipBedrooms", { count: intent.bedrooms }));
  if (intent.party) push("party", intent.lane === "cars" ? t("chipSeats", { count: intent.party }) : t("chipParty", { count: intent.party }));
  if (intent.maxPrice)
    push(
      "price",
      <>
        {t("chipUnder")} <MoneyText amount={intent.maxPrice} rounded />
        {intent.lane !== "buy" && (
          <span className="text-ink-3">{intent.lease ? t("perMonthShort") : intent.lane === "cars" ? t("perDayShort") : t("perNightShort")}</span>
        )}
      </>,
    );
  for (const a of intent.amenities) push(`a-${a}`, tAmenity(a));
  if (intent.lease) push("lease", t("chipLease"));
  if (intent.from && intent.to)
    push("dates", datesAsWords && intent.dateWords ? intent.dateWords.charAt(0).toUpperCase() + intent.dateWords.slice(1) : dateLabel ?? formatDateRange(intent.from, intent.to, INTL_LOCALES[locale as Locale] ?? locale));
  if (intent.sort) push("sort", tSort(intent.sort));
  if (intent.driveMode) push("drive", t(`drive.${intent.driveMode}`));
  if (intent.interest) push("interest", tInterest(intent.interest));
  if (intent.text) push("text", t("chipText", { text: intent.text }));

  if (!chips.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 inline-flex items-center gap-1 text-[12px] font-semibold text-ink-3">
        <SparkIcon size={13} className="text-brand" />
        {t("understood")}
      </span>
      {chips}
    </div>
  );
}
