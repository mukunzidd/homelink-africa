import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { partnerFor } from "@/lib/workspace/partner";
import { addMonths, formatDate } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { formatMoney, money } from "@/lib/domain/money";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { StatTile } from "@/components/workspace/stat-tile";
import { StatusPill } from "@/components/ui/status-pill";

/** What they have earned: held until the guest checks in, then due, then paid, with this month against last. */
export default async function Earnings({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("earnings");
  if ("deny" in access) return access.deny;
  const t = await getTranslations("workspace.partner");
  const intl = INTL_LOCALES[locale as Locale];
  const me = partnerFor(access.role);
  const p = me ? await repos().partners.byId(me) : null;
  const payouts = p ? (await repos().ops.payouts()).filter((x) => x.payee === p.shortName).sort((a, b) => b.releaseOn.localeCompare(a.releaseOn)) : [];
  const today = kigaliDay();
  const thisMonth = `${today.slice(0, 7)}-01`;
  const lastMonth = addMonths(thisMonth, -1);
  const sum = (filter: (x: (typeof payouts)[number]) => boolean) => money(payouts.filter(filter).reduce((n, x) => n + x.amount.minor, 0), "RWF");
  const inMonth = (m: string) => (x: (typeof payouts)[number]) => x.status === "paid" && x.releaseOn >= m && x.releaseOn < addMonths(m, 1);
  return (
    <div className="flex flex-col gap-5">
      <SectionHeader title={t("earnings")} description={t("earningsBody")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={t("paidThisMonth")} value={formatMoney(sum(inMonth(thisMonth)), intl)} />
        <StatTile label={t("paidLastMonth")} value={formatMoney(sum(inMonth(lastMonth)), intl)} />
        <StatTile label={t("dueNow")} value={formatMoney(sum((x) => x.status === "due"), intl)} />
        <StatTile label={t("held")} value={formatMoney(sum((x) => x.status === "held"), intl)} hint={t("heldHint")} />
      </div>
      <ul className="flex flex-col rounded-card border border-line bg-surface">
        {payouts.map((x) => (
          <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3 first:border-0">
            <span className="flex flex-col">
              <span className="text-[14px] font-medium text-ink">{formatDate(x.releaseOn, intl, { day: "numeric", month: "long", year: "numeric" })}</span>
              <StatusPill tone={x.status === "paid" ? "ok" : x.status === "due" ? "warn" : "idle"}>{t(`payout.${x.status}`)}</StatusPill>
            </span>
            <span className="tnum text-[16px] font-semibold text-ink">{formatMoney(x.amount, intl)}</span>
          </li>
        ))}
        {!payouts.length && <li className="p-6 text-[14px] text-ink-3">{t("noPayouts")}</li>}
      </ul>
    </div>
  );
}
