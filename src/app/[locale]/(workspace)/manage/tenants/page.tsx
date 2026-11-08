import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { rentSchedule } from "@/lib/workspace/schedules";
import { formatDate, monthsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { exponentOf, formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatTile } from "@/components/workspace/stat-tile";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { QueueRow, RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { TenantActions } from "@/components/workspace/homes-admin-forms";

const ORDER = { overdue: 0, due: 1, upcoming: 2, paid: 3 } as const;
const TONE: Record<keyof typeof ORDER, StatusTone> = { overdue: "crit", due: "warn", upcoming: "idle", paid: "ok" };

/**
 * The rent roll: every renting under way, the tenant behind on rent first.
 * Each opens to remind them, record a transfer that came in outside the
 * app, or start the move-out (an inspection, then the deposit back).
 */
export default async function Tenants({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("tenants");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.homes");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [bookings, payments, homes] = await Promise.all([repos().bookings.listAll(), repos().bookings.payments(), repos().stays.all()]);
  const rows = bookings
    .filter((b) => b.stayMode === "lease" && b.status === "active")
    .map((b) => {
      const rent = b.lines?.find((l) => l.key === "rent")?.amount ?? b.total;
      const deposit = b.lines?.find((l) => l.key === "deposit")?.amount;
      const schedule = rentSchedule(b.startDate, monthsBetween(b.startDate, b.endDate), rent, payments.filter((p) => p.bookingId === b.id), today);
      const next = schedule.find((i) => i.status !== "paid");
      const state = (next?.status ?? "paid") as keyof typeof ORDER;
      return { b, rent, deposit, next, state, home: homes.find((h) => h.id === b.supplyItemId), paidMonths: schedule.filter((i) => i.status === "paid").length, months: schedule.length };
    })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.next?.due ?? "").localeCompare(b.next?.due ?? ""));
  const day = (d: string) => formatDate(d, intl, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("tenants")} description={t("tenantsBody")} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label={t("rentings")} value={rows.length} />
        <StatTile label={t("overdue")} value={rows.filter((r) => r.state === "overdue").length} tone={rows.some((r) => r.state === "overdue") ? "crit" : undefined} />
        <StatTile label={t("dueSoon")} value={rows.filter((r) => r.state === "due").length} />
      </div>
      {rows.length ? (
        <ul className="flex flex-col border-b border-line">
          {rows.map((r) => (
            <QueueRow
              key={r.b.id}
              summary={
                <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={TONE[r.state]}>{t(`rent.${r.state}`)}</StatusPill>
                      {r.b.moveOut && <StatusPill tone="idle">{t(r.b.moveOut.status === "scheduled" ? "movingOut" : "movedOut")}</StatusPill>}
                    </span>
                    <span className="text-[15px] font-semibold text-ink">{r.b.guest?.name ?? r.b.reference}</span>
                    <span className="text-[13px] text-ink-3">{r.home?.name}</span>
                  </span>
                  <span className="flex flex-none flex-wrap gap-x-5 gap-y-1 text-[13px] sm:w-60 sm:flex-col">
                    <span className="tnum font-semibold text-ink">{t("perMonth", { amount: formatMoney(r.rent, intl) })}</span>
                    <span className="text-ink-2">{r.next ? t("nextDue", { date: day(r.next.due) }) : t("allPaid")}</span>
                    <span className="text-ink-3">{t("ends", { date: day(r.b.endDate) })}</span>
                  </span>
                </span>
              }
            >
              <RecordFacts>
                <RecordFact label={t("booking")}><Link href={`/manage/bookings/${r.b.reference}`} className="font-semibold text-brand hover:underline">{r.b.reference}</Link></RecordFact>
                <RecordFact label={t("paidMonths")}>{t("monthsOf", { paid: r.paidMonths, total: r.months })}</RecordFact>
                <RecordFact label={t("deposit")}>{r.deposit ? formatMoney(r.deposit, intl) : "·"}</RecordFact>
                <RecordFact label={t("phone")}>{r.b.guest?.phone ?? "·"}</RecordFact>
              </RecordFacts>
              <TenantActions reference={r.b.reference} rentMajor={r.rent.minor / 10 ** exponentOf(r.rent.currency)} currency={r.rent.currency} moveOut={r.b.moveOut ? { status: r.b.moveOut.status, date: day(r.b.moveOut.date) } : undefined} today={today} />
            </QueueRow>
          ))}
        </ul>
      ) : (
        <p className="rounded-card border border-line bg-surface p-6 text-[15px] text-ink-2">{t("noTenants")}</p>
      )}
    </div>
  );
}
