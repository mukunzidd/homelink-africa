"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addDays, isBefore, type IsoDate } from "@/lib/domain/dates";
import { Segmented } from "@/components/ui/segmented";
import { BigStepper } from "@/components/ui/stepper";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";

/**
 * Exact dates, or a flexible span.
 *
 * This is where HomeLink's duration bands belong. They were a third control on
 * the landing page competing with the search bar and the intent doors, all
 * asking about the same decision. Folding them in here means one question —
 * "when" — with two instruments behind it, which is also how people actually
 * think: either you know your dates or you know roughly how long.
 *
 * The long band is not a longer holiday. Twelve months or more is a lease
 * application, so the panel says so rather than quietly producing a nightly
 * quote for a year.
 */
export type FlexibleSpan = "weekend" | "week" | "month" | "long";

export type WhenValue = {
  from: IsoDate | null;
  to: IsoDate | null;
  /** Set only in flexible mode; exact dates clear it. */
  span: FlexibleSpan | null;
  months: number;
};

const SPAN_NIGHTS: Record<Exclude<FlexibleSpan, "long">, number> = {
  weekend: 2,
  week: 7,
  month: 30,
};

export function WhenPanel({
  value,
  onChange,
}: {
  value: WhenValue;
  onChange: (next: WhenValue) => void;
}) {
  const t = useTranslations("searchPanel");
  const tCal = useTranslations("calendar");
  const locale = useLocale() as Locale;

  const [mode, setMode] = useState<"dates" | "flexible">(
    value.span ? "flexible" : "dates",
  );
  const [hovered, setHovered] = useState<IsoDate | null>(null);

  function pick(date: IsoDate) {
    // No arrival yet, or a click before the current one: treat it as the new
    // arrival rather than an error. Nobody clicks backwards by accident twice.
    if (!value.from || !value.to || !isBefore(value.from, date)) {
      onChange({ ...value, from: date, to: null, span: null });
      return;
    }
    onChange({ ...value, to: date, span: null });
    setHovered(null);
  }

  function chooseSpan(span: FlexibleSpan) {
    if (span === "long") {
      onChange({ ...value, span, from: null, to: null });
      return;
    }
    // A flexible span still needs concrete dates behind it so results can be
    // priced. Anchored a week out, which is the earliest realistic arrival.
    const start = addDays(value.from ?? addDays(nowish(), 7), 0);
    onChange({
      ...value,
      span,
      from: start,
      to: addDays(start, SPAN_NIGHTS[span]),
    });
  }

  function nowish(): IsoDate {
    return value.from ?? new Date().toISOString().slice(0, 10);
  }

  const spans: { value: FlexibleSpan; label: string }[] = [
    { value: "weekend", label: t("weekend") },
    { value: "week", label: t("week") },
    { value: "month", label: t("month") },
    { value: "long", label: t("longStay") },
  ];

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      <Segmented
        label={t("whenLabel")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "dates", label: t("modeDates") },
          { value: "flexible", label: t("modeFlexible") },
        ]}
      />

      {mode === "dates" ? (
        <Calendar
          from={value.from}
          to={value.to}
          hovered={hovered}
          onHover={setHovered}
          onSelect={pick}
          locale={INTL_LOCALES[locale]}
          labels={{
            previousMonth: tCal("previousMonth"),
            nextMonth: tCal("nextMonth"),
          }}
        />
      ) : (
        <div className="flex w-full max-w-lg flex-col items-center gap-5">
          <p className="font-display text-xl font-semibold text-ink">
            {t("howLong")}
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {spans.map((span) => (
              <button
                key={span.value}
                type="button"
                aria-pressed={value.span === span.value}
                onClick={() => chooseSpan(span.value)}
                className={cn(
                  "cursor-pointer rounded-full border px-5 py-2.5 text-[14px] font-medium",
                  "transition-colors duration-150",
                  value.span === span.value
                    ? "border-brand bg-brand-tint text-brand"
                    : "border-line text-ink hover:border-ink-3",
                )}
              >
                {span.label}
              </button>
            ))}
          </div>

          {value.span === "long" && (
            <div className="flex w-full flex-col items-center gap-3 border-t border-line pt-4">
              <BigStepper
                value={value.months}
                unit={t("monthsUnit", { count: value.months })}
                min={1}
                max={24}
                onChange={(months) => onChange({ ...value, months })}
              />
              {value.months >= 12 && (
                <p className="max-w-[46ch] text-center text-[13px] leading-relaxed text-ink-2">
                  {t("leaseNote")}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
