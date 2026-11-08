"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, formatDateRange, isBefore, type IsoDate } from "@/lib/domain/dates";
import { Calendar } from "@/components/ui/calendar";
import { FilterChip } from "@/components/ui/filter-chip";
import { SegmentedChoice } from "@/components/ui/segmented-choice";
import { ChoiceList, PillSearch } from "@/components/search/pill-search";

type Place = "airport" | "hotel" | "office";

/**
 * Cars had two chips and four cards. A hire starts with when and where you
 * take the keys, so that is the bar at the top: pick-up, return, and the
 * hand-over place. Dates turn every card's daily rate into the total for the
 * hire, and are what makes "2 left" mean anything.
 *
 * Pick up and Return are two segments over one range calendar, the way a
 * hire is one decision with two ends.
 */
export function CarSearchBar({ initial }: { initial: { from?: string; to?: string; place?: string } }) {
  const t = useTranslations("list");
  const tPanel = useTranslations("searchPanel");
  const tCal = useTranslations("calendar");
  const locale = useLocale() as Locale;
  const intl = INTL_LOCALES[locale];
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [from, setFrom] = useState<IsoDate | null>((initial.from as IsoDate) ?? null);
  const [to, setTo] = useState<IsoDate | null>((initial.to as IsoDate) ?? null);
  const [hovered, setHovered] = useState<IsoDate | null>(null);
  const [place, setPlace] = useState<Place>(((["airport", "hotel", "office"] as const).find((k) => k === initial.place)) ?? "airport");

  function submit() {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of [["from", from ?? ""], ["to", to && from && to > from ? to : ""], ["place", place === "airport" ? "" : place]] as const) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function pick(date: IsoDate) {
    // Same rule as the Stay calendar: a click extends an open range, and
    // anything else starts a new one.
    if (!from || to || !isBefore(from, date)) {
      setFrom(date);
      setTo(null);
      return;
    }
    setTo(date);
    setHovered(null);
  }

  const short = (d: IsoDate) => formatDate(d, intl, { weekday: "short", day: "numeric", month: "short" });

  return (
    <PillSearch
      mobileTitle={t("carSearchTitle")}
      mobileSummary={[from && to ? formatDateRange(from, to, intl) : t("anyDates"), t(`place.${place}`)].join(" · ")}
      onSubmit={submit}
      segments={[
        { key: "pickUp", panel: "dates", label: t("pickUp"), value: from ? short(from) : t("addDate"), filled: !!from, flex: "sm:flex-1" },
        { key: "return", panel: "dates", label: t("return"), value: to ? short(to) : t("addDate"), filled: !!to, flex: "sm:flex-1" },
        { key: "place", label: t("handOver"), value: t(`place.${place}`), filled: true, flex: "sm:flex-[1.2]" },
      ]}
      panels={[
        {
          key: "dates",
          align: "left",
          clear: { label: tPanel("clearDates"), onClear: () => { setFrom(null); setTo(null); }, disabled: !from && !to },
          body: (
            <div className="p-5">
              <Calendar
                from={from}
                to={to}
                hovered={hovered}
                onHover={setHovered}
                onSelect={pick}
                locale={intl}
                labels={{ previousMonth: tCal("previousMonth"), nextMonth: tCal("nextMonth") }}
              />
            </div>
          ),
        },
        {
          key: "place",
          align: "right",
          body: (
            <ChoiceList
              className="w-[min(22rem,calc(100vw-2rem))]"
              value={place}
              onChange={setPlace}
              options={(["airport", "hotel", "office"] as const).map((k) => ({ value: k, label: t(`place.${k}`), hint: t.has(`placeHint.${k}`) ? t(`placeHint.${k}`) : undefined }))}
            />
          ),
        },
      ]}
    />
  );
}

/** Drive mode, seats and gearbox: the three things that rule a car out. */
export function CarFilters() {
  const t = useTranslations("cars");
  const tList = useTranslations("list");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const driveMode = params.get("driveMode");
  const seats = params.get("seats") ?? "";
  const gear = params.get("gear") ?? "";

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t("driveMode")}</legend>
        {(["selfDrive", "withDriver"] as const).map((mode) => (
          <FilterChip key={mode} pressed={driveMode === mode} onToggle={() => set("driveMode", driveMode === mode ? "" : mode)}>
            {t(mode)}
          </FilterChip>
        ))}
      </fieldset>
      <div className="flex items-center gap-2 sm:w-64">
        <span className="w-16 flex-none text-[13px] font-medium text-ink-2 sm:w-auto">{tList("seatsLabel")}</span>
        <SegmentedChoice
          label={tList("seatsLabel")}
          value={seats}
          options={[{ value: "", label: tList("any") }, { value: "5", label: "5+" }, { value: "7", label: "7+" }, { value: "12", label: "12+" }]}
          onChange={(v) => set("seats", v)}
        />
      </div>
      <div className="flex items-center gap-2 sm:w-72">
        <span className="w-16 flex-none text-[13px] font-medium text-ink-2 sm:w-auto">{tList("gearLabel")}</span>
        <SegmentedChoice
          label={tList("gearLabel")}
          value={gear}
          options={[
            { value: "", label: tList("any") },
            { value: "automatic", label: t("transmission.automatic") },
            { value: "manual", label: t("transmission.manual") },
          ]}
          onChange={(v) => set("gear", v)}
        />
      </div>
    </div>
  );
}
