import { getTranslations } from "next-intl/server";
import type { Booking, Payout } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { PayPayout } from "./finance-actions";
import { FinanceTable, td } from "./shared";

/** What drivers and guides are owed: held until the guest checks in, then due, then paid. */
export async function PayoutsTab({ payouts, bookings, intl }: { payouts: Payout[]; bookings: Booking[]; intl: string }) {
  const t = await getTranslations("workspace.finance");
  const order = { due: 0, held: 1, paid: 2 } as const;
  return (
    <FinanceTable head={[t("payee"), t("booking"), t("releaseOn"), t("amount"), t("state"), ""]} empty={!payouts.length && <p className="p-6 text-[14px] text-ink-3">{t("none")}</p>}>
      {[...payouts].sort((a, b) => order[a.status] - order[b.status]).map((p) => {
        const b = bookings.find((x) => x.id === p.bookingId);
        return (
          <tr key={p.id}>
            <td className={`${td} font-semibold text-ink`}>{p.payee}</td>
            <td className={td}>{b ? <Link href={`/manage/bookings/${b.reference}`} className="text-ink-2 hover:text-brand">{b.reference}</Link> : "·"}</td>
            <td className={`${td} text-ink-2`}>{formatDate(p.releaseOn, intl, { day: "numeric", month: "short" })}</td>
            <td className={`${td} tnum text-right font-semibold text-ink`}>{formatMoney(p.amount, intl)}</td>
            <td className={td}><StatusPill tone={p.status === "due" ? "warn" : p.status === "paid" ? "ok" : "idle"}>{t(`payout.${p.status}`)}</StatusPill></td>
            <td className={`${td} text-right`}>{p.status === "due" && <PayPayout id={p.id} />}</td>
          </tr>
        );
      })}
    </FinanceTable>
  );
}
