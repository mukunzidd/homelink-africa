"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { parseStaySearch } from "@/lib/search-params";
import { MoneyText } from "@/components/ui/money-text";
import { CloseIcon } from "@/components/ui/icons";

/**
 * Everything narrowing the results, each with its own way back.
 *
 * Whether a filter came from the sidebar or from a sentence in smart search,
 * it is a URL parameter by the time it is here, so taking back "under $150"
 * is removing one parameter and nothing else moves.
 */
export function ActiveFilters({ empty }: { empty?: React.ReactNode } = {}) {
  const t = useTranslations("smart");
  const tAmenity = useTranslations("amenities");
  const tResults = useTranslations("results");
  const tSale = useTranslations("sale");
  const tList = useTranslations("list");
  const tLandmark = useTranslations("landmarks");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const search = parseStaySearch(Object.fromEntries(params.entries()));

  function without(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(params.toString());
    mutate(p);
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const chips: { key: string; label: React.ReactNode; remove: () => void }[] = [];
  if (search.q)
    chips.push({ key: "q", label: t("chipText", { text: search.q }), remove: () => without((p) => p.delete("q")) });
  if (search.neighbourhood)
    chips.push({ key: "n", label: search.neighbourhood, remove: () => without((p) => p.delete("neighbourhood")) });
  if (search.bedrooms)
    chips.push({
      key: "b",
      label: t("chipBedrooms", { count: search.bedrooms }),
      remove: () => without((p) => p.delete("bedrooms")),
    });
  if (search.maxPrice)
    chips.push({
      key: "max",
      label: (
        <>
          {t("chipUnder")} <MoneyText amount={search.maxPrice} rounded />
        </>
      ),
      remove: () =>
        without((p) => {
          p.delete("max");
          p.delete("cur");
        }),
    });
  const kind = params.get("kind");
  if (kind === "house" || kind === "apartment" || kind === "townhouse")
    chips.push({ key: "kind", label: tSale(`kind.${kind}`), remove: () => without((p) => p.delete("kind")) });
  for (const a of search.amenities)
    chips.push({
      key: `a-${a}`,
      label: tAmenity(a),
      remove: () =>
        without((p) => {
          const next = search.amenities.filter((x) => x !== a);
          if (next.length) p.set("amenities", next.join(","));
          else p.delete("amenities");
        }),
    });

  if (search.near)
    chips.push({
      key: "near",
      label: tList("chipFrom", { place: tLandmark(search.near) }),
      remove: () => without((p) => p.delete("near")),
    });

  if (!chips.length) return empty ? <>{empty}</> : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          aria-label={t("removeChip", { what: typeof c.label === "string" ? c.label : c.key })}
          className="group inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-brand/30 bg-brand-tint py-1 pl-3 pr-2 text-[13px] font-medium text-brand-deep transition-colors duration-150 hover:border-brand"
        >
          {c.label}
          <CloseIcon size={13} className="opacity-60 group-hover:opacity-100" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={() =>
            without((p) => {
              for (const k of ["q", "neighbourhood", "bedrooms", "max", "cur", "amenities", "kind", "near"]) p.delete(k);
            })
          }
          className="cursor-pointer rounded-ctl px-1 text-[13px] font-semibold text-ink-3 hover:text-ink"
        >
          {tResults("clearAll")}
        </button>
      )}
    </div>
  );
}
