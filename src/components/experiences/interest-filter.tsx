"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { FilterChip } from "@/components/ui/filter-chip";

/**
 * Product & UX §5 packages experiences "by interest and age group". Interest is
 * the primary axis, so it sits in the open as chips rather than behind a rail —
 * choosing one is browsing, not narrowing.
 */
export function InterestFilter({
  interests,
  counts,
  total,
}: {
  interests: readonly string[];
  /** Trips per interest, so a chip says what pressing it leaves. */
  counts?: Record<string, number>;
  total?: number;
}) {
  const t = useTranslations("experiences");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("interest");

  function select(interest: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!interest || current === interest) next.delete("interest");
    else next.set("interest", interest);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{t("interestLabel")}</legend>

      <FilterChip pressed={!current} onToggle={() => select(null)}>
        {t("allInterests")}
        {total !== undefined && <Count n={total} />}
      </FilterChip>

      {interests.map((interest) => (
        <FilterChip
          key={interest}
          pressed={current === interest}
          onToggle={() => select(interest)}
        >
          {t(`interest.${interest}`)}
          {counts?.[interest] !== undefined && <Count n={counts[interest]} />}
        </FilterChip>
      ))}
    </fieldset>
  );
}

function Count({ n }: { n: number }) {
  return <span className="tnum ml-1.5 text-[12px] font-normal opacity-70">{n}</span>;
}
