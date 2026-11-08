"use client";

import { useTranslations } from "next-intl";
import { GlobeIcon, PinIcon, SparkIcon } from "@/components/ui/icons";
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
  onSubmitText,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  destinations: Destination[];
  onSelect: (name: string) => void;
  /** A sentence rather than a place: read by the smart search parser. */
  onSubmitText?: (text: string) => void;
}) {
  const t = useTranslations("searchPanel");
  const tList = useTranslations("list");

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? destinations.filter((d) => d.name.toLowerCase().includes(needle))
    : destinations;

  const row =
    "flex w-full cursor-pointer items-center gap-3.5 rounded-ctl p-2.5 text-left transition-colors duration-150 hover:bg-surface-2";
  const chip =
    "grid size-11 flex-none place-items-center rounded-ctl border border-line bg-surface-2 text-ink-2";

  return (
    <div className="flex max-h-[26rem] flex-col overflow-y-auto p-2">
      {onSubmitText && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const exact = destinations.find((d) => d.name.toLowerCase() === needle);
            if (exact) onSelect(exact.name);
            else if (needle) onSubmitText(query.trim());
          }}
          className="p-1"
        >
          <label className="flex min-h-11 items-center gap-2.5 rounded-ctl border border-line bg-surface px-3 focus-within:border-brand">
            <SparkIcon size={16} className="text-brand" />
            <input
              autoFocus
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={tList("wherePlaceholder")}
              aria-label={tList("wherePlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
            />
          </label>
        </form>
      )}

      {onSubmitText && needle && !destinations.some((d) => d.name.toLowerCase() === needle) && (
        <button type="button" onClick={() => onSubmitText(query.trim())} className={row}>
          <span className={chip}>
            <SparkIcon size={18} className="text-brand" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-medium text-ink">{tList("askFor", { text: query.trim() })}</span>
            <span className="text-[13px] text-ink-3">{tList("askForHint")}</span>
          </span>
        </button>
      )}

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

      {needle && matches.length === 0 && !onSubmitText && (
        <p className="px-2.5 py-6 text-center text-sm text-ink-3">
          {t("anywhereHint")}
        </p>
      )}
    </div>
  );
}
