"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { usePreferences } from "@/lib/preferences/context";
import { SegmentedChoice, FilterPanelHeader } from "@/components/ui/segmented-choice";
import { LANDMARK_KEYS } from "@/lib/domain/landmarks";
import { Select } from "@/components/ui/select";
import { FlagIcon, HomeIcon, PinIcon } from "@/components/ui/icons";

const KINDS = ["house", "apartment", "townhouse"] as const;
const BEDROOM_STEPS = [2, 3, 4, 5] as const;

/**
 * Buying's filters. Fewer than a stay's, on purpose: nobody filters a house
 * purchase by "fibre internet". What narrows a purchase is where, how big,
 * what kind of building, and the budget.
 */
export function SaleFilters({ neighbourhoods }: { neighbourhoods: string[] }) {
  const t = useTranslations("sale");
  const tResults = useTranslations("results");
  const tFilters = useTranslations("filters");
  const tList = useTranslations("list");
  const tLandmark = useTranslations("landmarks");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { currency } = usePreferences();

  const neighbourhood = params.get("neighbourhood") ?? "";
  const bedrooms = params.get("bedrooms");
  const kind = params.get("kind");
  const near = params.get("near") ?? "";
  const maxParam = params.get("max") ?? "";
  const curParam = params.get("cur");
  const [draft, setDraft] = useState({ from: maxParam, value: maxParam });
  const maxDraft = draft.from === maxParam ? draft.value : maxParam;

  function withParams(mutate: (next: URLSearchParams) => void) {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function applyMax() {
    const raw = maxDraft.trim().toLowerCase();
    // "200m" and "200 million" are how house prices are said out loud.
    const n = Number(raw.replace(/[^\d.]/g, "")) * (/m|million/.test(raw) ? 1_000_000 : /k/.test(raw) ? 1_000 : 1);
    withParams((next) => {
      if (Number.isFinite(n) && n > 0) {
        next.set("max", String(n));
        next.set("cur", curParam && maxDraft === maxParam ? curParam : currency);
      } else {
        next.delete("max");
        next.delete("cur");
      }
    });
  }

  const label = "text-[13px] font-medium text-ink-2";
  const clearable = !!neighbourhood || !!bedrooms || !!kind || !!maxParam || !!near;

  return (
    <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-4">
      <FilterPanelHeader
        title={tList("filters")}
        clearLabel={tFilters("clear")}
        onClear={clearable ? () => withParams((p) => ["neighbourhood", "bedrooms", "kind", "max", "cur", "q", "near"].forEach((k) => p.delete(k))) : undefined}
      />

      <Select
        label={tResults("neighbourhood")}
        value={neighbourhood}
        onChange={(next) => withParams((p) => (next ? p.set("neighbourhood", next) : p.delete("neighbourhood")))}
        icon={<PinIcon size={15} />}
        options={[{ value: "", label: tResults("anyNeighbourhood") }, ...neighbourhoods.map((n) => ({ value: n, label: n }))]}
      />

      <Select
        label={t("kindLabel")}
        value={kind ?? ""}
        onChange={(v) => withParams((p) => (v ? p.set("kind", v) : p.delete("kind")))}
        icon={<HomeIcon size={15} />}
        options={[{ value: "", label: t("kindAny") }, ...KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }))]}
      />

      <fieldset className="flex flex-col gap-2">
        <legend className={label}>{tResults("bedrooms")}</legend>
        <SegmentedChoice
          label={tResults("bedrooms")}
          value={bedrooms ?? ""}
          options={[{ value: "", label: tResults("anyBedrooms") }, ...BEDROOM_STEPS.map((n) => ({ value: String(n), label: `${n}+` }))]}
          onChange={(v) => withParams((p) => (v ? p.set("bedrooms", v) : p.delete("bedrooms")))}
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

      <fieldset className="flex flex-col gap-2">
        <legend className={label}>{tFilters("maxPrice")}</legend>
        <form onSubmit={(e) => { e.preventDefault(); applyMax(); }}>
          <label className="flex min-h-10 items-center gap-2 rounded-ctl border border-line bg-surface px-3 focus-within:border-brand">
            <span className="text-[13px] font-semibold text-ink-3">{curParam ?? currency}</span>
            <input
              inputMode="decimal"
              value={maxDraft}
              onChange={(e) => setDraft({ from: maxParam, value: e.target.value })}
              onBlur={() => maxDraft !== maxParam && applyMax()}
              placeholder={t("maxPlaceholder")}
              aria-label={t("maxPlaceholder")}
              className="tnum min-w-0 flex-1 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </label>
        </form>
      </fieldset>

    </div>
  );
}
