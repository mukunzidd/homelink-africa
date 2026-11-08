import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Incident } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatAgo } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TabStrip } from "@/components/ui/tab-strip";
import { QueueRow, RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { IncidentActions } from "@/components/queue/queue-forms";

const URGENCY = { now: 0, today: 1, whenever: 2 } as const;
const URGENCY_TONE: Record<Incident["urgency"], StatusTone> = { now: "crit", today: "warn", whenever: "idle" };
const STATUS_TONE: Record<Incident["status"], StatusTone> = { open: "warn", inProgress: "ok", resolved: "idle" };

/**
 * Problems guests reported during a stay. Urgency first, then oldest, so
 * "no power" at 22:00 is never under "wi-fi is slow" from the morning.
 * Each opens in place to give it to someone, move it on, or turn it into
 * a maintenance ticket when the home needs a repair.
 */
export default async function Incidents({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ show?: string; booking?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("incidents");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const show = sp.show === "resolved" || sp.show === "all" ? sp.show : "open";
  const [t, tCat] = await Promise.all([getTranslations("workspace.queue"), getTranslations("booking.manage.categories")]);
  const intl = INTL_LOCALES[locale as Locale];
  const [all, bookings, team] = await Promise.all([repos().incidents.all(), repos().bookings.listAll(), repos().ops.team()]);
  const now = new Date();
  const scoped = sp.booking ? all.filter((i) => bookings.find((b) => b.id === i.bookingId)?.reference === sp.booking) : all;
  const rows = scoped
    .filter((i) => (show === "all" ? true : show === "resolved" ? i.status === "resolved" : i.status !== "resolved"))
    .sort((a, b) => URGENCY[a.urgency] - URGENCY[b.urgency] || a.createdAt.localeCompare(b.createdAt));
  const tab = (s: string) => `/manage/incidents?show=${s}${sp.booking ? `&booking=${sp.booking}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("incidents.title")} description={sp.booking ? t("incidents.forBooking", { reference: sp.booking }) : t("incidents.description")} />
      <TabStrip
        label={t("incidents.title")}
        active={show}
        tabs={[
          { key: "open", label: t("filter.open"), href: tab("open"), count: scoped.filter((i) => i.status !== "resolved").length },
          { key: "resolved", label: t("incidentStatus.resolved"), href: tab("resolved"), count: scoped.filter((i) => i.status === "resolved").length },
          { key: "all", label: t("filter.all"), href: tab("all"), count: scoped.length },
        ]}
      />
      {rows.length ? (
        <ul className="flex flex-col border-b border-line">
          {rows.map((i) => {
            const b = bookings.find((x) => x.id === i.bookingId);
            return (
              <QueueRow
                key={i.id}
                muted={i.status === "resolved"}
                summary={
                  <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={URGENCY_TONE[i.urgency]}>{t(`urgency.${i.urgency}`)}</StatusPill>
                        <StatusPill tone={STATUS_TONE[i.status]}>{t(`incidentStatus.${i.status}`)}</StatusPill>
                        <span className="text-[12.5px] text-ink-3">{tCat(i.category)}</span>
                      </span>
                      <span className="max-w-[70ch] text-[15px] leading-relaxed text-ink">{i.description}</span>
                    </span>
                    <span className="flex flex-none flex-wrap gap-x-5 gap-y-1 text-[13px] sm:w-52 sm:flex-col">
                      <span className="text-ink-2">{b?.title ?? ""}</span>
                      <span className="text-ink-3">{formatAgo(i.createdAt, now, intl)}</span>
                      <span className="text-ink-3">{i.assignee ?? t("nobody")}</span>
                    </span>
                  </span>
                }
              >
                <RecordFacts>
                  <RecordFact label={t("guest")}>{b?.guest?.name ?? "·"}</RecordFact>
                  <RecordFact label={t("booking")}>
                    {b ? <Link href={`/manage/bookings/${b.reference}`} className="font-semibold text-brand hover:underline">{b.reference}</Link> : "·"}
                    {b && <span className="block text-ink-2">{b.title}</span>}
                  </RecordFact>
                  {i.ticketId && (
                    <RecordFact label={t("ticket")}>
                      <Link href={`/manage/maintenance?ticket=${i.ticketId}`} className="font-semibold text-brand hover:underline">{i.ticketId}</Link>
                    </RecordFact>
                  )}
                </RecordFacts>
                <IncidentActions id={i.id} status={i.status} assignee={i.assignee} team={team} stay={b?.service === "stay"} ticketId={i.ticketId} />
              </QueueRow>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-card border border-dashed border-line px-5 py-8 text-center text-[15px] text-ink-3">{t("empty")}</p>
      )}
    </div>
  );
}
