import { getTranslations } from "next-intl/server";
import type { Booking, ServiceKind } from "@/lib/domain/types";
import type { FxTable } from "@/lib/domain/money";
import { revenue } from "@/lib/workspace/metrics";
import { addMonths, formatDate } from "@/lib/domain/dates";
import { formatMoney, numberLocale } from "@/lib/domain/money";
import { WeeklyBars } from "@/components/workspace/charts";
import { FinanceTable, td } from "./shared";

const LANES: ServiceKind[] = ["stay", "car", "experience"];

/** Six months of revenue in francs: one bar per month for the shape, the table by lane for the numbers. */
export async function RevenueTab({ bookings, fx, today, intl }: { bookings: Booking[]; fx: FxTable; today: string; intl: string }) {
  const t = await getTranslations("workspace.finance");
  const first = `${today.slice(0, 7)}-01`;
  const months = Array.from({ length: 6 }, (_, i) => addMonths(first, i - 5));
  const cell = (m: string, lane?: ServiceKind) => revenue(lane ? bookings.filter((b) => b.service === lane) : bookings, m, addMonths(m, 1), "RWF", fx);
  const totals = months.map((m) => cell(m).minor);
  const label = (m: string) => formatDate(m, intl, { month: "short", year: "2-digit" });
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink">{t("revenueTitle")}</h2>
        <WeeklyBars values={totals.map((v) => Math.round(v / 1000))} labels={months.map(label)} title={t("revenueTitle")} unit={(n) => `RWF ${new Intl.NumberFormat(numberLocale(intl)).format(n)}k`} />
      </section>
      <FinanceTable head={[t("lane"), ...months.map(label)]}>
        {LANES.map((lane) => (
          <tr key={lane}>
            <td className={td}>{t(`lanes.${lane}`)}</td>
            {months.map((m) => <td key={m} className={`${td} tnum text-right`}>{formatMoney(cell(m, lane), intl)}</td>)}
          </tr>
        ))}
        <tr className="font-semibold">
          <td className={td}>{t("total")}</td>
          {months.map((m, i) => <td key={m} className={`${td} tnum text-right`}>{formatMoney({ minor: totals[i], currency: "RWF" }, intl)}</td>)}
        </tr>
      </FinanceTable>
      <p className="text-[12.5px] text-ink-3">{t("revenueNote")}</p>
    </div>
  );
}
