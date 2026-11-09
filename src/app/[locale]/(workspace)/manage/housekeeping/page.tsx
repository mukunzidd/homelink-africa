import { getTranslations, setRequestLocale } from "next-intl/server";
import type { HousekeepingTask } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { addDays, formatDate, isIsoDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatTile } from "@/components/workspace/stat-tile";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { HousekeepingActions } from "@/components/work/work-forms";
import { cn } from "@/lib/cn";

const TONE: Record<HousekeepingTask["status"], StatusTone> = { todo: "idle", inProgress: "warn", ready: "ok", issue: "crit" };

/**
 * The cleaners' day, by home. A turnover with a guest arriving the same
 * afternoon is the tight one and comes first; a mid-stay visit fits round
 * the guest. "Ready" is the word the desk waits for before handing over
 * keys, so it is the loudest state on the page.
 */
export default async function Housekeeping({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ date?: string; property?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("housekeeping");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const today = kigaliDay();
  const date = isIsoDate(sp.date) ? sp.date : today;
  const t = await getTranslations("workspace.work");
  const intl = INTL_LOCALES[locale as Locale];
  const [listings, bookings, team] = await Promise.all([repos().stays.list(), repos().bookings.listAll(), repos().ops.team()]);
  const scope = (tasks: HousekeepingTask[]) => (sp.property ? tasks.filter((x) => x.listingId === sp.property) : tasks);
  const tasks = scope(await repos().work.housekeeping(date)).sort(
    (a, b) => Number(!!b.nextBookingId) - Number(!!a.nextBookingId) || a.window.from.localeCompare(b.window.from),
  );
  const week = await Promise.all(Array.from({ length: 7 }, (_, i) => addDays(today, i)).map(async (d) => ({ d, n: scope(await repos().work.housekeeping(d)).length })));
  const link = (d: string) => `/manage/housekeeping?date=${d}${sp.property ? `&property=${sp.property}` : ""}`;
  const count = (s: HousekeepingTask["status"]) => tasks.filter((x) => x.status === s).length;
  const booking = (id?: string) => bookings.find((b) => b.id === id);

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("housekeeping")} description={t("housekeepingBody")} />

      <nav aria-label={t("days")} className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {week.map(({ d, n }) => (
          <Link
            key={d}
            href={link(d)}
            aria-current={d === date ? "date" : undefined}
            className={cn(
              "flex min-w-[76px] flex-col items-center rounded-ctl border px-3 py-2 text-center",
              d === date ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-surface text-ink-2 hover:border-brand",
            )}
          >
            <span className="text-[12px] font-medium">{d === today ? t("today") : formatDate(d, intl, { weekday: "short" })}</span>
            <span className="text-[13px] font-semibold text-ink">{formatDate(d, intl, { day: "numeric", month: "short" })}</span>
            <span className="tnum text-[11.5px] text-ink-3">{t("cleans", { count: n })}</span>
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("hk.todo")} value={count("todo")} />
        <StatTile label={t("hk.inProgress")} value={count("inProgress")} tone={count("inProgress") ? "warn" : undefined} />
        <StatTile label={t("hk.ready")} value={`${count("ready")} / ${tasks.length}`} />
        <StatTile label={t("hk.issue")} value={count("issue")} tone={count("issue") ? "crit" : undefined} />
      </div>

      {tasks.length ? (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => {
            const home = listings.find((l) => l.id === task.listingId);
            const out = booking(task.bookingId);
            const next = booking(task.nextBookingId);
            return (
              <li key={task.id} className={cn("flex flex-col gap-4 rounded-card border bg-surface p-4 sm:p-5", task.status === "issue" ? "border-crit/50" : next ? "border-warn/50" : "border-line")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={TONE[task.status]}>{t(`hk.${task.status}`)}</StatusPill>
                      <span className="text-[12.5px] font-medium text-ink-3">{t(`kind.${task.kind}`)}</span>
                    </div>
                    <p className="text-[16px] font-semibold text-ink">{home?.name ?? task.listingId}</p>
                    <p className="text-[13px] text-ink-3">{home?.neighbourhood}</p>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:items-end sm:text-right">
                    <p className="tnum text-[15px] font-semibold text-ink">{task.window.from}–{task.window.until}</p>
                    <p className="text-[12.5px] text-ink-3">{next ? t("tight") : t("window")}</p>
                  </div>
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
                  {out && (
                    <div className="flex gap-2">
                      <dt className="text-ink-3">{task.kind === "turnover" ? t("leaving") : t("staying")}</dt>
                      <dd><Link href={`/manage/bookings/${out.reference}`} className="font-medium text-ink hover:text-brand">{out.guest?.name ?? out.reference}</Link></dd>
                    </div>
                  )}
                  {next && (
                    <div className="flex gap-2">
                      <dt className="text-ink-3">{t("arriving")}</dt>
                      <dd>
                        <Link href={`/manage/bookings/${next.reference}`} className="font-medium text-ink hover:text-brand">{next.guest?.name ?? next.reference}</Link>
                        {next.guest?.arrivalTime && <span className="text-ink-3"> · {t("around", { time: next.guest.arrivalTime })}</span>}
                      </dd>
                    </div>
                  )}
                </dl>
                <HousekeepingActions task={task} team={team} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-card border border-line bg-surface p-6 text-[15px] text-ink-2">{t("noCleans")}</p>
      )}
    </div>
  );
}
