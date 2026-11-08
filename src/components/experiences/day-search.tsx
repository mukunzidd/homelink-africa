"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { addDays, formatDate, today, type IsoDate } from "@/lib/domain/dates";
import { Calendar } from "@/components/ui/calendar";
import { StepperRow } from "@/components/ui/stepper";
import { PillSearch } from "@/components/search/pill-search";
import { cn } from "@/lib/cn";

/**
 * A day out is booked for a date and a number of people, and the list asks
 * for both: the price per person becomes the price for the group, and the
 * detail page opens on the same date and party.
 */
export function DaySearchBar({ initial }: { initial: { date?: string; party?: number } }) {
  const t = useTranslations("list");
  const tPanel = useTranslations("searchPanel");
  const tCal = useTranslations("calendar");
  const locale = useLocale() as Locale;
  const intl = INTL_LOCALES[locale];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [date, setDate] = useState<IsoDate | null>((initial.date as IsoDate) ?? null);
  const [party, setParty] = useState(initial.party ?? 2);

  function submit() {
    const p = new URLSearchParams(params.toString());
    if (date) p.set("date", date);
    else p.delete("date");
    if (party !== 2) p.set("party", String(party));
    else p.delete("party");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const dateLabel = date ? formatDate(date, intl, { weekday: "short", day: "numeric", month: "short" }) : null;
  const quick = [
    { key: "tomorrow", date: addDays(today(), 1), label: tPanel("quickTomorrow") },
    { key: "saturday", date: nextWeekday(6), label: t("thisSaturday") },
    { key: "sunday", date: nextWeekday(0), label: t("thisSunday") },
  ].filter((q, i, all) => all.findIndex((x) => x.date === q.date) === i);

  return (
    <PillSearch
      mobileTitle={t("daySearchTitle")}
      mobileSummary={[dateLabel ?? t("anyDate"), t("people", { count: party })].join(" · ")}
      onSubmit={submit}
      segments={[
        { key: "date", label: t("dayLabel"), value: dateLabel ?? t("anyDate"), filled: !!date, flex: "sm:flex-[1.4]" },
        { key: "people", label: t("peopleLabel"), value: t("people", { count: party }), filled: true, flex: "sm:flex-1" },
      ]}
      panels={[
        {
          key: "date",
          align: "left",
          clear: { label: tPanel("clearDates"), onClear: () => setDate(null), disabled: !date },
          body: (
            <div className="flex flex-col gap-4 p-5">
              <div className="grid grid-cols-3 gap-2">
                {quick.map((q) => (
                  <button
                    key={q.key}
                    type="button"
                    aria-pressed={date === q.date}
                    onClick={() => setDate(q.date)}
                    className={cn(
                      "flex cursor-pointer flex-col rounded-ctl border px-3 py-2 text-left transition-colors duration-150",
                      date === q.date ? "border-brand bg-brand-tint" : "border-line hover:border-ink-3",
                    )}
                  >
                    <span className={cn("text-[14px] font-semibold", date === q.date ? "text-brand" : "text-ink")}>{q.label}</span>
                    <span className="tnum text-[12px] text-ink-3">{formatDate(q.date, intl, { day: "numeric", month: "short" })}</span>
                  </button>
                ))}
              </div>
              <Calendar
                from={date}
                to={date}
                onSelect={setDate}
                locale={intl}
                months={1}
                labels={{ previousMonth: tCal("previousMonth"), nextMonth: tCal("nextMonth") }}
              />
            </div>
          ),
        },
        {
          key: "people",
          align: "right",
          clear: { label: tPanel("clear"), onClear: () => setParty(2), disabled: party === 2 },
          body: (
            <div className="w-[min(22rem,calc(100vw-2rem))] px-5 py-1">
              <StepperRow label={t("peopleLabel")} hint={t("peopleHint")} value={party} min={1} max={12} onChange={setParty} />
            </div>
          ),
        },
      ]}
    />
  );
}

/** The next given weekday (0 Sunday … 6 Saturday), today included. */
function nextWeekday(day: number): IsoDate {
  const now = today();
  const current = new Date(`${now}T00:00:00Z`).getUTCDay();
  return addDays(now, (day - current + 7) % 7);
}
