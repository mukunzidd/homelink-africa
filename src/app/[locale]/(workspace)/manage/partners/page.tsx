import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { addDays, formatDate, nightsBetween } from "@/lib/domain/dates";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { kigaliDay } from "@/lib/domain/instants";
import { Link } from "@/i18n/navigation";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatusPill } from "@/components/ui/status-pill";
import { AssignJob } from "@/components/workspace/homes-admin-forms";
import { cn } from "@/lib/cn";

/**
 * The drivers and guides: what they drive or lead, how they are rated, how
 * much work is coming, and any paper about to run out. Jobs nobody has yet
 * are listed first, each one assignable in place.
 */
export default async function Partners({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("partners");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.homes");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [list, jobs, cars, days] = await Promise.all([repos().partners.list(), repos().partners.jobs(), repos().mobility.list(), repos().experiences.list()]);
  const docs = Object.fromEntries(await Promise.all(list.map(async (p) => [p.id, await repos().partners.documents(p.id)] as const)));
  const supplyName = (id: string) => cars.find((c) => c.id === id)?.name ?? days.find((d) => d.id === id)?.name ?? id;
  const open = jobs.filter((j) => !j.partnerId);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title={t("partners")} description={t("partnersBody")} />
      {open.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card border border-warn/40 bg-surface p-4">
          <h2 className="text-[15px] font-semibold text-ink">{t("unassigned", { count: open.length })}</h2>
          <ul className="flex flex-col">
            {open.slice(0, 8).map((j) => (
              <li key={j.bookingId} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-2 first:border-0">
                <span className="flex min-w-0 flex-col">
                  <Link href={`/manage/bookings/${j.reference}`} className="truncate text-[14px] font-semibold text-ink hover:text-brand">{j.title}</Link>
                  <span className="text-[12.5px] text-ink-3">{formatDate(j.start, intl, { weekday: "short", day: "numeric", month: "short" })} · {j.guest} · {t("people", { count: j.party })}</span>
                </span>
                <AssignJob bookingId={j.bookingId} options={list.filter((p) => p.role === j.role && p.supplyIds.includes(j.supplyId)).concat(list.filter((p) => p.role === j.role && !p.supplyIds.includes(j.supplyId))).map((p) => ({ id: p.id, name: p.name }))} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => {
          const next = docs[p.id][0];
          const left = next ? nightsBetween(today, next.expires) : Infinity;
          const mine = jobs.filter((j) => j.partnerId === p.id);
          return (
            <li key={p.id}>
              <Link href={`/manage/partners/${p.id}`} className="flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-4 hover:border-brand">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span aria-hidden className="grid size-10 place-items-center rounded-full bg-brand-tint text-[14px] font-semibold text-brand-deep">{p.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-semibold text-ink">{p.name}</span>
                      <span className="text-[12.5px] text-ink-3">{t(`role.${p.role}`)} · ★ {p.rating.toFixed(2).replace(/0$/, "")}</span>
                    </div>
                  </div>
                  {left < 0 ? <StatusPill tone="crit">{t("docExpired")}</StatusPill> : left <= 30 ? <StatusPill tone="warn">{t("docSoon", { days: left })}</StatusPill> : null}
                </div>
                <p className="text-[13px] text-ink-2">{p.supplyIds.map(supplyName).join(" · ")}</p>
                <p className={cn("mt-auto text-[13px]", mine.length ? "text-ink" : "text-ink-3")}>
                  {t("upcomingJobs", { count: mine.filter((j) => j.start <= addDays(today, 14)).length })}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
