import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { repos } from "@/lib/repos";
import { requireSection } from "@/lib/workspace/guard";
import { STATUS_TONE, refundableOf } from "@/lib/workspace/paid-state";
import { formatDate, formatDateRange, nightsBetween } from "@/lib/domain/dates";
import { formatStamp, kigaliDay } from "@/lib/domain/instants";
import { formatMoney, money } from "@/lib/domain/money";
import { refundPreview } from "@/lib/domain/policies";
import type { Quote } from "@/lib/domain/pricing";
import { INTL_LOCALES, NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { BookingStaffActions, StaffNoteForm } from "@/components/workspace/booking-staff-actions";

/**
 * One booking, for the desk: what the guest sees (what, when, the price
 * line by line) plus what only staff need. The full timeline, every
 * payment and refund, the team's own notes, and the actions that change
 * the booking on the guest's behalf.
 */
export default async function StaffBooking({ params }: { params: Promise<{ locale: string; reference: string }> }) {
  const { locale, reference } = await params;
  setRequestLocale(locale);
  const access = await requireSection("bookings");
  if ("deny" in access) return access.deny;
  const b = await repos().bookings.byReference(decodeURIComponent(reference));
  if (!b) notFound();

  const [t, tStatus, tEvents, tRoles, tSearch] = await Promise.all([
    getTranslations("workspace.bookings"),
    getTranslations("status"),
    getTranslations("booking.manage.events"),
    getTranslations("roles"),
    getTranslations("search"),
  ]);
  const intl = INTL_LOCALES[locale as Locale];
  const num = NUMBER_LOCALES[locale as Locale];
  const today = kigaliDay();

  const [payments, incidents, thread, listing, vehicle, experience] = await Promise.all([
    repos().bookings.payments(b.id),
    repos().incidents.forBooking(b.id),
    repos().messaging.forBooking(b.id, access.role),
    b.service === "stay" ? repos().stays.byId(b.supplyItemId) : null,
    b.service === "car" ? repos().mobility.byId(b.supplyItemId) : null,
    b.service === "experience" ? repos().experiences.byId(b.supplyItemId) : null,
  ]);

  const lease = b.stayMode === "lease";
  const quote: Quote = {
    // The same arithmetic as the guest's page, so the two never disagree.
    nights: lease ? 1 : b.service === "car" ? nightsBetween(b.startDate, b.endDate) + 1 : nightsBetween(b.startDate, b.endDate),
    lines: b.lines ?? [{ key: b.service === "stay" ? "accommodation" : b.service === "car" ? "hire" : "seats", amount: b.total }],
    total: b.total,
    escrowHeld: b.escrowHeld,
  };
  const unit = quote.lines.find((l) => l.key === "accommodation" || l.key === "hire" || l.key === "seats");
  const units = b.service === "experience" ? b.party : quote.nights || 1;
  const unitRate = unit ? { ...unit.amount, minor: Math.round(unit.amount.minor / Math.max(units, 1)) } : b.total;
  const upcoming = b.status === "confirmed" && b.startDate >= today;
  const policy = upcoming
    ? refundPreview(b.service, quote, b.startDate, today, {
        hireDays: nightsBetween(b.startDate, b.endDate) + 1,
        permitShare: experience?.permitShare ? money(experience.permitShare.minor * b.party, experience.permitShare.currency) : undefined,
      }, (await repos().admin.settings()).catalog).refund
    : null;
  const notes = b.staffNotes ?? [];
  const events = (b.timeline ?? []).filter((e) => e.kind !== "noteAdded");
  const dates = b.startDate === b.endDate ? formatDate(b.startDate, intl) : formatDateRange(b.startDate, b.endDate, intl);

  const card = "flex flex-col gap-3 rounded-card border border-line bg-surface p-5";
  const h2 = "text-[15px] font-semibold text-ink";

  return (
    <div className="flex flex-col gap-5">
      <Link href="/manage/bookings" className="inline-flex items-center gap-1 self-start text-[14px] font-semibold text-ink-2 hover:text-ink">
        <ChevronLeftIcon size={16} />
        {t("back")}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-mono text-[13px] font-semibold text-ink-3">{b.reference}</p>
          <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{b.guest?.name ?? b.reference}</h1>
          <p className="text-[15px] text-ink-2">
            {b.title} · {dates} · {tSearch("guestCount", { count: b.party })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {b.escrowHeld && <StatusPill tone="warn">{t("escrowHeld")}</StatusPill>}
          <StatusPill tone={STATUS_TONE[b.status]}>{tStatus(b.status)}</StatusPill>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className={card}>
            <h2 className={h2}>{t("guest")}</h2>
            <dl className="grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
              {[
                [t("email"), b.guest?.email],
                [t("phone"), b.guest?.phone],
                [t("arrival"), b.guest?.arrivalTime],
                [t("purpose"), b.guest?.purpose ? t(`purposes.${b.guest.purpose}`) : undefined],
                [t("requests"), b.guest?.requests],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex flex-col">
                    <dt className="text-[12.5px] text-ink-3">{k}</dt>
                    <dd className="break-words text-ink">{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          <section className={card}>
            <h2 className={h2}>{t("price")}</h2>
            <QuoteBreakdown quote={quote} unitRate={unitRate} units={units} showEscrow={false} />
          </section>

          <section className={card}>
            <h2 className={h2}>{t("payments")}</h2>
            {payments.length ? (
              <ul className="flex flex-col divide-y divide-line-soft text-[14px]">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="flex flex-col">
                      <span className="text-ink">{t(`kinds.${p.kind}`)} · {t(`rails.${p.rail}`)}</span>
                      <span className="text-[12.5px] text-ink-3">{formatStamp(p.at, intl)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={p.kind === "refund" ? "tnum text-crit" : "tnum text-ink"}>{p.kind === "refund" ? "−" : ""}{formatMoney(p.amount, num)}</span>
                      {p.status !== "succeeded" && <StatusPill tone={p.status === "failed" ? "crit" : "idle"}>{t(`payStatus.${p.status}`)}</StatusPill>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-ink-3">{t("noPayments")}</p>
            )}
          </section>

          <section className={card}>
            <h2 className={h2}>{t("timeline")}</h2>
            <ol className="flex flex-col gap-2.5 text-[14px]">
              {events.map((e, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden="true" className="mt-1.5 size-2 flex-none rounded-full bg-brand" />
                  <span className="flex flex-col">
                    <span className="text-ink">{tEvents(e.kind)}{e.note ? ` · ${e.note}` : ""}</span>
                    <span className="text-[12.5px] text-ink-3">{formatStamp(e.at, intl)} · {tRoles(e.actor)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <BookingStaffActions
            reference={b.reference}
            guestName={b.guest?.name ?? ""}
            admin={access.role === "admin"}
            start={b.startDate}
            end={b.endDate}
            today={today}
            party={b.party}
            maxParty={listing?.sleeps ?? vehicle?.seats ?? experience?.groupMax ?? b.party}
            canChange={upcoming}
            canAddGuests={upcoming && b.startDate > today}
            canCancel={upcoming}
            policyRefund={policy}
            refundable={refundableOf(b, payments)}
          />

          <section className={card}>
            <h2 className={h2}>{t("notes")}</h2>
            <p className="-mt-2 text-[12.5px] text-ink-3">{t("notesHint")}</p>
            {notes.length > 0 && (
              <ul className="flex flex-col gap-2 text-[14px]">
                {notes.map((n, i) => (
                  <li key={i} className="rounded-ctl bg-surface-2 px-3 py-2">
                    <p className="whitespace-pre-line text-ink">{n.text}</p>
                    <p className="text-[12px] text-ink-3">{formatStamp(n.at, intl)} · {tRoles(n.by)}</p>
                  </li>
                ))}
              </ul>
            )}
            <StaffNoteForm reference={b.reference} />
          </section>

          <section className={card}>
            <h2 className={h2}>{t("related")}</h2>
            <Link href={thread ? `/manage/inbox?thread=${thread.id}` : "/manage/inbox"} className="text-[14px] font-semibold text-brand hover:underline">
              {thread ? t("thread") : t("noThread")}
            </Link>
            <Link href={`/manage/incidents?booking=${b.reference}`} className="text-[14px] font-semibold text-brand hover:underline">
              {t("incidents", { count: incidents.length })}
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
