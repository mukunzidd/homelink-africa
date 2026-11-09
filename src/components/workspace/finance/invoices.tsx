import { getTranslations } from "next-intl/server";
import type { Booking } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/money";
import { formatDate } from "@/lib/domain/dates";
import { placedOn } from "@/lib/workspace/metrics";
import { Link } from "@/i18n/navigation";
import { FinanceTable, td } from "./shared";

/** One receipt per paid booking, newest first, each opening the receipt the guest has. */
export async function InvoicesTab({ bookings, intl }: { bookings: Booking[]; intl: string }) {
  const t = await getTranslations("workspace.finance");
  const rows = bookings.filter((b) => b.status !== "cancelled").sort((a, b) => placedOn(b).localeCompare(placedOn(a))).slice(0, 60);
  return (
    <FinanceTable head={[t("issued"), t("booking"), t("guest"), t("amount"), ""]}>
      {rows.map((b) => (
        <tr key={b.id}>
          <td className={`${td} text-ink-2`}>{formatDate(placedOn(b), intl, { day: "numeric", month: "short", year: "numeric" })}</td>
          <td className={`${td} font-semibold text-ink`}>{b.reference}</td>
          <td className={`${td} text-ink-2`}>{b.guest?.name ?? "·"}</td>
          <td className={`${td} tnum text-right font-semibold text-ink`}>{formatMoney(b.total, intl)}</td>
          <td className={`${td} text-right`}><Link href={`/bookings/${b.reference}/receipt`} className="text-[13px] font-semibold text-brand hover:underline">{t("receipt")}</Link></td>
        </tr>
      ))}
    </FinanceTable>
  );
}
