import { getTranslations, setRequestLocale } from "next-intl/server";
import type { MaintenanceTicket } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatDate } from "@/lib/domain/dates";
import { formatAgo, formatStamp, kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TabStrip } from "@/components/ui/tab-strip";
import { QueueRow, RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { NewTicket, TicketActions } from "@/components/work/work-forms";

const ORDER: MaintenanceTicket["status"][] = ["open", "scheduled", "inProgress", "done"];
const PRIORITY = { urgent: 0, normal: 1, low: 2 } as const;
const PRIORITY_TONE: Record<MaintenanceTicket["priority"], StatusTone> = { urgent: "crit", normal: "warn", low: "idle" };
const STATUS_TONE: Record<MaintenanceTicket["status"], StatusTone> = { open: "warn", scheduled: "idle", inProgress: "ok", done: "idle" };

/**
 * Repairs across the homes, grouped by how far along they are, urgent first
 * inside each group. A ticket opens in place to give it to someone, book
 * the visit, take the home off sale while the work is on, and keep the
 * conversation about it. `?ticket=` opens one straight away, which is how
 * an incident's "turned into a ticket" link lands.
 */
export default async function Maintenance({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ show?: string; ticket?: string; new?: string; property?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("maintenance");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const t = await getTranslations("workspace.work");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [all, listings, team, incidents] = await Promise.all([repos().work.tickets(), repos().stays.list(), repos().ops.team(), repos().incidents.all()]);
  const scoped = sp.property ? all.filter((x) => x.listingId === sp.property) : all;
  const target = sp.ticket ? scoped.find((x) => x.id === sp.ticket) : undefined;
  const requested = sp.show === "done" || sp.show === "all" ? sp.show : "active";
  // A link to a finished ticket should still find it.
  const show = target?.status === "done" && requested === "active" ? "all" : requested;
  const shown = scoped.filter((x) => (show === "all" ? true : show === "done" ? x.status === "done" : x.status !== "done"));
  const groups = ORDER.map((status) => ({
    status,
    rows: shown.filter((x) => x.status === status).sort((a, b) => PRIORITY[a.priority] - PRIORITY[b.priority] || a.createdAt.localeCompare(b.createdAt)),
  })).filter((g) => g.rows.length);
  const tab = (s: string) => `/manage/maintenance?show=${s}${sp.property ? `&property=${sp.property}` : ""}`;
  const now = new Date();
  const homeName = (id: string) => listings.find((l) => l.id === id)?.name ?? id;

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("maintenance")} description={t("maintenanceBody")} />
      <NewTicket homes={listings.map((l) => ({ id: l.id, name: l.name }))} startOpen={sp.new === "1"} />
      <TabStrip
        label={t("maintenance")}
        active={show}
        tabs={[
          { key: "active", label: t("active"), href: tab("active"), count: scoped.filter((x) => x.status !== "done").length },
          { key: "done", label: t("ticket.done"), href: tab("done"), count: scoped.filter((x) => x.status === "done").length },
          { key: "all", label: t("all"), href: tab("all"), count: scoped.length },
        ]}
      />
      {groups.length ? (
        groups.map((g) => (
          <section key={g.status} className="flex flex-col gap-1">
            <h2 className="text-[13px] font-semibold text-ink-3">
              {t(`ticket.${g.status}`)} <span className="tnum font-normal">· {g.rows.length}</span>
            </h2>
            <ul className="flex flex-col border-b border-line">
              {g.rows.map((x) => {
                const incident = incidents.find((i) => i.ticketId === x.id);
                return (
                  <QueueRow
                    key={x.id}
                    id={x.id}
                    open={x.id === sp.ticket}
                    muted={x.status === "done"}
                    summary={
                      <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <span className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={PRIORITY_TONE[x.priority]}>{t(`priorityName.${x.priority}`)}</StatusPill>
                            <StatusPill tone={STATUS_TONE[x.status]}>{t(`ticket.${x.status}`)}</StatusPill>
                            <span className="text-[12.5px] text-ink-3">{t(`source.${x.source}`)}</span>
                            {!!x.blockedDates?.length && <span className="text-[12.5px] font-medium text-warn">{t("offSale")}</span>}
                          </span>
                          <span className="text-[15px] font-semibold text-ink">{x.title}</span>
                        </span>
                        <span className="flex flex-none flex-wrap gap-x-5 gap-y-1 text-[13px] sm:w-56 sm:flex-col">
                          <span className="text-ink-2">{homeName(x.listingId)}</span>
                          <span className="text-ink-3">{x.scheduledFor ? t("visitOn", { date: formatDate(x.scheduledFor, intl, { day: "numeric", month: "short" }) }) : formatAgo(x.createdAt, now, intl)}</span>
                          <span className="text-ink-3">{x.assignee ?? t("nobody")}</span>
                        </span>
                      </span>
                    }
                  >
                    <RecordFacts>
                      <RecordFact label={t("home")}>{homeName(x.listingId)}</RecordFact>
                      <RecordFact label={t("reported")}>{formatStamp(x.createdAt, intl)}</RecordFact>
                      <RecordFact label={t("photo")}>{x.photoName ?? "·"}</RecordFact>
                      {incident && (
                        <RecordFact label={t("fromIncident")}>
                          <Link href={`/manage/incidents?show=all`} className="font-semibold text-brand hover:underline">{incident.id}</Link>
                        </RecordFact>
                      )}
                    </RecordFacts>
                    {x.description && <p className="max-w-[70ch] text-[14.5px] leading-relaxed text-ink-2">{x.description}</p>}
                    {!!x.notes?.length && (
                      <ol className="flex flex-col gap-2">
                        {x.notes.map((n) => (
                          <li key={n.at} className="rounded-ctl border border-line bg-surface px-3 py-2 text-[14px] text-ink-2">
                            <span className="text-[12px] text-ink-3">{formatStamp(n.at, intl)} · {n.by}</span>
                            <p>{n.text}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                    <TicketActions ticket={x} team={team} today={today} />
                  </QueueRow>
                );
              })}
            </ul>
          </section>
        ))
      ) : (
        <p className="rounded-card border border-line bg-surface p-6 text-[15px] text-ink-2">{t("noTickets")}</p>
      )}
    </div>
  );
}
