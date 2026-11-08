import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { INTL_LOCALES, NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, monthsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { formatMoney } from "@/lib/domain/money";
import { rentSchedule } from "@/lib/workspace/schedules";
import { Link } from "@/i18n/navigation";
import { SignedOut } from "@/components/shell/signed-out";
import { StatusPill } from "@/components/ui/status-pill";
import { SupplyImage } from "@/components/ui/supply-image";
import { PayRentButton, RepairRequest } from "@/components/account/renting-actions";

export async function generateMetadata() {
  const t = await getTranslations("account.renting");
  return { title: t("title") };
}

const TONE = { paid: "ok", due: "warn", overdue: "crit", upcoming: "idle" } as const;
const TICKET_TONE = { open: "idle", scheduled: "warn", inProgress: "warn", done: "ok" } as const;

/**
 * A tenant's year in one page: the home, the rent month by month with the
 * one that is due (or overdue) payable in a tap, repairs and where they
 * are, and the documents.
 */
export default async function Renting({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  if ((await currentRole()) === "visitor") return <SignedOut screen="booking" />;
  const t = await getTranslations("account.renting");
  const intl = INTL_LOCALES[locale as Locale];
  const num = NUMBER_LOCALES[locale as Locale];
  const lease = (await repos().bookings.listForCurrentUser()).find((b) => b.stayMode === "lease" && b.status === "active");
  if (!lease) return <p className="rounded-card border border-line bg-surface p-6 text-[15px] text-ink-2">{t("none")}</p>;

  const listing = await repos().stays.byId(lease.supplyItemId);
  const rent = lease.lines?.find((l) => l.key === "rent")?.amount;
  const deposit = lease.lines?.find((l) => l.key === "deposit")?.amount;
  const [payments, tickets] = await Promise.all([repos().bookings.payments(lease.id), repos().work.tickets()]);
  const mine = tickets.filter((x) => x.bookingId === lease.id || (x.listingId === lease.supplyItemId && x.source === "tenant"));
  const schedule = rent ? rentSchedule(lease.startDate, monthsBetween(lease.startDate, lease.endDate), rent, payments, kigaliDay()) : [];
  const payable = schedule.find((i) => i.status === "overdue" || i.status === "due");
  const day = (d: string) => formatDate(d, intl, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-semibold text-ink">{t("title")}</h1>
      <article className="grid overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-[220px_1fr]">
        <SupplyImage seed={listing?.imageSeed ?? lease.supplyItemId} src={listing?.images?.[0]} alt={lease.title} sizes="220px" className="h-40 sm:h-full" />
        <div className="flex flex-col gap-1.5 p-5">
          <p className="font-display text-2xl font-semibold text-ink">{lease.title}</p>
          <p className="tnum text-[14px] text-ink-2">{t("term", { start: day(lease.startDate), end: day(lease.endDate) })}</p>
          {deposit && <p className="text-[14px] text-ink-2">{t("depositHeld", { amount: formatMoney(deposit, num) })}</p>}
          <Link href={`/bookings/${lease.reference}`} className="mt-auto pt-2 text-[14px] font-semibold text-brand hover:text-brand-deep">
            {lease.reference} →
          </Link>
        </div>
      </article>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("schedule")}</h2>
        <ol className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
          {schedule.map((i) => (
            <li key={i.due} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
              <span className="tnum w-32 text-[14px] text-ink">{day(i.due)}</span>
              <StatusPill tone={TONE[i.status]}>{t(`status.${i.status}`)}</StatusPill>
              <span className="tnum ml-auto text-[15px] font-semibold text-ink">{formatMoney(i.amount, num)}</span>
              {payable?.due === i.due && <PayRentButton reference={lease.reference} label={t("pay", { amount: formatMoney(i.amount, num) })} />}
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("repairs")}</h2>
        <p className="max-w-[62ch] text-[15px] text-ink-2">{t("repairsBody")}</p>
        {mine.length ? (
          <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
            {mine.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium text-ink">{x.title}</span>
                  <span className="text-[13px] text-ink-3">{day(x.createdAt.slice(0, 10))}</span>
                </span>
                <StatusPill tone={TICKET_TONE[x.status]}>{t(`ticketStatus.${x.status}`)}</StatusPill>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-ink-3">{t("noRepairs")}</p>
        )}
        <RepairRequest reference={lease.reference} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("documents")}</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bookings/${lease.reference}`} className="inline-flex min-h-11 items-center rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand">
            {t("docAgreement")}
          </Link>
          <Link href="/account/payments" className="inline-flex min-h-11 items-center rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand">
            {t("docReceipts")}
          </Link>
        </div>
      </section>
    </div>
  );
}
