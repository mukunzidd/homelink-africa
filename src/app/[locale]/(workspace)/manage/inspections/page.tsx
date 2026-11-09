import { getTranslations, setRequestLocale } from "next-intl/server";
import type { VerificationTaskStatus } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TabStrip } from "@/components/ui/tab-strip";
import { QueueRow, RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { InspectionActions } from "@/components/queue/queue-forms";
import { checklistScore } from "@/lib/workspace/inspection";

const TONE: Record<VerificationTaskStatus, StatusTone> = { requested: "warn", scheduled: "ok", inspected: "warn", published: "idle" };

/**
 * Everything waiting for someone to walk it before it goes live: new homes,
 * cars and days out, and re-inspections. Book the visit, fill the
 * checklist on the day, then admin publishes. A new candidate becomes a
 * draft in Homes for admin to finish; a re-inspection just closes.
 */
export default async function Inspections({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ show?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("inspections");
  if ("deny" in access) return access.deny;
  const show = (await searchParams).show === "all" ? "all" : "active";
  const [t, tq] = await Promise.all([getTranslations("workspace.queue"), getTranslations("queue")]);
  const intl = INTL_LOCALES[locale as Locale];
  const [tasks, team] = await Promise.all([repos().ops.verificationQueue(), repos().ops.team()]);
  const rows = show === "all" ? tasks : tasks.filter((x) => x.status !== "published");
  const day = (d: string) => formatDate(d, intl, { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("inspections.title")} description={t("inspections.description")} />
      <TabStrip
        label={t("inspections.title")}
        active={show}
        tabs={[
          { key: "active", label: t("filter.active"), href: "/manage/inspections", count: tasks.filter((x) => x.status !== "published").length },
          { key: "all", label: t("filter.all"), href: "/manage/inspections?show=all", count: tasks.length },
        ]}
      />
      <ul className="flex flex-col border-b border-line">
        {rows.map((x) => {
          const score = x.checklist ? checklistScore(x.service, x.checklist) : null;
          return (
            <QueueRow
              key={x.id}
              muted={x.status === "published"}
              summary={
                <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-6">
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={TONE[x.status]}>{tq(`verifyStatus.${x.status}`)}</StatusPill>
                      {x.kind === "reinspection" && <StatusPill tone="idle">{tq("reinspection")}</StatusPill>}
                      <span className="text-[12px] text-ink-3">{tq(`lane.${x.service}`)}</span>
                    </span>
                    <span className="text-[15px] font-semibold text-ink">{x.name}</span>
                    <span className="text-[13px] text-ink-2">{x.where}</span>
                    {x.note && <span className="max-w-[70ch] text-[13px] leading-relaxed text-ink-3">{x.note}</span>}
                  </span>
                  <span className="flex flex-none flex-wrap gap-x-5 gap-y-1 text-[13px] sm:w-48 sm:flex-col">
                    <span className="text-ink-3">{tq("asked")} {day(x.requestedAt)}</span>
                    {x.scheduledFor && <span className="text-ink-2">{tq("scheduled")} {day(x.scheduledFor)}</span>}
                    {x.inspectorName && <span className="text-ink-3">{x.inspectorName}</span>}
                    {score && <span className="tnum text-ink-2">{t("points", score)}</span>}
                  </span>
                </span>
              }
            >
              <RecordFacts>
                <RecordFact label={t("visit")}>{x.scheduledFor ? day(x.scheduledFor) : tq("record.noVisit")}</RecordFact>
                <RecordFact label={t("inspector")}>{x.inspectorName ?? tq("record.noInspector")}</RecordFact>
                {x.inspectionNotes && <RecordFact label={t("notes")}>{x.inspectionNotes}</RecordFact>}
                {x.draftId && <RecordFact label={t("draft")}>{t("draftWaiting")}</RecordFact>}
              </RecordFacts>
              <InspectionActions
                id={x.id}
                service={x.service}
                status={x.status}
                scheduledFor={x.scheduledFor}
                inspector={x.inspectorName}
                checklist={x.checklist}
                notes={x.inspectionNotes}
                team={team}
                today={kigaliDay()}
                admin={access.role === "admin"}
              />
            </QueueRow>
          );
        })}
      </ul>
    </div>
  );
}
