import { Fragment } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Booking } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { dayBoard } from "@/lib/workspace/day-board";
import { addDays, formatDate, isIsoDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatTile } from "@/components/workspace/stat-tile";
import { DeskButton } from "@/components/workspace/desk-buttons";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

/**
 * The desk's day. Four numbers that are also the page's sections, then
 * arrivals and departures side by side, each row with the one action that
 * row needs (check in, check out), then who is in house, then anything
 * still open from guests. A day picker moves the whole board.
 */
export default async function Today({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; property?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("today");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const today = kigaliDay();
  const date = isIsoDate(sp.date) ? sp.date : today;
  const [t, ts] = await Promise.all([getTranslations("workspace"), getTranslations("search")]);
  const intl = INTL_LOCALES[locale as Locale];
  const [all, listings, asks, incidents] = await Promise.all([
    repos().bookings.listAll(),
    repos().stays.list(),
    repos().ops.addOnRequests(),
    repos().incidents.all(),
  ]);
  const bookings = sp.property ? all.filter((b) => b.supplyItemId === sp.property) : all;
  const board = dayBoard(bookings, date);
  const home = (b: Booking) => listings.find((l) => l.id === b.supplyItemId);
  const turnoverIds = new Set(board.turnovers.flatMap((x) => [x.out.id, x.in.id]));
  const openAsks = asks.filter((a) => a.status === "open");
  const openIncidents = incidents.filter((i) => i.status !== "resolved");
  const longDate = formatDate(date, intl, { weekday: "long", day: "numeric", month: "long" });
  const dayLink = (d: string) => `/manage/today?date=${d}${sp.property ? `&property=${sp.property}` : ""}`;

  const row = (b: Booking, kind: "in" | "out" | "stay") => {
    const l = home(b);
    return (
      <li className={cn("flex flex-col gap-2 rounded-ctl border bg-surface p-3", turnoverIds.has(b.id) ? "border-warn/50" : "border-line")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <Link href={`/manage/bookings/${b.reference}`} className="truncate text-[15px] font-semibold text-ink hover:text-brand">
              {b.guest?.name ?? b.reference}
            </Link>
            <span className="truncate text-[13px] text-ink-2">
              {l?.name ?? b.title} · {ts("guestCount", { count: b.party })} · {t("today.nights", { count: nightsBetween(b.startDate, b.endDate) })}
            </span>
            {kind === "in" && <span className="text-[12.5px] text-ink-3">{b.guest?.arrivalTime ? t("today.eta", { time: b.guest.arrivalTime }) : t("today.etaUnknown")}</span>}
          </div>
          {kind === "in" &&
            (b.status === "confirmed" && date <= today ? (
              <DeskButton reference={b.reference} kind="in" label={t("today.checkIn")} done={t("today.checkedIn")} />
            ) : b.status === "active" ? (
              <StatusPill tone="ok">{t("today.checkedIn")}</StatusPill>
            ) : null)}
          {kind === "out" &&
            (b.status === "active" && date <= today ? (
              <DeskButton reference={b.reference} kind="out" label={t("today.checkOut")} done={t("today.checkedOut")} />
            ) : b.status === "completed" ? (
              <StatusPill tone="idle">{t("today.checkedOut")}</StatusPill>
            ) : null)}
        </div>
        {kind === "in" && b.escrowHeld && <span className="text-[12px] text-warn">{t("today.escrow")}</span>}
        {turnoverIds.has(b.id) && kind !== "stay" && <span className="text-[12px] font-medium text-warn">{t("today.turnoverHint")}</span>}
      </li>
    );
  };

  const column = (title: string, list: Booking[], kind: "in" | "out" | "stay") => (
    <section id={kind} className="flex min-w-0 scroll-mt-20 flex-col gap-3">
      <h2 className="flex items-baseline gap-2 text-[15px] font-semibold text-ink">
        {title}
        <span className="tnum text-[13px] font-normal text-ink-3">{list.length}</span>
      </h2>
      {list.length ? <ul className="flex flex-col gap-2">{list.map((b) => <Fragment key={b.id}>{row(b, kind)}</Fragment>)}</ul> : <p className="rounded-ctl border border-dashed border-line px-4 py-6 text-center text-[14px] text-ink-3">{t("today.none")}</p>}
    </section>
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title={date === today ? `${t("sections.today")} · ${longDate}` : longDate}
        description={t("today.description")}
        actions={
          <nav className="flex rounded-ctl border border-line bg-surface p-0.5">
            {([
              [addDays(today, -1), t("today.yesterday")],
              [today, t("today.today")],
              [addDays(today, 1), t("today.tomorrow")],
            ] as const).map(([d, label]) => (
              <Link key={d} href={dayLink(d)} aria-current={d === date ? "date" : undefined} className={cn("rounded-inner px-3 py-1.5 text-[13px] font-medium", d === date ? "bg-brand-tint text-brand-deep" : "text-ink-2 hover:text-ink")}>
                {label}
              </Link>
            ))}
          </nav>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("today.arrivals")} value={board.arrivals.length} href={`${dayLink(date)}#in`} />
        <StatTile label={t("today.departures")} value={board.departures.length} href={`${dayLink(date)}#out`} />
        <StatTile label={t("today.inHouse")} value={board.inHouse.length} href={`${dayLink(date)}#stay`} />
        <StatTile label={t("today.turnovers")} value={board.turnovers.length} tone={board.turnovers.length ? "warn" : undefined} hint={board.turnovers.length ? t("today.turnoverHint") : undefined} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {column(t("today.arrivals"), board.arrivals, "in")}
        {column(t("today.departures"), board.departures, "out")}
      </div>
      {column(t("today.inHouse"), board.inHouse, "stay")}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="flex items-baseline justify-between text-[15px] font-semibold text-ink">
            {t("today.openAsks")} <Link href="/manage/asks" className="text-[13px] font-semibold text-brand">{t("today.seeAll")}</Link>
          </h2>
          <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
            {openAsks.slice(0, 4).map((a) => (
              <li key={a.id} className="px-4 py-2.5 text-[14px] text-ink">“{a.asked}”</li>
            ))}
            {!openAsks.length && <li className="px-4 py-3 text-[14px] text-ink-3">{t("today.none")}</li>}
          </ul>
        </section>
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="flex items-baseline justify-between text-[15px] font-semibold text-ink">
            {t("today.openIncidents")} <Link href="/manage/incidents" className="text-[13px] font-semibold text-brand">{t("today.seeAll")}</Link>
          </h2>
          <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
            {openIncidents.slice(0, 4).map((i) => (
              <li key={i.id} className="px-4 py-2.5 text-[14px] text-ink">{i.description}</li>
            ))}
            {!openIncidents.length && <li className="px-4 py-3 text-[14px] text-ink-3">{t("today.none")}</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
