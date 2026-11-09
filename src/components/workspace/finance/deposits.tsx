import { getTranslations } from "next-intl/server";
import type { Booking, PaymentRecord } from "@/lib/domain/types";
import { exponentOf, formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { Link } from "@/i18n/navigation";
import { QueueRow } from "@/components/queue/queue-row";
import { ReleaseDeposit } from "./finance-actions";
import { FinanceTable, td } from "./shared";

/**
 * Money held for someone else. Escrow on a stay goes to the home at
 * check-in by itself; a renting deposit is given back by a person, less
 * anything that needs repairing, with the reason written down.
 */
export async function DepositsTab({ bookings, payments, intl }: { bookings: Booking[]; payments: PaymentRecord[]; intl: string }) {
  const t = await getTranslations("workspace.finance");
  const escrow = bookings.filter((b) => b.escrowHeld && b.status === "confirmed");
  const deposits = bookings.filter((b) => b.stayMode === "lease" && b.lines?.some((l) => l.key === "deposit") && !payments.some((p) => p.bookingId === b.id && p.kind === "refund" && p.status !== "failed"));
  const day = (d: string) => formatDate(d, intl, { day: "numeric", month: "short", year: "numeric" });
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{t("rentingDeposits")} <span className="font-normal text-ink-3">· {deposits.length}</span></h2>
        {deposits.length ? (
          <ul className="flex flex-col border-b border-line">
            {deposits.map((b) => {
              const deposit = b.lines!.find((l) => l.key === "deposit")!.amount;
              return (
                <QueueRow
                  key={b.id}
                  summary={
                    <span className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="flex flex-col"><span className="text-[15px] font-semibold text-ink">{b.guest?.name}</span><span className="text-[13px] text-ink-3">{b.title} · {t("endsOn", { date: day(b.endDate) })}{b.moveOut ? ` · ${t("moveOutOn", { date: day(b.moveOut.date) })}` : ""}</span></span>
                      <span className="tnum text-[15px] font-semibold text-ink">{formatMoney(deposit, intl)}</span>
                    </span>
                  }
                >
                  <ReleaseDeposit bookingId={b.id} depositMajor={deposit.minor / 10 ** exponentOf(deposit.currency)} currency={deposit.currency} />
                </QueueRow>
              );
            })}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">{t("none")}</p>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">{t("escrow")} <span className="font-normal text-ink-3">· {escrow.length}</span></h2>
        <p className="text-[13px] text-ink-3">{t("escrowNote")}</p>
        <FinanceTable head={[t("booking"), t("guest"), t("arrives"), t("amount")]}>
          {escrow.map((b) => (
            <tr key={b.id}>
              <td className={td}><Link href={`/manage/bookings/${b.reference}`} className="font-semibold text-ink hover:text-brand">{b.reference}</Link></td>
              <td className={`${td} text-ink-2`}>{b.guest?.name ?? "·"}</td>
              <td className={`${td} text-ink-2`}>{day(b.startDate)}</td>
              <td className={`${td} tnum text-right font-semibold text-ink`}>{formatMoney(b.total, intl)}</td>
            </tr>
          ))}
        </FinanceTable>
      </section>
    </div>
  );
}
