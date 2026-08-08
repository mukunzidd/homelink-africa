"use client";

import { useTranslations } from "next-intl";
import { GlobeIcon, PinIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type Destination = { name: string; count: number };

/**
 * Suggested destinations rather than an empty text field.
 *
 * An empty box asks the visitor to already know Kigali's neighbourhoods. Most
 * arrivals do not, and the diaspora often knows the city as it was rather than
 * as it is. Each row carries how much verified inventory sits behind it, which
 * is both more useful than a bare name and honest when a neighbourhood is thin.
 */
export function WherePanel({
  query,
  onQueryChange,
  destinations,
  onSelect,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  destinations: Destination[];
  onSelect: (name: string) => void;
}) {
  const t = useTranslations("searchPanel");

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? destinations.filter((d) => d.name.toLowerCase().includes(needle))
    : destinations;

  const row =
    "flex w-full cursor-pointer items-center gap-3.5 rounded-ctl p-2.5 text-left transition-colors duration-150 hover:bg-surface-2";
  const chip =
    "grid size-11 flex-none place-items-center rounded-[10px] border border-line bg-surface-2 text-ink-2";

  return (
    <div className="flex max-h-[22rem] flex-col overflow-y-auto p-2">
      <p className="px-2.5 pb-1 pt-2 text-[13px] font-semibold text-ink-2">
        {t("suggested")}
      </p>

      {!needle && (
        <button type="button" onClick={() => onSelect("")} className={row}>
          <span className={chip}>
            <GlobeIcon size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-medium text-ink">
              {t("anywhere")}
            </span>
            <span className="text-[13px] text-ink-3">{t("anywhereHint")}</span>
          </span>
        </button>
      )}

      {matches.map((destination) => (
        <button
          key={destination.name}
          type="button"
          onClick={() => onSelect(destination.name)}
          className={cn(row, query === destination.name && "bg-brand-tint")}
        >
          <span className={chip}>
            <PinIcon size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-medium text-ink">
              {destination.name}
            </span>
            <span className="text-[13px] text-ink-3">
              {t("placesCount", { count: destination.count })}
            </span>
          </span>
        </button>
      ))}

      {needle && matches.length === 0 && (
        <p className="px-2.5 py-6 text-center text-sm text-ink-3">
          {t("anywhereHint")}
        </p>
      )}
    </div>
  );
}
