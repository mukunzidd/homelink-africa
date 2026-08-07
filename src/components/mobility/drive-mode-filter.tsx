"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/ui/filter-chip";

export function DriveModeFilter() {
  const t = useTranslations("cars");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("driveMode");

  function toggle(mode: string) {
    const next = new URLSearchParams(params.toString());
    if (current === mode) next.delete("driveMode");
    else next.set("driveMode", mode);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{t("driveMode")}</legend>
      {(["selfDrive", "withDriver"] as const).map((mode) => (
        <FilterChip
          key={mode}
          pressed={current === mode}
          onToggle={() => toggle(mode)}
        >
          {t(mode)}
        </FilterChip>
      ))}
    </fieldset>
  );
}
