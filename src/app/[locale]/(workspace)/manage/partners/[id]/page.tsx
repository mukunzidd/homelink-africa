import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { formatDate, nightsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { formatMoney } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordFact, RecordFacts } from "@/components/queue/queue-row";
import { AssignJob } from "@/components/workspace/homes-admin-forms";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** One driver or guide: their papers, their work, what is open in their lane, and what they have been paid. */
export default async function PartnerPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const access = await requireSection("partners");
  if ("deny" in access) return access.deny;
  const p = await repos().partners.byId(id);
  if (!p) notFound();
  const t = await getTranslations("workspace.homes");
  const intl = INTL_LOCALES[locale as Locale];
  const today = kigaliDay();
  const [docs, mine, open, payouts, all] = await Promise.all([
    repos().partners.documents(p.id),
    repos().partners.jobs({ partnerId: p.id }),
    repos().partners.jobs({ unassigned: true, role: p.role }),
    repos().ops.payouts(),
    repos().partners.list(),
  ]);
  const paid = payouts.filter((x) => x.payee === p.shortName);
  const day = (d: string) => formatDate(d, intl, { day: "numeric", month: "short", year: "numeric" });
  const peers = all.filter((x) => x.role === p.role).map((x) => ({ id: x.id, name: x.name }));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/manage/partners" className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-ink-2 hover:text-ink"><ChevronLeftIcon size={14} />{t("partners")}</Link>
      <header className="flex flex-col gap-1">
        <p className="text-[13px] text-ink-3">{t(`role.${p.role}`)} · ★ {p.rating} · {t("since", { date: day(p.joinedAt) })}</p>
        <h1 className="font-display text-[28px] font-semibold text-ink">{p.name}</h1>
        <p className="text-[14px] text-ink-2">{p.phone}</p>
      </header>

      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">{t("documents")}</h2>
        <ul className="flex flex-col">
          {docs.map((d) => {
            const left = nightsBetween(today, d.expires);
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line-soft py-2 text-[14px] first:border-0">
                <span className="text-ink">{t(`doc.${d.kind}`)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-ink-3">{t("expires", { date: day(d.expires) })}</span>
                  {left < 0 ? <StatusPill tone="crit">{t("docExpired")}</StatusPill> : left <= 30 ? <StatusPill tone="warn">{t("docSoon", { days: left })}</StatusPill> : <StatusPill tone="ok">{t("docValid")}</StatusPill>}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink">{t("theirJobs", { count: mine.length })}</h2>
          {mine.length ? (
            <ul className="flex flex-col">
              {mine.map((j) => (
                <li key={j.bookingId} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-2 first:border-0">
                  <span className="flex min-w-0 flex-col">
                    <Link href={`/manage/bookings/${j.reference}`} className="truncate text-[14px] font-semibold text-ink hover:text-brand">{j.title}</Link>
                    <span className="text-[12.5px] text-ink-3">{day(j.start)} · {j.guest}</span>
                  </span>
                  <AssignJob bookingId={j.bookingId} current={p.id} options={peers} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-3">{t("noJobs")}</p>
          )}
        </section>
        <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
          <h2 className="text-[15px] font-semibold text-ink">{t("openInLane", { count: open.length })}</h2>
          {open.length ? (
            <ul className="flex flex-col">
              {open.map((j) => (
                <li key={j.bookingId} className={cn("flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-2 first:border-0", !p.supplyIds.includes(j.supplyId) && "opacity-70")}>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-semibold text-ink">{j.title}</span>
                    <span className="text-[12.5px] text-ink-3">{day(j.start)} · {j.guest}</span>
                  </span>
                  <AssignJob bookingId={j.bookingId} options={peers} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-3">{t("noOpen")}</p>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">{t("payouts")}</h2>
        {paid.length ? (
          <RecordFacts>
            {paid.map((x) => (
              <RecordFact key={x.id} label={day(x.releaseOn)}>{formatMoney(x.amount, intl)} · {t(`payout.${x.status}`)}</RecordFact>
            ))}
          </RecordFacts>
        ) : (
          <p className="text-[14px] text-ink-3">{t("noPayouts")}</p>
        )}
      </section>
    </div>
  );
}
