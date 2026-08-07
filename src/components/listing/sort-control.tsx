"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { SORTS, type Sort } from "@/lib/search-params";
import { Select } from "@/components/ui/select";
import { SortIcon } from "@/components/ui/icons";

export function SortControl({ value }: { value: Sort }) {
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
      options={SORTS.map((sort) => ({ value: sort, label: t(`sort.${sort}`) }))}
      onChange={(next) => {
        const params2 = new URLSearchParams(params.toString());
        if (next === "recommended") params2.delete("sort");
        else params2.set("sort", next);
        const qs = params2.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }}
      className="w-52"
    />
  );
}
