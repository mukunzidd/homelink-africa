import { getTranslations } from "next-intl/server";
import type { Booking, PaymentRecord } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/money";
import { formatStamp } from "@/lib/domain/instants";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";
import { FinanceTable, td } from "./shared";

const RAILS: PaymentRecord["rail"][] = ["card", "mobileMoney", "bankTransfer"];
const STATES: PaymentRecord["status"][] = ["succeeded", "pending", "failed", "refunded"];

export async function PaymentsTab({ payments, bookings, intl, rail, status }: { payments: PaymentRecord[]; bookings: Booking[]; intl: string; rail?: string; status?: string }) {
  const t = await getTranslations("workspace.finance");
  const tb = await getTranslations("booking.record");
  const href = (r?: string, s?: string) => `/manage/finance?tab=payments${r ? `&rail=${r}` : ""}${s ? `&status=${s}` : ""}`;
  const chip = (on: boolean) => cn("rounded-full border px-3 py-1 text-[13px]", on ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-surface text-ink-2 hover:border-brand");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Link href={href(undefined, status)} className={chip(!rail)}>{t("allRails")}</Link>
        {RAILS.map((r) => <Link key={r} href={href(r, status)} className={chip(rail === r)}>{tb(`rails.${r}`)}</Link>)}
        <span className="mx-1 w-px bg-line" />
        <Link href={href(rail, undefined)} className={chip(!status)}>{t("allStates")}</Link>
        {STATES.map((s) => <Link key={s} href={href(rail, s)} className={chip(status === s)}>{t(`pay.${s}`)}</Link>)}
      </div>
      <FinanceTable head={[t("when"), t("booking"), t("rail"), t("kind"), t("amount"), t("state")]} empty={!payments.length && <p className="p-6 text-[14px] text-ink-3">{t("none")}</p>}>
        {payments.slice(0, 100).map((p) => {
          const b = bookings.find((x) => x.id === p.bookingId);
          return (
            <tr key={p.id}>
              <td className={`${td} text-ink-2`}>{formatStamp(p.at, intl)}</td>
              <td className={td}>{b ? <Link href={`/manage/bookings/${b.reference}`} className="font-semibold text-ink hover:text-brand">{b.reference}</Link> : "·"}</td>
              <td className={`${td} text-ink-2`}>{tb(`rails.${p.rail}`)}</td>
              <td className={`${td} text-ink-2`}>{tb(`kinds.${p.kind}`)}</td>
              <td className={`${td} tnum text-right font-semibold text-ink`}>{formatMoney(p.amount, intl)}</td>
              <td className={td}><StatusPill tone={p.status === "succeeded" ? "ok" : p.status === "failed" ? "crit" : p.status === "pending" ? "warn" : "idle"}>{t(`pay.${p.status}`)}</StatusPill></td>
            </tr>
          );
        })}
      </FinanceTable>
    </div>
  );
}
