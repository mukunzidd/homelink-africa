"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/ui/filter-chip";

/**
 * Filters live in the URL, not in component state, so a filtered result set is
 * shareable and survives a refresh — the behaviour people already expect from
 * every booking site they have used.
 */
const AMENITIES = ["backupPower", "fibre", "furnished", "parking"] as const;

export function StayFilters() {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const active = new Set((params.get("amenities") ?? "").split(",").filter(Boolean));
  const band = params.get("band");

  function push(next: URLSearchParams) {
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function toggleAmenity(key: string) {
    const next = new URLSearchParams(params.toString());
    const set = new Set(active);
    if (set.has(key)) set.delete(key);
    else set.add(key);

    if (set.size) next.set("amenities", [...set].join(","));
    else next.delete("amenities");
    push(next);
  }

  function toggleLongTerm() {
    const next = new URLSearchParams(params.toString());
    if (band === "long") next.delete("band");
    else next.set("band", "long");
    push(next);
  }

  const hasFilters = active.size > 0 || band !== null;

  return (
    <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
      <div className="flex flex-wrap gap-2">
        {/* Nothing unverified is ever listed, so this is pressed and inert
            until the vetted-marketplace lane opens in Phase 3. */}
        <FilterChip pressed onToggle={() => {}}>
          {t("verifiedOnly")}
        </FilterChip>

        <FilterChip pressed={band === "long"} onToggle={toggleLongTerm}>
          {t("longTerm")}
        </FilterChip>

        {AMENITIES.map((key) => (
          <FilterChip
            key={key}
            pressed={active.has(key)}
            onToggle={() => toggleAmenity(key)}
          >
            {t(key)}
          </FilterChip>
        ))}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep cursor-pointer"
        >
          {t("clear")}
        </button>
      )}
    </div>
  );
}
