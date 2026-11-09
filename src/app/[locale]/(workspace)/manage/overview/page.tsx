import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { dayBoard } from "@/lib/workspace/day-board";
import { occupancy, revenue, weeklySeries } from "@/lib/workspace/metrics";
import { rentSchedule } from "@/lib/workspace/schedules";
import { addDays, formatDate, monthsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatTile } from "@/components/workspace/stat-tile";
import { MoneyText } from "@/components/ui/money-text";
import { ShareBars, WeeklyBars } from "@/components/workspace/charts";
import { ArrowRightIcon } from "@/components/ui/icons";

/**
 * Admin's first screen: how the business is doing and what is waiting on
 * them. Five numbers, how bookings have moved over twelve weeks, how full
 * each home is for the next month, today in one line, and a to-do list
 * built from what is actually open, each item a link to the page that
 * clears it.
 */
export default async function Overview({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ property?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("overview");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const t = await getTranslations("workspace.overview");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const r = repos();
  const [all, stays, leases, incidents, inspections, asks, tickets, fx, payments, hk] = await Promise.all([
    r.bookings.listAll(), r.stays.list(), r.stays.list({ band: "long" }), r.incidents.all(), r.ops.verificationQueue(), r.ops.addOnRequests(),
    r.work.tickets(), r.fx.rates(), r.bookings.payments(), r.work.housekeeping(today),
  ]);
  const homes = [...new Map([...stays, ...leases].map((l) => [l.id, l])).values()].filter((l) => !sp.property || l.id === sp.property);
  const bookings = sp.property ? all.filter((b) => b.supplyItemId === sp.property) : all;
  const stayBookings = bookings.filter((b) => b.service === "stay");

  const weeks = weeklySeries(bookings, 12, today);
  const weekLabels = weeks.map((_, i) => formatDate(addDays(today, -7 * (11 - i) - 6), intl, { day: "numeric", month: "short" }));
  const next30 = addDays(today, 30);
  const occ = homes
    .map((l) => ({ l, share: occupancy(stayBookings, l.id, today, next30) }))
    .sort((a, b) => b.share - a.share);
  const avgOcc = occ.length ? occ.reduce((n, x) => n + x.share, 0) / occ.length : 0;
  const monthStart = `${today.slice(0, 8)}01`;
  const month = revenue(bookings, monthStart, addDays(today, 1), "RWF", fx);
  const overdue = bookings
    .filter((b) => b.stayMode === "lease" && b.status === "active")
    .filter((b) => {
      const rent = b.lines?.find((l) => l.key === "rent")?.amount;
      return rent && rentSchedule(b.startDate, monthsBetween(b.startDate, b.endDate), rent, payments.filter((p) => p.bookingId === b.id), today).some((i) => i.status === "overdue");
    });
  const board = dayBoard(bookings, today);
  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const todo = [
    { n: inspections.filter((v) => v.status === "inspected").length, key: "publish", href: "/manage/inspections" },
    { n: openIncidents.filter((i) => !i.assignee).length, key: "incidents", href: "/manage/incidents" },
    { n: asks.filter((a) => a.status === "open" && !a.owner).length, key: "asks", href: "/manage/asks" },
    { n: tickets.filter((x) => x.priority === "urgent" && x.status !== "done").length, key: "urgent", href: "/manage/maintenance" },
    { n: hk.filter((h) => h.status === "issue" || (h.nextBookingId && h.status !== "ready")).length, key: "cleans", href: "/manage/housekeeping" },
    { n: overdue.length, key: "rent", href: "/manage/bookings?lane=lease" },
  ].filter((x) => x.n > 0);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("title")} description={t("subtitle", { date: formatDate(today, intl, { weekday: "long", day: "numeric", month: "long" }) })} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label={t("thisWeek")} value={weeks.at(-1)} hint={t("lastWeek", { count: weeks.at(-2) ?? 0 })} href="/manage/bookings" />
        <StatTile label={t("occupancy")} value={pct(avgOcc)} hint={t("next30")} href="/manage/calendar" />
        {/* A month of francs is too long for half a phone; this one takes the row. */}
        <StatTile label={t("revenue")} value={<MoneyText amount={month} rounded />} hint={t("revenueHint")} href="/manage/finance" className="col-span-2 md:col-span-1" />
        <StatTile label={t("openIncidents")} value={openIncidents.length} tone={openIncidents.some((i) => i.urgency === "now") ? "crit" : openIncidents.length ? "warn" : undefined} href="/manage/incidents" />
        <StatTile label={t("overdueRent")} value={overdue.length} tone={overdue.length ? "warn" : undefined} href="/manage/bookings?lane=lease" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-ink">{t("weeklyTitle")}</h2>
            <WeeklyBars values={weeks} labels={weekLabels} title={t("weeklyTitle")} unit={(n) => t("bookingsCount", { count: n })} />
          </section>
          <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">{t("occupancyTitle")}</h2>
              <Link href="/manage/calendar" className="text-[13px] font-semibold text-brand hover:underline">{t("toCalendar")}</Link>
            </div>
            <ShareBars title={t("occupancyTitle")} rows={occ.map(({ l, share }) => ({ id: l.id, label: l.name, share, text: pct(share) }))} />
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-ink">{t("today")}</h2>
              <Link href="/manage/today" className="text-[13px] font-semibold text-brand hover:underline">{t("toToday")}</Link>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              {([["arrivals", board.arrivals.length], ["departures", board.departures.length], ["inHouse", board.inHouse.length], ["turnovers", board.turnovers.length]] as const).map(([k, n]) => (
                <div key={k} className="flex flex-col rounded-ctl bg-surface-2 px-3 py-2">
                  <dt className="text-ink-3">{t(k)}</dt>
                  <dd className="tnum font-display text-[22px] font-semibold text-ink">{n}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
            <h2 className="text-[15px] font-semibold text-ink">{t("todo")}</h2>
            {todo.length ? (
              <ul className="flex flex-col">
                {todo.map((x) => (
                  <li key={x.key} className="border-t border-line-soft first:border-0">
                    <Link href={x.href} className="flex items-center gap-3 py-2.5 text-[14px] text-ink-2 hover:text-ink">
                      <span className="tnum grid h-6 min-w-6 place-items-center rounded-full bg-warn-tint px-1.5 text-[12px] font-semibold text-warn">{x.n}</span>
                      <span className="flex-1">{t(`todos.${x.key}`, { count: x.n })}</span>
                      <ArrowRightIcon size={14} className="text-ink-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">{t("allClear")}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
