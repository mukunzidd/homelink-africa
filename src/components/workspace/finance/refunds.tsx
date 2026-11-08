import { getTranslations } from "next-intl/server";
import type { Booking, PaymentRecord } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/money";
import { formatStamp } from "@/lib/domain/instants";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { ApproveRefund } from "./finance-actions";
import { FinanceTable, td } from "./shared";

export async function RefundsTab({ refunds, bookings, intl }: { refunds: PaymentRecord[]; bookings: Booking[]; intl: string }) {
  const t = await getTranslations("workspace.finance");
  const sorted = [...refunds].sort((a, b) => Number(b.status === "pending") - Number(a.status === "pending"));
  return (
    <FinanceTable head={[t("when"), t("booking"), t("guest"), t("amount"), t("state"), ""]} empty={!refunds.length && <p className="p-6 text-[14px] text-ink-3">{t("none")}</p>}>
      {sorted.map((r) => {
        const b = bookings.find((x) => x.id === r.bookingId);
        return (
          <tr key={r.id}>
            <td className={`${td} text-ink-2`}>{formatStamp(r.at, intl)}</td>
            <td className={td}>{b ? <Link href={`/manage/bookings/${b.reference}`} className="font-semibold text-ink hover:text-brand">{b.reference}</Link> : "·"}</td>
            <td className={`${td} text-ink-2`}>{b?.guest?.name ?? "·"}</td>
            <td className={`${td} tnum text-right font-semibold text-ink`}>{formatMoney(r.amount, intl)}</td>
            <td className={td}><StatusPill tone={r.status === "pending" ? "warn" : r.status === "succeeded" ? "ok" : "idle"}>{t(`refund.${r.status === "pending" ? "awaiting" : r.status === "succeeded" ? "paid" : "other"}`)}</StatusPill></td>
            <td className={`${td} text-right`}>{r.status === "pending" && <ApproveRefund id={r.id} />}</td>
          </tr>
        );
      })}
    </FinanceTable>
  );
}
