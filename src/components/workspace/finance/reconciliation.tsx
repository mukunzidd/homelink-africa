import { getTranslations } from "next-intl/server";
import type { Booking } from "@/lib/domain/types";
import type { ReconcileRow } from "@/lib/workspace/reconcile";
import { formatMoney } from "@/lib/domain/money";
import { formatStamp } from "@/lib/domain/instants";
import { StatusPill } from "@/components/ui/status-pill";
import { MatchLine } from "./finance-actions";
import { FinanceTable, td } from "./shared";

/** The operator's statement beside our payments. Suggestions are one click; anything unmatched needs a person. */
export async function ReconciliationTab({ rows, bookings, intl }: { rows: ReconcileRow[]; bookings: Booking[]; intl: string }) {
  const t = await getTranslations("workspace.finance");
  const ref = (bookingId?: string) => bookings.find((b) => b.id === bookingId)?.reference ?? "·";
  const count = (s: ReconcileRow["state"]) => rows.filter((r) => r.state === s).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] text-ink-2">{t("reconcileSummary", { matched: count("matched"), suggested: count("suggested"), unmatched: count("unmatched") })}</p>
      <FinanceTable head={[t("statementLine"), t("amount"), t("payment"), t("state"), ""]}>
        {rows.map((r) => (
          <tr key={r.line.id}>
            <td className={td}>
              <span className="flex flex-col"><span className="font-mono text-[13px] text-ink">{r.line.ref}</span><span className="text-[12.5px] text-ink-3">{formatStamp(r.line.at, intl)} · {r.line.phone}</span></span>
            </td>
            <td className={`${td} tnum text-right font-semibold text-ink`}>{formatMoney(r.line.amount, intl)}</td>
            <td className={`${td} text-ink-2`}>{r.payment ? `${ref(r.payment.bookingId)} · ${formatStamp(r.payment.at, intl)}` : "·"}</td>
            <td className={td}><StatusPill tone={r.state === "matched" ? "ok" : r.state === "suggested" ? "warn" : "crit"}>{t(`rec.${r.state}`)}</StatusPill></td>
            <td className={`${td} text-right`}>{r.state === "suggested" && r.payment ? <MatchLine lineId={r.line.id} paymentId={r.payment.id} /> : r.state === "unmatched" ? <span className="text-[12.5px] text-ink-3">{t("needsPerson")}</span> : null}</td>
          </tr>
        ))}
      </FinanceTable>
    </div>
  );
}
