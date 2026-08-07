"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/ui/filter-chip";
import { Select } from "@/components/ui/select";
import { PinIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * Filters write to the URL, not to component state, so a filtered result set
 * is one shareable link and the back button does what people expect.
 */
const AMENITIES = ["backupPower", "fibre", "furnished", "parking"] as const;
const BEDROOM_STEPS = [1, 2, 3, 4] as const;

export function StayFilters({ neighbourhoods }: { neighbourhoods: string[] }) {
  const t = useTranslations("filters");
  const tResults = useTranslations("results");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const active = new Set(
    (params.get("amenities") ?? "").split(",").filter(Boolean),
  );
  const band = params.get("band");
  const bedrooms = params.get("bedrooms");
  const neighbourhood = params.get("neighbourhood") ?? "";

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
    active.size > 0 || band !== null || bedrooms !== null || !!neighbourhood;

  const labelClass =
    "text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3";

  return (
    <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-4">
      <h2 className="font-display text-lg font-semibold text-ink">
        {tResults("filtersHeading")}
      </h2>

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
        <div className="flex flex-wrap gap-2">
          <FilterChip
            pressed={!bedrooms}
            onToggle={() => withParams((next) => next.delete("bedrooms"))}
          >
            {tResults("anyBedrooms")}
          </FilterChip>
          {BEDROOM_STEPS.map((n) => (
            <FilterChip
              key={n}
              pressed={bedrooms === String(n)}
              onToggle={() =>
                withParams((next) => {
                  if (bedrooms === String(n)) next.delete("bedrooms");
                  else next.set("bedrooms", String(n));
                })
              }
            >
              {tResults("bedroomsPlus", { count: n })}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>{tResults("filtersHeading")}</legend>
        <div className="flex flex-wrap gap-2">
          {/* Nothing unverified is ever listed, so this is pressed and inert
              until the vetted-marketplace lane opens in Phase 3. */}
          <FilterChip pressed onToggle={() => {}}>
            {t("verifiedOnly")}
          </FilterChip>

          <FilterChip
            pressed={band === "long"}
            onToggle={() =>
              withParams((next) => {
                if (band === "long") next.delete("band");
                else next.set("band", "long");
              })
            }
          >
            {t("longTerm")}
          </FilterChip>

          {AMENITIES.map((key) => (
            <FilterChip
              key={key}
              pressed={active.has(key)}
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
              {t(key)}
            </FilterChip>
          ))}
        </div>
      </fieldset>

      {clearable && (
        <button
          type="button"
          onClick={() =>
            /* Dates, party and sort are not filters — clearing narrowing
               choices must not throw away what the person searched for. */
            withParams((next) => {
              next.delete("amenities");
              next.delete("band");
              next.delete("bedrooms");
              next.delete("neighbourhood");
            })
          }
          className="cursor-pointer self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}
