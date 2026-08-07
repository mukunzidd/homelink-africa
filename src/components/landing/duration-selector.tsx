"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DurationBand } from "@/lib/domain/types";
import { cn } from "@/lib/cn";

/**
 * The global "when and how long" control. Product & UX §4 puts this UPFRONT,
 * before results, because it pre-configures the flow: short and medium mean
 * nightly booking, long means a lease application. Getting this wrong late is
 * expensive for the user, so it is asked first.
 */
const BANDS: DurationBand[] = ["short", "medium", "long"];

export function DurationSelector({
  value,
  onChange,
}: {
  value?: DurationBand;
  onChange?: (band: DurationBand) => void;
}) {
  const t = useTranslations("duration");
  const [internal, setInternal] = useState<DurationBand>("short");
  const selected = value ?? internal;

  function select(band: DurationBand) {
    setInternal(band);
    onChange?.(band);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-xs font-bold uppercase tracking-[0.1em] text-ink-3">
        {t("label")}
      </legend>

      <div className="grid gap-2 sm:grid-cols-3">
        {BANDS.map((band) => {
          const active = selected === band;
          return (
            <button
              key={band}
              type="button"
              aria-pressed={active}
              onClick={() => select(band)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-ctl border px-4 py-3 text-left",
                "transition-colors duration-150 ease-out cursor-pointer",
                active
                  ? "border-brand bg-brand-tint"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "text-[15px] font-semibold",
                  active ? "text-brand" : "text-ink",
                )}
              >
                {t(band)}
              </span>
              <span className="text-xs text-ink-3">{t(`${band}Hint`)}</span>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-ink-2">{t("helper")}</p>
    </fieldset>
  );
}
