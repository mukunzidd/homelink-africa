import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { StatusTone } from "@/components/ui/status-pill";
import type {
  AddOnRequestStatus,
  PayoutStatus,
  VerificationTaskStatus,
} from "@/lib/domain/types";
import { formatDate } from "@/lib/domain/dates";
import { formatStamp } from "@/lib/domain/instants";
import { sum } from "@/lib/domain/money";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { cn } from "@/lib/cn";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("queue");
  return { title: t("title") };
}

/**
 * The concierge team's screen.
 *
 * Product & UX §7 says the guarantee is delivered by people and enforced by
 * software; this is the software half admitting how much of it is people. Four
 * lists, in the order the day runs: what is waiting to be verified, what a
 * guest has asked a human for, what is owed to supply, and who is waiting for
 * a reply.
 *
 * Denser than the guest screens and deliberately so. A guest reads one booking
 * carefully; ops scans forty rows for the one that is stuck, so every row
 * leads with its state and carries the sentence explaining why it has not
 * moved. That note is the most-read text on a queue and the first thing an
 * admin template leaves out.
 *
 * Nothing here writes. The buttons an ops tool eventually needs — schedule,
 * publish, release — are exactly the parts that need a backend, and a shell
 * with a dead "Release funds" button would be worse than one without it.
 */
const VERIFY_TONE: Record<VerificationTaskStatus, StatusTone> = {
  requested: "warn",
  scheduled: "idle",
  inspected: "idle",
  published: "ok",
};

const REQUEST_TONE: Record<AddOnRequestStatus, StatusTone> = {
  open: "warn",
  quoted: "idle",
  arranged: "ok",
  declined: "idle",
};

const PAYOUT_TONE: Record<PayoutStatus, StatusTone> = {
  held: "warn",
  due: "idle",
  paid: "ok",
};

