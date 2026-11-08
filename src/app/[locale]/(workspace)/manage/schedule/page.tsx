import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { partnerFor } from "@/lib/workspace/partner";
import { addDays, formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { cn } from "@/lib/cn";

/** The next two weeks, a day at a time: what they have said yes to, and the free days between. */
export default async function Schedule({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("schedule");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.partner");
  const intl = INTL_LOCALES[locale as Locale];
  const me = partnerFor(access.role);
  const jobs = (me ? await repos().partners.offers(me) : []).filter((j) => j.status === "accepted");
  const today = kigaliDay();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("schedule")} description={t("scheduleBody")} />
      <ol className="flex flex-col rounded-card border border-line bg-surface">
        {days.map((d) => {
          // A self-drive hire needs the driver twice: the handover on its
          // first day and the return on its last, not every day between.
          const on = jobs
            .filter((j) => (j.kind === "hire" ? d === j.start || d === j.end : j.start <= d && d <= j.end))
            .map((j) => {
              const back = j.kind === "hire" && d === j.end && d !== j.start;
              // The return has no agreed time yet; the pickup's would be wrong.
              return { ...j, label: back ? t("carReturn") : `${j.time} · ${t(`kind.${j.kind}`)}` };
            });
          return (
            <li key={d} className={cn("flex gap-4 border-t border-line-soft px-4 py-3 first:border-0", d === today && "bg-brand-tint/40")}>
              <span className="flex w-20 flex-none flex-col">
                <span className="text-[12.5px] font-medium text-ink-3">{d === today ? t("today") : formatDate(d, intl, { weekday: "short" })}</span>
                <span className="text-[15px] font-semibold text-ink">{formatDate(d, intl, { day: "numeric", month: "short" })}</span>
              </span>
              {on.length ? (
                <ul className="flex flex-1 flex-col gap-1.5">
                  {on.map((j) => (
                    <li key={j.id} className="flex flex-col rounded-ctl border-l-4 border-brand bg-surface-2/60 px-3 py-2">
                      <span className="text-[14px] font-semibold text-ink">{j.label}</span>
                      <span className="text-[13px] text-ink-2">{j.pickup} · {t("people", { count: j.party })}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="self-center text-[13px] text-ink-3">{t("free")}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
