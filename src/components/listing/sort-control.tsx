"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { SORTS, type Sort } from "@/lib/search-params";
import { SortIcon, ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export function SortControl({ value }: { value: Sort }) {
  const t = useTranslations("results");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div
      className={cn(
        "relative flex min-h-11 items-center gap-1.5 rounded-ctl border border-line bg-surface px-3",
        "text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
        "focus-within:outline focus-within:outline-2 focus-within:outline-brand focus-within:-outline-offset-2",
      )}
    >
      <SortIcon size={15} />
      <span aria-hidden="true" className="text-[13px] font-semibold">
        {t(`sort.${value}`)}
      </span>
      <ChevronDownIcon className="text-ink-3" />

      <select
        aria-label={t("sortLabel")}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === "recommended") next.delete("sort");
          else next.set("sort", e.target.value);
          const qs = next.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
        className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline-none"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(`sort.${sort}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