export default async function QueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("queue");
  const intlLocale = INTL_LOCALES[locale as Locale];

  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role !== "ops" && role !== "admin") {
    return (
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-6 py-16">
        <h1 className="font-display text-3xl font-semibold text-ink">
          {t("notYours")}
        </h1>
        <p className="max-w-[56ch] text-ink-2">{t("notYoursBody")}</p>
        <Link
          href="/"
          className="mt-2 self-start rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
        >
          ← HomeLink
        </Link>
      </div>
    );
  }

  const [tasks, requests, payouts, threads, bookings] = await Promise.all([
    repos().ops.verificationQueue(),
    repos().ops.addOnRequests(),
    repos().ops.payouts(),
    repos().messaging.forRole(role),
    repos().bookings.listForCurrentUser(),
  ]);

  const referenceOf = (bookingId: string) =>
    bookings.find((b) => b.id === bookingId)?.reference ?? bookingId;

  const openTasks = tasks.filter((task) => task.status !== "published");
  const openRequests = requests.filter((r) => r.status === "open");
  const waiting = threads.filter((c) => c.unreadCount > 0);
  const owed = sum(
    payouts.filter((p) => p.status !== "paid").map((p) => p.amount),
    "RWF",
  );

  const day = (iso: string) =>
    formatDate(iso, intlLocale, { day: "numeric", month: "short" });

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 py-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink-2">
          {t("subtitle")}
        </p>
      </header>

      <dl className="flex flex-wrap items-end gap-x-10 gap-y-4 border-y border-line py-5">
        {[
          { key: "verify", label: t("countVerify"), value: String(openTasks.length) },
          { key: "asks", label: t("countAsks"), value: String(openRequests.length) },
          { key: "replies", label: t("countReplies"), value: String(waiting.length) },
        ].map((stat) => (
          <div key={stat.key} className="flex flex-col gap-0.5">
            <dt className="text-[13px] text-ink-3">{stat.label}</dt>
            <dd className="tnum font-display text-3xl font-semibold text-ink">
              {stat.value}
            </dd>
          </div>
        ))}
        <div className="flex flex-col gap-0.5">
          <dt className="text-[13px] text-ink-3">{t("countOwed")}</dt>
          <dd>
            <MoneyText
              amount={owed}
              className="font-display text-3xl font-semibold text-ink"
            />
          </dd>
        </div>
      </dl>

      {/* ------------------------------------------- verification queue --- */}
      <section className="flex flex-col">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("verifyTitle")}
        </h2>
        <p className="pt-1 text-[13px] text-ink-3">{t("verifyNote")}</p>

        <ul className="flex flex-col pt-3">
          {tasks.map((task) => (
            <li
              key={task.id}
              className={cn(
                "flex flex-col gap-2 border-t border-line py-4 sm:flex-row sm:items-start sm:gap-6",
                task.status === "published" && "opacity-60",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={VERIFY_TONE[task.status]}>
                    {t(`verifyStatus.${task.status}`)}
                  </StatusPill>
                  {task.kind === "reinspection" && (
                    <StatusPill tone="idle">{t("reinspection")}</StatusPill>
                  )}
                  <span className="text-[12px] uppercase tracking-[0.06em] text-ink-3">
                    {t(`lane.${task.service}`)}
                  </span>
                </div>

                <p className="text-[15px] font-semibold text-ink">{task.name}</p>
                <p className="text-[13px] text-ink-2">{task.where}</p>
                {/* The reason it has not moved. On a queue this is the row. */}
                {task.note && (
                  <p className="max-w-[70ch] text-[13px] leading-relaxed text-ink-3">
                    {task.note}
                  </p>
                )}
              </div>

              <dl className="flex flex-none flex-wrap gap-x-6 gap-y-1 text-[13px] sm:w-56 sm:flex-col sm:gap-1">
                <div className="flex gap-1.5">
                  <dt className="text-ink-3">{t("asked")}</dt>
                  <dd className="tnum text-ink-2">{day(task.requestedAt)}</dd>
                </div>
                {task.scheduledFor && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">{t("scheduled")}</dt>
                    <dd className="tnum text-ink-2">{day(task.scheduledFor)}</dd>
                  </div>
                )}
                {task.inspectorName && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">{t("inspector")}</dt>
                    <dd className="text-ink-2">{task.inspectorName}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------- guest asks ----- */}
      <section className="flex flex-col pt-2">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("asksTitle")}
        </h2>
        <p className="pt-1 max-w-[70ch] text-[13px] leading-relaxed text-ink-3">
          {t("asksNote")}
        </p>

        <ul className="flex flex-col pt-3">
          {requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-col gap-2 border-t border-line py-4 sm:flex-row sm:items-start sm:gap-6"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={REQUEST_TONE[request.status]}>
                    {t(`askStatus.${request.status}`)}
                  </StatusPill>
                  <span className="font-mono text-[12px] tracking-tight text-ink-3">
                    {referenceOf(request.bookingId)}
                  </span>
                </div>
                {/* In the guest's words. A category would lose the job. */}
                <p className="max-w-[70ch] text-[15px] leading-relaxed text-ink">
                  “{request.asked}”
                </p>
              </div>

              <dl className="flex flex-none flex-wrap gap-x-6 gap-y-1 text-[13px] sm:w-56 sm:flex-col sm:gap-1">
                <div className="flex gap-1.5">
                  <dt className="text-ink-3">{t("asked")}</dt>
                  <dd className="tnum text-ink-2">{day(request.requestedAt)}</dd>
                </div>
                {request.owner && (
                  <div className="flex gap-1.5">
                    <dt className="text-ink-3">{t("withWhom")}</dt>
                    <dd className="text-ink-2">{request.owner}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------- payouts ----- */}
      <section className="flex flex-col pt-2">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("payoutsTitle")}
        </h2>
        <p className="pt-1 max-w-[70ch] text-[13px] leading-relaxed text-ink-3">
          {t("payoutsNote")}
        </p>

        <ul className="flex flex-col pt-3">
          {payouts.map((payout) => (
            <li
              key={payout.id}
              className={cn(
                "flex items-center gap-4 border-t border-line py-3.5",
                payout.status === "paid" && "opacity-60",
              )}
            >
              <StatusPill tone={PAYOUT_TONE[payout.status]} className="flex-none">
                {t(`payoutStatus.${payout.status}`)}
              </StatusPill>

              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {payout.payee}
                </p>
                <p className="font-mono text-[12px] tracking-tight text-ink-3">
                  {referenceOf(payout.bookingId)}
                </p>
              </div>

              <p className="tnum hidden flex-none text-[13px] text-ink-2 sm:block">
                {payout.status === "paid"
                  ? t("paidOn", { date: day(payout.releaseOn) })
                  : t("releasesOn", { date: day(payout.releaseOn) })}
              </p>

              <MoneyText
                amount={payout.amount}
                className="flex-none text-[15px] font-bold text-ink"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------- every thread ----- */}
      <section className="flex flex-col pt-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {t("threadsTitle")}
          </h2>
          <Link
            href="/messages"
            className="rounded-ctl text-sm font-semibold text-brand hover:text-brand-deep"
          >
            {t("openMessages")}
          </Link>
        </div>

        <ul className="flex flex-col pt-3">
          {threads.map((thread) => (
            <li key={thread.id} className="border-t border-line">
              <Link
                href={`/messages?thread=${thread.id}`}
                className="flex items-center gap-4 py-3.5 transition-colors duration-150 hover:bg-surface-2"
              >
                {/* Unread first as a mark, not as bold text: on a list this
                    long, weight alone stops being a signal. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-2 flex-none rounded-full",
                    thread.unreadCount > 0 ? "bg-brand" : "bg-line",
                  )}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {thread.subject}
                  </p>
                  <p className="truncate text-[13px] text-ink-3">
                    {thread.participantNames.join(" · ")} —{" "}
                    {thread.lastMessagePreview}
                  </p>
                </div>
                <span className="tnum flex-none text-[12px] text-ink-3">
                  {formatStamp(thread.lastMessageAt, intlLocale)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="border-t border-line pt-5 text-[13px] leading-relaxed text-ink-3">
        {t("readOnlyNote")}
      </p>
    </div>
  );
}
