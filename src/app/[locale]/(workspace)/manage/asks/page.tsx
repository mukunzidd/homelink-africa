import { getTranslations, setRequestLocale } from "next-intl/server";
import type { AddOnRequestStatus } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatDate, formatDateRange } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TabStrip } from "@/components/ui/tab-strip";
import { QueueRow, RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { AskActions } from "@/components/queue/queue-forms";

const TONE: Record<AddOnRequestStatus, StatusTone> = { open: "warn", quoted: "ok", arranged: "ok", declined: "idle" };
const FILTERS = ["active", "open", "quoted", "arranged", "declined", "all"] as const;
type Filter = (typeof FILTERS)[number];

/**
 * What guests asked a person for, in their own words, from the booking
 * page's "ask for something" and the trip screens. Open ones first. Each
 * row opens in place to give it to someone, quote a price (which lands in
 * the guest's thread), or close it.
 */
export default async function Asks({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ show?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("asks");
  if ("deny" in access) return access.deny;
  const show: Filter = FILTERS.includes((await searchParams).show as Filter) ? ((await searchParams).show as Filter) : "active";
  const [t, tq] = await Promise.all([getTranslations("workspace.queue"), getTranslations("queue")]);
  const intl = INTL_LOCALES[locale as Locale];
  const num = NUMBER_LOCALES[locale as Locale];
  const [asks, bookings, team] = await Promise.all([repos().ops.addOnRequests(), repos().bookings.listAll(), repos().ops.team()]);
  const count = (f: Filter) => asks.filter((a) => (f === "all" ? true : f === "active" ? a.status === "open" || a.status === "quoted" : a.status === f)).length;
  const rows = asks.filter((a) => (show === "all" ? true : show === "active" ? a.status === "open" || a.status === "quoted" : a.status === show));

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("asks.title")} description={t("asks.description")} />
      <TabStrip
        label={t("asks.title")}
        active={show}
        wrap
        tabs={FILTERS.map((f) => ({ key: f, label: f === "active" || f === "all" ? t(`filter.${f}`) : tq(`askStatus.${f}`), href: `/manage/asks?show=${f}`, count: count(f) }))}
      />
      {rows.length ? (
        <ul className="flex flex-col border-b border-line">
          {rows.map((a) => {
            const b = bookings.find((x) => x.id === a.bookingId);
            return (
              <QueueRow
                key={a.id}
                muted={a.status === "arranged" || a.status === "declined"}
                summary={
                  <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
                    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={TONE[a.status]}>{tq(`askStatus.${a.status}`)}</StatusPill>
                        {b && <span className="font-mono text-[12px] text-ink-3">{b.reference}</span>}
                        {a.quote && <span className="tnum text-[13px] text-ink-2">{formatMoney(a.quote, num)}</span>}
                      </span>
                      <span className="max-w-[70ch] text-[15px] leading-relaxed text-ink">“{a.asked}”</span>
                    </span>
                    <span className="flex flex-none flex-wrap gap-x-5 gap-y-1 text-[13px] sm:w-48 sm:flex-col">
                      <span className="text-ink-2">{b?.guest?.name ?? ""}</span>
                      <span className="text-ink-3">{tq("asked")} {formatDate(a.requestedAt, intl, { day: "numeric", month: "short" })}</span>
                      <span className="text-ink-3">{a.owner ?? t("nobody")}</span>
                    </span>
                  </span>
                }
              >
                <RecordFacts>
                  <RecordFact label={t("guest")}>{b?.guest?.name ?? "·"}</RecordFact>
                  <RecordFact label={t("booking")}>
                    {b ? (
                      <Link href={`/manage/bookings/${b.reference}`} className="font-semibold text-brand hover:underline">
                        {b.reference}
                      </Link>
                    ) : "·"}
                    {b && <span className="block text-ink-2">{b.title}</span>}
                  </RecordFact>
                  {b && <RecordFact label={t("dates")}>{formatDateRange(b.startDate, b.endDate, intl)}</RecordFact>}
                  {a.quote && <RecordFact label={t("quoted")}>{formatMoney(a.quote, num)}{a.quoteNote ? ` · ${a.quoteNote}` : ""}</RecordFact>}
                </RecordFacts>
                <AskActions id={a.id} owner={a.owner} status={a.status} team={team} />
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
