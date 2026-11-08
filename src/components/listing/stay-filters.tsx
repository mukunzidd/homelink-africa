"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Amenity } from "@/lib/domain/types";
import { usePreferences } from "@/lib/preferences/context";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/ui/filter-chip";
import { SegmentedChoice, FilterPanelHeader } from "@/components/ui/segmented-choice";
import { LANDMARK_KEYS } from "@/lib/domain/landmarks";
import { Select } from "@/components/ui/select";
import { FlagIcon, PinIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Filters write to the URL, not to component state, so a filtered result set
 * is one shareable link and the back button does what people expect.
 */
const BEDROOM_STEPS = [1, 2, 3, 4, 5] as const;

/**
 * Each amenity carries the count it would leave. A chip that would empty the
 * page says 0 before anyone presses it, which is cheaper than an empty state
 * after.
 */
export function StayFilters({
  neighbourhoods,
  amenities,
  counts,
}: {
  neighbourhoods: string[];
  amenities: readonly Amenity[];
  counts?: Partial<Record<Amenity, number>>;
}) {
  const t = useTranslations("filters");
  const tAmenity = useTranslations("amenities");
  const { currency } = usePreferences();
  const tResults = useTranslations("results");
  const tList = useTranslations("list");
  const tLandmark = useTranslations("landmarks");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const active = new Set(
    (params.get("amenities") ?? "").split(",").filter(Boolean),
  );
  const band = params.get("band");
  const bedrooms = params.get("bedrooms");
  const neighbourhood = params.get("neighbourhood") ?? "";
  const near = params.get("near") ?? "";
  const maxParam = params.get("max") ?? "";
  const curParam = params.get("cur");
  // The draft belongs to the URL value it was started from: when the URL
  // changes underneath it (a chip removed, back button), the draft resets.
  const [draft, setDraft] = useState({ from: maxParam, value: maxParam });
  const maxDraft = draft.from === maxParam ? draft.value : maxParam;
  const setMaxDraft = (value: string) => setDraft({ from: maxParam, value });

  function applyMax() {
    const value = Number(maxDraft.replace(/[^\d.]/g, ""));
    withParams((next) => {
      if (Number.isFinite(value) && value > 0) {
        next.set("max", String(value));
        // A typed ceiling is in the currency the page is being read in,
        // unless it was already set in another one and left untouched.
        next.set("cur", curParam && maxDraft === maxParam ? curParam : currency);
      } else {
        next.delete("max");
        next.delete("cur");
      }
    });
  }

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function withParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    push(next);
  }

  const clearable =
    active.size > 0 || bedrooms !== null || !!neighbourhood || !!maxParam || !!near;

  const labelClass =
    "text-[13px] font-medium text-ink-2";

  return (
    <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-4">
      <FilterPanelHeader
        title={tList("filters")}
        clearLabel={t("clear")}
        onClear={
          clearable
            ? () =>
                /* Dates, party and sort are not filters: clearing narrowing
                   choices must not throw away what the person searched for. */
                withParams((next) => {
                  ["amenities", "bedrooms", "neighbourhood", "max", "cur", "q", "near"].forEach((k) => next.delete(k));
                })
            : undefined
        }
      />

      <Select
        label={tResults("neighbourhood")}
        value={neighbourhood}
        onChange={(next) =>
          withParams((params) => {
            if (next) params.set("neighbourhood", next);
            else params.delete("neighbourhood");
          })
        }
        icon={<PinIcon size={15} />}
        options={[
          { value: "", label: tResults("anyNeighbourhood") },
          ...neighbourhoods.map((n) => ({ value: n, label: n })),
        ]}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>{tResults("bedrooms")}</legend>
        <SegmentedChoice
          label={tResults("bedrooms")}
          value={bedrooms ?? ""}
          options={[
            { value: "", label: tResults("anyBedrooms") },
            ...BEDROOM_STEPS.map((n) => ({ value: String(n), label: `${n}+` })),
          ]}
          onChange={(v) => withParams((next) => (v ? next.set("bedrooms", v) : next.delete("bedrooms")))}
        />
      </fieldset>

      <Select
        label={tList("measureFrom")}
        value={near}
        onChange={(next) => withParams((p) => (next ? p.set("near", next) : p.delete("near")))}
        icon={<FlagIcon size={15} />}
        options={[
          { value: "", label: tLandmark("cityCentre") },
          ...LANDMARK_KEYS.filter((k) => k !== "cityCentre").map((k) => ({ value: k, label: tLandmark(k) })),
        ]}
      />

      {/* Stay or rent is the switch above the results now, not a filter
          here: it changes what a price means, not how many there are. */}

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>{t("maxPrice")}</legend>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyMax();
          }}
          className="flex items-center gap-2"
        >
          <label className="flex min-h-10 flex-1 items-center gap-2 rounded-ctl border border-line bg-surface px-3 focus-within:border-brand">
            <span className="text-[13px] font-semibold text-ink-3">{curParam ?? currency}</span>
            <input
              inputMode="decimal"
              value={maxDraft}
              onChange={(e) => setMaxDraft(e.target.value)}
              onBlur={() => maxDraft !== maxParam && applyMax()}
              placeholder={band === "long" ? t("maxPerMonth") : t("maxPerNight")}
              aria-label={band === "long" ? t("maxPerMonth") : t("maxPerNight")}
              className="tnum min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </label>
        </form>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>{t("amenitiesHeading")}</legend>
        <div className="flex flex-wrap gap-2">
          {amenities.map((key) => {
            const count = counts?.[key];
            const pressed = active.has(key);
            return (
              <FilterChip
                key={key}
                pressed={pressed}
                onToggle={() =>
                  withParams((next) => {
                    const set = new Set(active);
                    if (set.has(key)) set.delete(key);
                    else set.add(key);
                    if (set.size) next.set("amenities", [...set].join(","));
                    else next.delete("amenities");
                  })
                }
              >
                {tAmenity(key)}
                {count !== undefined && !pressed && (
                  <span className={cn("tnum text-[12px]", count === 0 ? "text-ink-3/70" : "text-ink-3")}>{count}</span>
                )}
              </FilterChip>
            );
          })}
        </div>
      </fieldset>

    </div>
  );
}
