"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { SORTS, type Sort } from "@/lib/search-params";
import { Select } from "@/components/ui/select";
import { SortIcon } from "@/components/ui/icons";

/**
 * `options` and `labels` let the Buy lane reuse this with its own sorts —
 * "largest" there means floor area, not bedrooms — while the stay pages keep
 * the defaults.
 */
export function SortControl({
  value,
  options = SORTS,
  labels,
}: {
  value: Sort | string;
  options?: readonly string[];
  labels?: Record<string, string>;
}) {
  const t = useTranslations("results");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <Select
      label={t("sortLabel")}
      hideLabel
      size="sm"
      value={value}
      icon={<SortIcon size={15} />}
      options={options.map((sort) => ({ value: sort, label: labels?.[sort] ?? t(`sort.${sort as Sort}`) }))}
      onChange={(next) => {
        const params2 = new URLSearchParams(params.toString());
        if (next === "recommended") params2.delete("sort");
        else params2.set("sort", next);
        const qs = params2.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }}
      className="min-w-0 flex-1 sm:w-52 sm:flex-none"
    />
  );
}
