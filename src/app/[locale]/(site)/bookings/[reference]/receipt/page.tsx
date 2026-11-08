import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { INTL_LOCALES, NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, formatDateRange } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { Logo } from "@/components/shell/logo";
import { SignedOut } from "@/components/shell/signed-out";
import { PrintButton } from "@/components/bookings/print-button";

export async function generateMetadata({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const t = await getTranslations("booking.record");
  return { title: t("receiptTitle", { ref: reference }) };
}

/**
 * A receipt to print or save as PDF. The print stylesheet drops the site's
 * header, footer and buttons, so what comes out of the printer is this page
 * and nothing else. Amounts are in the currency they were charged in, not
 * the reader's display currency: a receipt states what was paid.
 */
export default async function Receipt({ params }: { params: Promise<{ locale: string; reference: string }> }) {
  const { locale, reference } = await params;
  setRequestLocale(locale);
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role === "visitor") return <SignedOut screen="booking" />;
  const booking = await repos().bookings.byReference(reference);
  if (!booking || role !== "guest") notFound();

  const [t, tq, tl, tx] = await Promise.all([
    getTranslations("booking.record"),
    getTranslations("quote"),
    getTranslations("quoteLines"),
    getTranslations("extras"),
  ]);
  const intl = INTL_LOCALES[locale as Locale];
  const num = NUMBER_LOCALES[locale as Locale];
  const payments = await repos().bookings.payments(booking.id);
  const lines = booking.lines ?? [{ key: "accommodation" as const, amount: booking.total }];
  const label = (key: string, extra?: string) =>
    key === "extra" && extra
      ? tx(`${extra}.name`)
      : key === "accommodation"
        ? booking.title
        : key === "hire" || key === "seats"
          ? booking.title
          : key === "cleaning" || key === "serviceFee"
            ? tq(key)
            : tl.has(key)
              ? tl(key, { count: 0, rate: "", days: 0 })
              : key;

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8 px-6 py-10 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <PrintButton label={t("print")} />
      </div>
      <article className="flex flex-col gap-8 rounded-card border border-line bg-surface p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <Logo />
          <div className="text-right">
            <h1 className="font-display text-2xl font-semibold text-ink">{t("receiptTitle", { ref: booking.reference })}</h1>
            <p className="text-[13px] text-ink-3">{t("issued", { date: formatDate(payments.at(-1)?.at.slice(0, 10) ?? booking.startDate, intl) })}</p>
          </div>
        </header>
        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-[12px] font-medium text-ink-3">{t("billedTo")}</p>
            <p className="text-[15px] font-semibold text-ink">{booking.guest?.name ?? "—"}</p>
            <p className="text-[14px] text-ink-2">{booking.guest?.email}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[12px] font-medium text-ink-3">{t("details")}</p>
            <p className="text-[15px] font-semibold text-ink">{booking.title}</p>
            <p className="tnum text-[14px] text-ink-2">
              {booking.startDate === booking.endDate ? formatDate(booking.startDate, intl) : formatDateRange(booking.startDate, booking.endDate, intl)}
            </p>
          </div>
        </section>
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-ink-3">
              <th className="py-2 font-medium">{t("item")}</th>
              <th className="py-2 text-right font-medium">{t("amount")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-line-soft">
                <td className="py-2.5 text-ink">{label(l.key, l.extra)}</td>
                <td className="tnum py-2.5 text-right text-ink">{formatMoney(l.amount, num)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-[15px] font-semibold text-ink">{tq("total")}</td>
              <td className="tnum pt-3 text-right text-[15px] font-semibold text-ink">{formatMoney(booking.total, num)}</td>
            </tr>
          </tfoot>
        </table>
        {payments.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="text-[12px] font-medium text-ink-3">{t("payments")}</p>
            {payments.map((p) => (
              <p key={p.id} className="flex justify-between gap-4 text-[14px] text-ink-2">
                <span>
                  {formatDate(p.at.slice(0, 10), intl)} · {t(`kinds.${p.kind}`)} · {t(`rails.${p.rail}`)} · {t(`status.${p.status}`)}
                </span>
                <span className="tnum">{formatMoney(p.amount, num)}</span>
              </p>
            ))}
          </section>
        )}
        <p className="border-t border-line pt-4 text-[12px] leading-relaxed text-ink-3">{t("vatNote")}</p>
      </article>
    </div>
  );
}
