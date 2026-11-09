import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { INTL_LOCALES, NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate } from "@/lib/domain/dates";
import { formatMoney, money } from "@/lib/domain/money";
import { Link } from "@/i18n/navigation";
import { SignedOut } from "@/components/shell/signed-out";
import { StatusPill } from "@/components/ui/status-pill";
import { cn } from "@/lib/cn";

export async function generateMetadata() {
  const t = await getTranslations("account");
  return { title: t("payments.title") };
}

/**
 * Every payment and refund, as charged, newest first, each linked to its
 * booking's receipt. Two totals on top: what was paid this year and what
 * came back, both in RWF, the currency charged.
 */
export default async function Payments({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  const [t, tr] = await Promise.all([getTranslations("account.payments"), getTranslations("booking.record")]);
  const intl = INTL_LOCALES[locale as Locale];
  const num = NUMBER_LOCALES[locale as Locale];
  const [all, bookings] = await Promise.all([repos().bookings.payments(), repos().bookings.listForCurrentUser()]);
  // Payments are stored for everyone; a guest sees the ones on their own
  // bookings, as the privacy export already does.
  const mine = new Set(bookings.map((b) => b.id));
  const payments = all.filter((p) => mine.has(p.bookingId));
  const byId = new Map(bookings.map((b) => [b.id, b]));
  const year = new Date().getUTCFullYear().toString();
  const rwf = (kind: "in" | "out") =>
    money(
      payments
        // Refunded is a separate refund entry, or a payment returned in full;
        // paid is everything else that went through.
        .filter((p) => {
          if (!p.at.startsWith(year) || p.amount.currency !== "RWF" || p.status === "failed") return false;
          const back = p.kind === "refund" || p.status === "refunded";
          return kind === "out" ? back : !back;
        })
        .reduce((n, p) => n + p.amount.minor, 0),
      "RWF",
    );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
        <p className="max-w-[62ch] text-[15px] text-ink-2">{t("intro")}</p>
      </header>
      <dl className="grid grid-cols-1 gap-3 sm:max-w-md sm:grid-cols-2">
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="text-[13px] text-ink-3">{t("totalPaid")}</dt>
          <dd className="tnum text-xl font-semibold text-ink">{formatMoney(rwf("in"), num)}</dd>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <dt className="text-[13px] text-ink-3">{t("totalRefunded")}</dt>
          <dd className="tnum text-xl font-semibold text-ok">{formatMoney(rwf("out"), num)}</dd>
        </div>
      </dl>
      {payments.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-[15px] text-ink-3">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
          {payments.map((p) => {
            const b = byId.get(p.bookingId);
            return (
              <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[96px_1fr_auto_auto_120px]">
                <span className="tnum text-[13px] text-ink-3 sm:order-none">{formatDate(p.at.slice(0, 10), intl, { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="col-span-2 flex min-w-0 flex-col sm:col-span-1">
                  <span className="truncate text-[15px] font-medium text-ink">{b?.title ?? p.bookingId}</span>
                  <span className="text-[13px] text-ink-2">
                    {tr(`kinds.${p.kind}`)} · {tr(`rails.${p.rail}`)}
                    {b && (
                      <>
                        {" · "}
                        <Link href={`/bookings/${b.reference}/receipt`} className="font-semibold text-brand hover:text-brand-deep">
                          {t("receipt")}
                        </Link>
                      </>
                    )}
                  </span>
                </span>
                <span className="justify-self-start">
                  <StatusPill tone={p.status === "succeeded" ? "ok" : p.status === "pending" ? "warn" : p.status === "failed" ? "crit" : "idle"}>{tr(`status.${p.status}`)}</StatusPill>
                </span>
                <span className={cn("tnum text-right text-[15px] font-semibold sm:col-start-5", p.kind === "refund" ? "text-ok" : "text-ink")}>
                  {p.kind === "refund" ? "−" : ""}
                  {formatMoney(p.amount, num)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
