import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Booking } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { canAccess } from "@/lib/workspace/nav";
import { addDays, formatDate, isIsoDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { MultiCalendar, type CalendarRow } from "@/components/workspace/multi-calendar";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** "Ange Uwase" → "Ange U.": enough to recognise on a bar 44px a night wide. */
const short = (name?: string) => {
  if (!name) return "";
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length ? `${first} ${rest.at(-1)![0]}.` : first;
};

/**
 * Every home against the next two weeks or month: who is in, when, and
 * which nights are held. Bookings stack in lanes where a home with more
 * than one unit has overlapping guests.
 */
export default async function Calendar({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ from?: string; span?: string; property?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("calendar");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const t = await getTranslations("workspace.calendar");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const span = sp.span === "30" ? 30 : 14;
  const from = isIsoDate(sp.from) ? sp.from : addDays(today, -2);
  const to = addDays(from, span);
  const [homes, bookings] = await Promise.all([repos().stays.all(), repos().bookings.listAll()]);
  const shown = homes.filter((h) => !sp.property || h.id === sp.property).sort((a, b) => a.name.localeCompare(b.name));
  const dates = Array.from({ length: span }, (_, i) => addDays(from, i));
  const header = dates.map((d) => {
    const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
    return { date: d, day: d.slice(8).replace(/^0/, ""), weekday: formatDate(d, intl, { weekday: "narrow" }), weekend: dow === 0 || dow === 6 };
  });

  const rows: CalendarRow[] = await Promise.all(
    shown.map(async (h) => {
      const blocks = await repos().availability.blocked(h.id, from, to);
      const mine = bookings
        .filter((b) => b.supplyItemId === h.id && b.service === "stay" && b.status !== "cancelled" && b.startDate < to && b.endDate > from)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      // Greedy lanes: each booking takes the first lane free by its start.
      const laneEnds: string[] = [];
      const bars = mine.map((b: Booking) => {
        let lane = laneEnds.findIndex((end) => end <= b.startDate);
        if (lane < 0) lane = laneEnds.push(b.endDate) - 1;
        else laneEnds[lane] = b.endDate;
        const start = Math.max(0, nightsBetween(from, b.startDate));
        const end = Math.min(span, nightsBetween(from, b.endDate));
        const tone = b.stayMode === "lease" ? ("rent" as const) : b.endDate <= today ? ("ended" as const) : ("stay" as const);
        return { id: b.id, reference: b.reference, label: short(b.guest?.name) || b.reference, start, end, lane, tone };
      });
      return {
        id: h.id,
        name: h.name,
        slug: h.slug,
        lanes: laneEnds.length,
        bars,
        days: dates.map((d) => {
          const block = blocks.find((x) => x.date === d);
          return { date: d, state: block ? (block.reason === "maintenance" ? "repair" : "blocked") : d < today ? "past" : "free" } as CalendarRow["days"][number];
        }),
      };
    }),
  );
  const link = (f: string, s = span) => `/manage/calendar?from=${f}&span=${s}${sp.property ? `&property=${sp.property}` : ""}`;
  const todayIndex = dates.indexOf(today);

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SectionHeader title={t("title")} description={t(canAccess(access.role, "portfolio") ? "bodyAdmin" : "bodyOps")} />
      <div className="flex flex-wrap items-center gap-2">
        <Link href={link(addDays(from, -span))} aria-label={t("earlier")} className="grid size-9 place-items-center rounded-ctl border border-line bg-surface text-ink-2 hover:border-brand"><ChevronLeftIcon size={16} /></Link>
        <Link href={link(addDays(today, -2))} className="inline-flex min-h-9 items-center rounded-ctl border border-line bg-surface px-3 text-[13px] font-semibold text-ink hover:border-brand">{t("today")}</Link>
        <Link href={link(addDays(from, span))} aria-label={t("later")} className="grid size-9 place-items-center rounded-ctl border border-line bg-surface text-ink-2 hover:border-brand"><ChevronRightIcon size={16} /></Link>
        <p className="text-[14px] font-semibold text-ink">{formatDate(from, intl, { day: "numeric", month: "short" })} – {formatDate(addDays(to, -1), intl, { day: "numeric", month: "short", year: "numeric" })}</p>
        <div role="tablist" aria-label={t("span")} className="ml-auto flex gap-1 rounded-ctl border border-line bg-surface-2 p-1">
          {[14, 30].map((s) => (
            <Link key={s} role="tab" aria-selected={span === s} href={link(from, s)} className={cn("rounded-inner px-3 py-1 text-[13px] font-medium", span === s ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-2")}>
              {t("days", { count: s })}
            </Link>
          ))}
        </div>
      </div>
      <MultiCalendar rows={rows} header={header} canBlock={canAccess(access.role, "portfolio")} todayIndex={todayIndex} />
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-2">
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-6 rounded-[4px] bg-brand" />{t("legendStay")}</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-6 rounded-[4px] bg-ink-2" />{t("legendRent")}</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-6 rounded-[4px] bg-brand/35" />{t("legendEnded")}</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-6 rounded-[4px] border border-line [background-image:repeating-linear-gradient(45deg,transparent_0_5px,var(--line)_5px_7px)]" />{t("legendHeld")}</li>
        <li className="flex items-center gap-2"><span aria-hidden className="h-3 w-6 rounded-[4px] border border-warn/40 bg-warn-tint [background-image:repeating-linear-gradient(45deg,transparent_0_5px,var(--line)_5px_7px)]" />{t("legendRepair")}</li>
      </ul>
    </div>
  );
}
