import { getTranslations } from "next-intl/server";
import type { Booking } from "@/lib/domain/types";
import type { Quote } from "@/lib/domain/pricing";
import { repos } from "@/lib/repos";
import { supplyRefFor } from "@/lib/repos/supply-ref";
import { Link } from "@/i18n/navigation";
import { NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { formatDate, formatDateRange, nightsBetween } from "@/lib/domain/dates";
import { formatMoney } from "@/lib/domain/money";
import { BANK_DETAILS } from "@/lib/booking/bank";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { StatusPill } from "@/components/ui/status-pill";
import { SupplyImage } from "@/components/ui/supply-image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ShareButton } from "@/components/ui/share-button";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { Button } from "@/components/ui/button";
import { CalendarIcon, CheckIcon, ClockIcon, NoteIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/** Placed in the last quarter of an hour: still "you're booked", not the record. */
function placedRecently(at: string | undefined): boolean {
  return !!at && Date.now() - Date.parse(at) < 15 * 60_000;
}

const STATUS_TONE = { draft: "idle", confirmed: "ok", active: "ok", completed: "idle", cancelled: "crit" } as const;

/**
 * One booking, as its guest sees it: what, when, what it cost and how it was
 * paid, what happens next, and the thread with the Kigali team.
 *
 * Straight after paying it opens with "You're booked" (or, for a bank
 * transfer, what to send and where); coming back later it is the record.
 * The total is the sum of the shown lines, the same arithmetic as checkout,
 * so the two screens never disagree by a cent.
 */
export async function BookingRecord({
  booking,
  locale,
  intlLocale,
  manage,
}: {
  booking: Booking;
  locale: string;
  intlLocale: string;
  /** Task 27's change, cancel and stay tools. */
  manage?: React.ReactNode;
}) {
  const [t, tc, tB, tStatus, tVerify, tSearch, tTrips] = await Promise.all([
    getTranslations("booking.record"),
    getTranslations("confirmation"),
    getTranslations("breadcrumb"),
    getTranslations("status"),
    getTranslations("verification"),
    getTranslations("search"),
    getTranslations("trips"),
  ]);
  const [supply, conversation, payments] = await Promise.all([
    supplyRefFor(booking),
    repos().messaging.forBooking(booking.id, "guest"),
    repos().bookings.payments(booking.id),
  ]);

  const numLocale = NUMBER_LOCALES[locale as Locale];
  const placedAt = booking.timeline?.find((e) => e.kind === "placed")?.at;
  const fresh = placedRecently(placedAt);
  const pending = payments.find((p) => p.status === "pending");
  const upcoming = booking.status === "confirmed" || booking.status === "active";
  const lease = booking.stayMode === "lease";
  const dates =
    booking.service === "experience" || booking.startDate === booking.endDate
      ? formatDate(booking.startDate, intlLocale)
      : formatDateRange(booking.startDate, booking.endDate, intlLocale);

  const quote: Quote | null = booking.lines
    ? {
        nights: lease ? 1 : booking.service === "car" ? nightsBetween(booking.startDate, booking.endDate) + 1 : nightsBetween(booking.startDate, booking.endDate),
        lines: booking.lines,
        total: booking.total,
        escrowHeld: booking.escrowHeld,
      }
    : null;
  const unit = booking.lines?.find((l) => l.key === "accommodation" || l.key === "hire" || l.key === "seats");
  const units = booking.service === "experience" ? booking.party : (quote?.nights ?? 1);
  const unitRate = unit ? { ...unit.amount, minor: Math.round(unit.amount.minor / Math.max(units, 1)) } : booking.total;
  const deposit = payments.find((p) => p.kind === "deposit");

  // "What happens next" is about arriving; once someone is inside it is noise.
  const nextSteps = booking.status === "confirmed" ? [tc("next1"), ...(booking.escrowHeld ? [tc("next2")] : []), tc("next3")] : [];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-4 py-6 sm:px-6">
      <Breadcrumbs trail={[{ label: tB("trips"), href: "/trips" }, { label: booking.reference }]} />

      {fresh && !pending && booking.status !== "cancelled" && (
        <section role="status" className="flex items-start gap-4 rounded-card border border-ok/30 bg-ok-tint/60 p-5">
          <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-full bg-ok text-white">
            <CheckIcon size={20} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-semibold text-ink">{tc("title")}</h2>
            <p className="max-w-[62ch] text-[15px] text-ink-2">{tc("body")}</p>
          </div>
        </section>
      )}
      {pending && (
        <section role="status" className="flex items-start gap-4 rounded-card border border-warn/40 bg-warn-tint/60 p-5">
          <span aria-hidden="true" className="grid size-11 flex-none place-items-center rounded-full bg-surface text-warn">
            <ClockIcon size={20} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-2xl font-semibold text-ink">{t("pendingTitle")}</h2>
            <p className="max-w-[66ch] text-[15px] text-ink-2">
              {t("pendingBody", {
                amount: formatMoney(pending.amount, numLocale),
                account: BANK_DETAILS.account,
                bank: BANK_DETAILS.bank,
                ref: booking.reference,
              })}
            </p>
          </div>
        </section>
      )}

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={pending ? "warn" : STATUS_TONE[booking.status]}>
            {pending ? t("status.pending") : tStatus(booking.status)}
          </StatusPill>
          {booking.escrowHeld && booking.status !== "cancelled" && <StatusPill tone="warn">{tVerify("escrowShort")}</StatusPill>}
        </div>
        <h1 className="max-w-[24ch] text-balance font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {supply?.name ?? booking.title}
        </h1>
        {supply && <p className="text-[15px] text-ink-2">{supply.detail}</p>}
      </header>

      <div className="grid items-start gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col">
          <section className="flex flex-col gap-3 pb-6">
            <h2 className="text-xs font-medium text-ink-3">{tc("reference")}</h2>
            <p className="font-mono text-2xl font-semibold tracking-tight text-ink">{booking.reference}</p>
            <p className="text-sm text-ink-2">{tc("referenceHint")}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={`/bookings/${booking.reference}/receipt`} className="inline-flex h-10 items-center gap-2 rounded-ctl border border-line bg-surface px-3.5 text-[14px] font-semibold text-ink hover:border-brand hover:text-brand">
                <NoteIcon size={15} />
                {t("receipt")}
              </Link>
              {/* A plain link to a file the browser downloads; no JavaScript. */}
              <a href={`/${locale}/bookings/${booking.reference}/calendar`} download={`${booking.reference}.ics`} className="inline-flex h-10 items-center gap-2 rounded-ctl border border-line bg-surface px-3.5 text-[14px] font-semibold text-ink hover:border-brand hover:text-brand">
                <CalendarIcon size={15} />
                {t("calendar")}
              </a>
              <ShareButton title={`${booking.title} · ${booking.reference}`} />
            </div>
          </section>

          <dl className="grid gap-x-8 gap-y-4 border-t border-line py-6 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] text-ink-3">{tSearch("when")}</dt>
              <dd className="tnum text-[15px] font-semibold text-ink">{dates}</dd>
              {booking.slot && <dd className="tnum text-[13px] text-ink-2">{t("slot", { time: booking.slot })}</dd>}
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-[13px] text-ink-3">{tSearch("guests")}</dt>
              <dd className="text-[15px] font-semibold text-ink">{tSearch("guestCount", { count: booking.party })}</dd>
              {booking.participants && <dd className="text-[13px] text-ink-2">{booking.participants.map((p) => p.name).join(", ")}</dd>}
            </div>
            {booking.pickup && (
              <div className="flex flex-col gap-1">
                <dt className="text-[13px] text-ink-3">{t("meet")}</dt>
                <dd className="text-[15px] font-semibold text-ink">{booking.pickup.flight ? `KGL · ${booking.pickup.flight}` : booking.pickup.detail || "KGL"}</dd>
              </div>
            )}
          </dl>

          {quote && (
            <section className="flex flex-col gap-3 border-t border-line py-6">
              <h2 className="font-display text-2xl font-semibold text-ink">{t("price")}</h2>
              <div className="max-w-[460px]">
                <QuoteBreakdown quote={quote} unitRate={unitRate} units={units} showEscrow={false} />
              </div>
              {deposit && booking.paymentPlan === "deposit" && (
                <p className="text-[14px] text-ink-2">
                  {t("balanceDue", {
                    amount: formatMoney({ ...booking.total, minor: booking.total.minor - deposit.amount.minor }, numLocale),
                    date: formatDate(new Date(Date.parse(`${booking.startDate}T00:00:00Z`) - 14 * 86_400_000).toISOString().slice(0, 10), intlLocale),
                  })}
                </p>
              )}
            </section>
          )}

          {payments.length > 0 && (
            <section className="flex flex-col gap-3 border-t border-line py-6">
              <h2 className="text-[15px] font-semibold text-ink">{t("payments")}</h2>
              <ul className="flex flex-col divide-y divide-line-soft rounded-card border border-line bg-surface">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[14px]">
                    <span className="tnum w-24 text-ink-3">{formatDate(p.at.slice(0, 10), intlLocale, { day: "numeric", month: "short" })}</span>
                    <span className="min-w-0 flex-1 text-ink">
                      {t(`kinds.${p.kind}`)} · <span className="text-ink-2">{t(`rails.${p.rail}`)}</span>
                    </span>
                    <StatusPill tone={p.status === "succeeded" ? "ok" : p.status === "pending" ? "warn" : p.status === "failed" ? "crit" : "idle"}>
                      {t(`status.${p.status}`)}
                    </StatusPill>
                    {/* As charged, in the currency it was charged in: a payment
                        is a statement of money that moved, and converting it
                        again would put a different number beside the receipt. */}
                    <span className={cn("tnum w-32 text-right font-semibold", p.kind === "refund" ? "text-ok" : "text-ink")}>
                      {p.kind === "refund" ? "−" : ""}
                      {formatMoney(p.amount, numLocale)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {manage}

          {nextSteps.length > 0 && (
            <section className="flex flex-col gap-3 border-t border-line py-6">
              <h2 className="font-display text-2xl font-semibold text-ink">{tc("whatNext")}</h2>
              <ol className="flex flex-col gap-2.5">
                {nextSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span aria-hidden="true" className="tnum mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-3">
                      {i + 1}
                    </span>
                    <p className="max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {lease && upcoming && (
            <section className="flex flex-col gap-3 border-t border-line py-6">
              <h2 className="font-display text-2xl font-semibold text-ink">{t("moveInTitle")}</h2>
              <p className="max-w-[62ch] text-[15px] text-ink-2">{t("moveInBody")}</p>
              <ul className="flex flex-col gap-2">
                {(["keys", "meters", "inventory", "photos", "contact"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-3 text-[15px] text-ink-2">
                    <span aria-hidden="true" className="mt-0.5 grid size-5 flex-none place-items-center rounded-[5px] border border-line bg-surface" />
                    {t(`moveIn.${k}`)}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {booking.status === "cancelled" && <p className="border-t border-line py-6 text-[15px] leading-relaxed text-ink-2">{tc("cancelledNote")}</p>}

          <section className="flex flex-col items-start gap-3 border-t border-line py-6">
            <h2 className="font-display text-2xl font-semibold text-ink">{tc("arrangeTitle")}</h2>
            <p className="max-w-[58ch] text-[15px] leading-relaxed text-ink-2">{tc("arrangeBody")}</p>
            <Link href={conversation ? `/messages?thread=${conversation.id}` : "/messages"} className="mt-1">
              <Button variant="trust">{conversation ? tTrips("openThread") : tc("arrangeAction")}</Button>
            </Link>
          </section>
        </div>

        <aside className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 lg:sticky lg:top-24">
          <SupplyImage seed={supply?.imageSeed ?? booking.supplyItemId} src={supply?.image} alt={supply?.name ?? booking.title} sizes="320px" className="h-36 rounded-inner" />
          <VerifiedBadge label={tVerify("badge")} size="sm" className="self-start" />
          {supply && (
            <Link href={supply.href} className="rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep">
              {tc("viewListing")}
            </Link>
          )}
          <p className="border-t border-line pt-3 text-[13px] leading-relaxed text-ink-3">{tc("recordNote", { date: formatDate(booking.startDate, intlLocale) })}</p>
        </aside>
      </div>
    </div>
  );
}
