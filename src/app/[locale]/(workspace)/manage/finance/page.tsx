import { getTranslations, setRequestLocale } from "next-intl/server";
import type { PaymentRecord } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { reconcileRows } from "@/lib/workspace/reconcile";
import { kigaliDay } from "@/lib/domain/instants";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { SectionHeader } from "@/components/workspace/section-header";
import { TabStrip } from "@/components/ui/tab-strip";
import { RevenueTab } from "@/components/workspace/finance/revenue";
import { PaymentsTab } from "@/components/workspace/finance/payments";
import { ReconciliationTab } from "@/components/workspace/finance/reconciliation";
import { RefundsTab } from "@/components/workspace/finance/refunds";
import { DepositsTab } from "@/components/workspace/finance/deposits";
import { PayoutsTab } from "@/components/workspace/finance/payouts";
import { InvoicesTab } from "@/components/workspace/finance/invoices";

const TABS = ["revenue", "payments", "reconciliation", "refunds", "deposits", "payouts", "invoices"] as const;
type Tab = (typeof TABS)[number];
const RAILS: PaymentRecord["rail"][] = ["card", "mobileMoney", "bankTransfer"];
const STATES: PaymentRecord["status"][] = ["succeeded", "pending", "failed", "refunded"];

/** Money in, money out, and money held, a tab each, with the tab in the URL. */
export default async function Finance({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; rail?: string; status?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const access = await requireSection("finance");
  if ("deny" in access) return access.deny;
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "revenue";
  const t = await getTranslations("workspace.finance");
  const intl = INTL_LOCALES[locale as Locale];
  const f = repos().finance;
  const [bookings, refunds, payouts, statement, allPayments, fx] = await Promise.all([repos().bookings.listAll(), f.refunds(), f.payouts(), f.statement(), f.payments(), repos().fx.rates()]);
  const rail = RAILS.find((r) => r === sp.rail);
  const status = STATES.find((s) => s === sp.status);
  const rows = reconcileRows(statement.lines, allPayments);
  const counts: Partial<Record<Tab, number>> = {
    reconciliation: rows.filter((r) => r.state !== "matched").length,
    refunds: refunds.filter((r) => r.status === "pending").length,
    payouts: payouts.filter((p) => p.status === "due").length,
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <SectionHeader title={t("title")} description={t("body")} />
      <TabStrip label={t("title")} active={tab} tabs={TABS.map((k) => ({ key: k, label: t(`tabs.${k}`), href: `/manage/finance?tab=${k}`, ...(counts[k] ? { count: counts[k] } : {}) }))} />
      {tab === "revenue" && <RevenueTab bookings={bookings} fx={fx} today={kigaliDay()} intl={intl} />}
      {tab === "payments" && <PaymentsTab payments={await f.payments({ rail, status })} bookings={bookings} intl={intl} rail={rail} status={status} />}
      {tab === "reconciliation" && <ReconciliationTab rows={rows} bookings={bookings} intl={intl} />}
      {tab === "refunds" && <RefundsTab refunds={refunds} bookings={bookings} intl={intl} />}
      {tab === "deposits" && <DepositsTab bookings={bookings} payments={await repos().bookings.payments()} intl={intl} />}
      {tab === "payouts" && <PayoutsTab payouts={payouts} bookings={bookings} intl={intl} />}
      {tab === "invoices" && <InvoicesTab bookings={bookings} intl={intl} />}
    </div>
  );
}
