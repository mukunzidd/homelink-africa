import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { repos } from "@/lib/repos";
import { Link } from "@/i18n/navigation";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { StatusTone } from "@/components/ui/status-pill";
import type {
  AddOnRequest,
  Booking,
  AddOnRequestStatus,
  Conversation,
  Payout,
  PayoutStatus,
  VerificationTask,
  VerificationTaskStatus,
} from "@/lib/domain/types";
import { formatDate, formatDateRange } from "@/lib/domain/dates";
import { formatStamp } from "@/lib/domain/instants";
import { sum } from "@/lib/domain/money";
import { paginate, pageParam } from "@/lib/paginate";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { StatusPill } from "@/components/ui/status-pill";
import { MoneyText } from "@/components/ui/money-text";
import { TabStrip } from "@/components/ui/tab-strip";
import { Pager } from "@/components/ui/pager";
import { CheckIcon } from "@/components/ui/icons";
import { DisabledAction, QueueRow, RecordFact, RecordFacts } from "@/components/queue/queue-row";
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
 * They were four sections stacked on one scroll, which was fine at five rows
 * each and stopped being fine the moment the verification list held a real
 * week's work. They are tabs now, in the URL, so a section is addressable and
 * the browser's back button behaves. The counts in the header are links into
 * them: a number that tells you there are four things to verify and then
 * refuses to show you the four is furniture.
 *
 * Denser than the guest screens and deliberately so. A guest reads one booking
 * carefully; ops scans for the one that is stuck, so every row leads with its
 * state and carries the sentence explaining why it has not moved. That note is
 * the most-read text on a queue and the first thing an admin template leaves
 * out.
 *
 * Nothing here writes. Each row opens in place to its read-only record, and
 * the actions an ops tool eventually needs (schedule, publish, release) are
 * drawn there switched off, each with its reason beside it. A live-looking
 * "Release funds" that did nothing would be worse than no button; a disabled
 * one that says why shows where the action goes without pretending.
 */
const PER_PAGE = 8;

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

type TabKey = "verify" | "asks" | "payouts" | "threads";
const TAB_KEYS: TabKey[] = ["verify", "asks", "payouts", "threads"];

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string; open?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("queue");
  const tRoles = await getTranslations("roles");
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

  const sp = await searchParams;
  const tab: TabKey = TAB_KEYS.includes(sp.tab as TabKey)
    ? (sp.tab as TabKey)
    : "verify";
  const openOnly = sp.open === "1";

  const [tasks, requests, payouts, threads, bookings] = await Promise.all([
    repos().ops.verificationQueue(),
    repos().ops.addOnRequests(),
    repos().ops.payouts(),
    repos().messaging.forRole(role),
    repos().bookings.listForCurrentUser(),
  ]);

  const factsOf = (bookingId: string): BookingFacts => {
    const b = bookings.find((x) => x.id === bookingId);
    return b
      ? {
          reference: b.reference,
          title: b.title,
          dates: formatDateRange(b.startDate, b.endDate, intlLocale),
          service: b.service,
        }
      : { reference: bookingId };
  };

  // Who asked, by name. An ask carries no author, but the guest is named on
  // the thread for the same booking, so the record can say "Marie L." rather
  // than "the guest". Falls back to the plain phrase when no thread names one.
  const guestOn = (bookingId: string) => {
    const thread = threads.find(
      (c) => c.scope.kind === "booking" && c.scope.id === bookingId && c.participantRoles.includes("guest"),
    );
    return thread?.participantNames[thread.participantRoles.indexOf("guest")];
  };

  // "Open" means one thing per list and the same thing everywhere: still needs
  // a person. Keeping the predicates together is what lets one toggle serve all
  // four tabs without a switch statement in the markup.
  const isOpen = {
    verify: (x: VerificationTask) => x.status !== "published",
    asks: (x: AddOnRequest) => x.status === "open",
    payouts: (x: Payout) => x.status !== "paid",
    threads: (x: Conversation) => x.unreadCount > 0,
  };

  const openTasks = tasks.filter(isOpen.verify);
  const openRequests = requests.filter(isOpen.asks);
  const openPayouts = payouts.filter(isOpen.payouts);
  const waiting = threads.filter(isOpen.threads);
  const owed = sum(openPayouts.map((p) => p.amount), "RWF");

  // Paged per tab rather than over a union, so each branch keeps its own row
  // type all the way to its row component. A single `rows` array typed as the
  // union reads tidier and costs four casts at the point of rendering, which is
  // exactly where a cast is most likely to become wrong.
  const at = pageParam(sp.page);
  const view =
    tab === "verify"
      ? ({ tab, page: paginate(openOnly ? openTasks : tasks, at, PER_PAGE) } as const)
      : tab === "asks"
        ? ({ tab, page: paginate(openOnly ? openRequests : requests, at, PER_PAGE) } as const)
        : tab === "payouts"
          ? ({ tab, page: paginate(openOnly ? openPayouts : payouts, at, PER_PAGE) } as const)
          : ({ tab, page: paginate(openOnly ? waiting : threads, at, PER_PAGE) } as const);
  const page = view.page;

  /** A tab change resets the page; an open toggle does too. Both change what
   *  "page 3" even means, and landing on an empty page is a bug people blame
   *  on the data. */
  const hrefFor = (next: { tab?: TabKey; open?: boolean; page?: number }) => {
    const q = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    const nextOpen = next.open ?? openOnly;
    if (nextTab !== "verify") q.set("tab", nextTab);
    if (nextOpen) q.set("open", "1");
    if (next.page && next.page > 1) q.set("page", String(next.page));
    const qs = q.toString();
    return `/queue${qs ? `?${qs}` : ""}`;
  };

  const counts = { verify: tasks, asks: requests, payouts, threads };
  const openCounts = {
    verify: openTasks,
    asks: openRequests,
    payouts: openPayouts,
    threads: waiting,
  };

  const day = (iso: string) =>
    formatDate(iso, intlLocale, { day: "numeric", month: "short" });

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold leading-[1.06] tracking-tight text-ink sm:text-5xl">
          {t("title")}
        </h1>
        <p className="max-w-[62ch] text-[17px] leading-relaxed text-ink-2">
          {t("subtitle")}
        </p>
        {/* Admin borrows this screen until it has a journey of its own, and
            should not have to wonder why it is looking at the ops desk. */}
        {role === "admin" && (
          <p className="self-start rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-ink-2">
            {t("adminNote")}
          </p>
        )}
      </header>

      {/* Each number goes where it came from, with the open filter already on.
          These were static text, which is the tell of a dashboard nobody has
          tried to use. */}
      <dl className="flex flex-wrap items-end gap-x-8 gap-y-4 border-y border-line py-5">
        {(
          [
            { key: "verify", label: t("countVerify") },
            { key: "asks", label: t("countAsks") },
            { key: "threads", label: t("countReplies") },
          ] as const
        ).map((stat) => (
          <Link
            key={stat.key}
            href={hrefFor({ tab: stat.key, open: true })}
            className="group flex flex-col gap-0.5 rounded-ctl"
          >
            <dt className="text-[13px] text-ink-3 group-hover:text-ink-2">
              {stat.label}
            </dt>
            <dd className="tnum font-display text-3xl font-semibold text-ink underline-offset-4 group-hover:underline">
              {openCounts[stat.key].length}
            </dd>
          </Link>
        ))}
        <Link
          href={hrefFor({ tab: "payouts", open: true })}
          className="group flex flex-col gap-0.5 rounded-ctl"
        >
          <dt className="text-[13px] text-ink-3 group-hover:text-ink-2">
            {t("countOwed")}
          </dt>
          <dd className="underline-offset-4 group-hover:underline">
            <MoneyText
              amount={owed}
              className="font-display text-3xl font-semibold text-ink"
            />
          </dd>
        </Link>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabStrip
          label={t("tabsLabel")}
          active={tab}
          tabs={TAB_KEYS.map((key) => ({
            key,
            label: t(`tabs.${key}`),
            href: hrefFor({ tab: key }),
            // Open of total, whatever the toggle says. A bare total beside a
            // stat band counting open items read as two different queues
            // ("To verify 11" over "Verification 14"); with both numbers the
            // first one is always the stat, and the second says what the
            // toggle will add.
            count: t("tabCount", {
              open: openCounts[key].length,
              total: counts[key].length,
            }),
          }))}
          wrap
        />

        <Link
          href={hrefFor({ open: !openOnly })}
          aria-pressed={openOnly}
          className={cn(
            "rounded-ctl border px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150",
            openOnly
              ? "border-brand bg-brand-tint text-brand"
              : "border-line text-ink-2 hover:bg-surface-2 hover:text-ink",
          )}
        >
          {t("openOnly")}
        </Link>
      </div>

      <section className="flex flex-col">
        <p className="pb-1 text-[13px] leading-relaxed text-ink-3">
          {t(`note.${tab}`)}
        </p>

        {page.total === 0 ? (
          <p className="border-t border-line py-8 text-[15px] text-ink-2">
            {openOnly ? t("emptyOpen") : t("empty")}
          </p>
        ) : (
          <ul className="flex flex-col">
            {view.tab === "verify" &&
              view.page.items.map((task) => (
                <VerifyRow key={task.id} task={task} t={t} day={day} />
              ))}

            {view.tab === "asks" &&
              view.page.items.map((request) => (
                <AskRow
                  key={request.id}
                  request={request}
                  booking={factsOf(request.bookingId)}
                  askedBy={guestOn(request.bookingId)}
                  t={t}
                  tRoles={tRoles}
                  day={day}
                />
              ))}

            {view.tab === "payouts" &&
              view.page.items.map((payout) => (
                <PayoutRow
                  key={payout.id}
                  payout={payout}
                  booking={factsOf(payout.bookingId)}
                  t={t}
                  tRoles={tRoles}
                  day={day}
                />
              ))}

            {view.tab === "threads" &&
              view.page.items.map((thread) => (
                <ThreadRow key={thread.id} thread={thread} locale={intlLocale} />
              ))}
          </ul>
        )}

        <Pager page={page} hrefFor={(n) => hrefFor({ page: n })} className="mt-4" />
      </section>

      {/* One quiet line. Each switched-off action says why beside itself, so
          the page-level note only has to name the state. */}
      <p className="border-t border-line pt-5 text-[13px] text-ink-3">
        {t("readOnlyNote")}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- rows */

type T = Awaited<ReturnType<typeof getTranslations<"queue">>>;
type TRoles = Awaited<ReturnType<typeof getTranslations<"roles">>>;
type Day = (iso: string) => string;
/** What the queue knows about a booking: enough to name it in a record. */
type BookingFacts = { reference: string; title?: string; dates?: string; service?: Booking["service"] };

/**
 * The summary line of a row: state first, then what it is, then the dates on
 * the right. Spans styled as blocks, because it sits inside a `<summary>`.
 */
function SummaryLayout({
  main,
  side,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
}) {
  return (
    <span className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-6">
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">{main}</span>
      <span className="flex flex-none flex-wrap gap-x-6 gap-y-1 text-[13px] sm:w-56 sm:flex-col sm:gap-1">
        {side}
      </span>
    </span>
  );
}

function SideFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="flex gap-1.5">
      <span className="text-ink-3">{label}</span>
      <span className={cn("text-ink-2", mono ? "tnum" : "")}>{value}</span>
    </span>
  );
}

/** The four states a candidate passes through, in order. */
const VERIFY_STEPS: VerificationTaskStatus[] = ["requested", "scheduled", "inspected", "published"];

function VerifyRow({ task, t, day }: { task: VerificationTask; t: T; day: Day }) {
  const reached = VERIFY_STEPS.indexOf(task.status);
  // The date each step is known by, where the fixture has one. A step with no
  // date is shown as reached without inventing when.
  const stepDate: Partial<Record<VerificationTaskStatus, string>> = {
    requested: task.requestedAt,
    scheduled: task.scheduledFor,
  };
  const action =
    task.status === "requested"
      ? "schedule"
      : task.status === "scheduled"
        ? "reschedule"
        : task.status === "inspected"
          ? "publish"
          : null;

  return (
    <QueueRow
      muted={task.status === "published"}
      summary={
        <SummaryLayout
          main={
            <>
              <span className="flex flex-wrap items-center gap-2">
                <StatusPill tone={VERIFY_TONE[task.status]}>
                  {t(`verifyStatus.${task.status}`)}
                </StatusPill>
                {task.kind === "reinspection" && (
                  <StatusPill tone="idle">{t("reinspection")}</StatusPill>
                )}
                <span className="text-[12px] text-ink-3">{t(`lane.${task.service}`)}</span>
              </span>
              <span className="text-[15px] font-semibold text-ink">{task.name}</span>
              <span className="text-[13px] text-ink-2">{task.where}</span>
              {/* The reason it has not moved. On a queue this is the row. */}
              {task.note && (
                <span className="max-w-[70ch] text-[13px] leading-relaxed text-ink-3">
                  {task.note}
                </span>
              )}
            </>
          }
          side={
            <>
              <SideFact label={t("asked")} value={day(task.requestedAt)} mono />
              {task.scheduledFor && (
                <SideFact label={t("scheduled")} value={day(task.scheduledFor)} mono />
              )}
              {task.inspectorName && (
                <SideFact label={t("inspector")} value={task.inspectorName} />
              )}
            </>
          }
        />
      }
    >
      <RecordFacts>
        <RecordFact label={t("record.what")}>
          {t(`record.kind.${task.kind}`)} · {t(`lane.${task.service}`)}
        </RecordFact>
        <RecordFact label={t("record.requested")}>{day(task.requestedAt)}</RecordFact>
        <RecordFact label={t("scheduled")}>
          {task.scheduledFor ? day(task.scheduledFor) : t("record.noVisit")}
        </RecordFact>
        <RecordFact label={t("inspector")}>
          {task.inspectorName ?? t("record.noInspector")}
        </RecordFact>
      </RecordFacts>

      <div className="flex flex-col gap-2">
        <h3 className="text-[12px] font-medium text-ink-3">{t("record.history")}</h3>
        <ol className="flex flex-col gap-1.5">
          {VERIFY_STEPS.map((step, i) => {
            const done = i <= reached;
            const date = stepDate[step];
            return (
              <li
                key={step}
                className={cn("flex items-center gap-2.5 text-[14px]", done ? "text-ink" : "text-ink-3")}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-4 flex-none place-items-center rounded-full border",
                    done ? "border-ok bg-ok text-surface" : "border-line",
                  )}
                >
                  {done && <CheckIcon size={10} />}
                </span>
                <span>{t(`record.step.${step}`)}</span>
                {date && done && <span className="tnum text-[13px] text-ink-3">{day(date)}</span>}
                <span className="sr-only">{done ? t("record.done") : t("record.notYet")}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {action && (
        <DisabledAction label={t(`record.action.${action}`)} reason={t(`record.actionOff.${action}`)} />
      )}
    </QueueRow>
  );
}

function AskRow({
  request,
  booking,
  askedBy,
  t,
  tRoles,
  day,
}: {
  request: AddOnRequest;
  booking: BookingFacts;
  /** The guest's name, from the thread on the same booking, when there is one. */
  askedBy?: string;
  t: T;
  tRoles: TRoles;
  day: Day;
}) {
  const action = request.status === "open" ? "assign" : request.status === "quoted" ? "arrange" : null;

  return (
    <QueueRow
      summary={
        <SummaryLayout
          main={
            <>
              <span className="flex flex-wrap items-center gap-2">
                <StatusPill tone={REQUEST_TONE[request.status]}>
                  {t(`askStatus.${request.status}`)}
                </StatusPill>
                <span className="font-mono text-[12px] text-ink-3">{booking.reference}</span>
              </span>
              {/* In the guest's words. A category would lose the job. */}
              <span className="max-w-[70ch] text-[15px] leading-relaxed text-ink">
                “{request.asked}”
              </span>
            </>
          }
          side={
            <>
              <SideFact label={t("asked")} value={day(request.requestedAt)} mono />
              {request.owner && <SideFact label={t("withWhom")} value={request.owner} />}
            </>
          }
        />
      }
    >
      <RecordFacts>
        <RecordFact label={t("record.askedBy")}>
          {askedBy ? t("record.nameRole", { name: askedBy, role: tRoles("guest") }) : t("record.theGuest")}
        </RecordFact>
        <RecordFact label={t("record.requested")}>{day(request.requestedAt)}</RecordFact>
        <RecordFact label={t("withWhom")}>{request.owner ?? t("record.nobody")}</RecordFact>
        <RecordFact label={t("record.booking")}>
          <span className="font-mono text-[13px]">{booking.reference}</span>
          {booking.title && <span className="block text-ink-2">{booking.title}</span>}
        </RecordFact>
        {booking.dates && <RecordFact label={t("record.dates")}>{booking.dates}</RecordFact>}
      </RecordFacts>

      {action && (
        <DisabledAction label={t(`record.action.${action}`)} reason={t(`record.actionOff.${action}`)} />
      )}
    </QueueRow>
  );
}

/**
 * HomeLink hosts every home itself, so a stay pays nobody outside; only
 * partners who drive or guide are paid out. A stay payout here would be the
 * company paying itself.
 */
const PAYEE_ROLE = { car: "driver", experience: "guide" } as const;

function PayoutRow({
  payout,
  booking,
  t,
  tRoles,
  day,
}: {
  payout: Payout;
  booking: BookingFacts;
  t: T;
  tRoles: TRoles;
  day: Day;
}) {
  const when =
    payout.status === "paid"
      ? t("paidOn", { date: day(payout.releaseOn) })
      : t("releasesOn", { date: day(payout.releaseOn) });

  return (
    <QueueRow
      muted={payout.status === "paid"}
      summary={
        <span className="flex items-center gap-4">
          <StatusPill tone={PAYOUT_TONE[payout.status]} className="flex-none">
            {t(`payoutStatus.${payout.status}`)}
          </StatusPill>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[15px] font-semibold text-ink">{payout.payee}</span>
            <span className="font-mono text-[12px] text-ink-3">{booking.reference}</span>
          </span>
          <span className="tnum hidden flex-none text-[13px] text-ink-2 sm:block">{when}</span>
          <MoneyText amount={payout.amount} className="flex-none text-[15px] font-semibold text-ink" />
        </span>
      }
    >
      <RecordFacts>
        <RecordFact label={t("record.amount")}>
          <MoneyText amount={payout.amount} className="font-semibold" />
        </RecordFact>
        <RecordFact label={t("record.recipient")}>
          {booking.service && booking.service !== "stay"
            ? t("record.nameRole", { name: payout.payee, role: tRoles(PAYEE_ROLE[booking.service]) })
            : payout.payee}
        </RecordFact>
        <RecordFact label={t("record.booking")}>
          <span className="font-mono text-[13px]">{booking.reference}</span>
          {booking.title && <span className="block text-ink-2">{booking.title}</span>}
        </RecordFact>
        {booking.dates && <RecordFact label={t("record.dates")}>{booking.dates}</RecordFact>}
        <RecordFact label={t(`record.why.${payout.status}`)}>
          {t(`record.because.${payout.status}`, { date: day(payout.releaseOn) })}
        </RecordFact>
      </RecordFacts>

      {payout.status !== "paid" && (
        <DisabledAction label={t("record.action.release")} reason={t("record.actionOff.release")} />
      )}
    </QueueRow>
  );
}

function ThreadRow({
  thread,
  locale,
}: {
  thread: Conversation;
  locale: string;
}) {
  return (
    <li className="border-t border-line">
      <Link
        href={`/messages?thread=${thread.id}`}
        className="flex items-center gap-4 py-3.5 transition-colors duration-150 hover:bg-surface-2"
      >
        {/* Unread first as a mark, not as bold text: on a list this long,
            weight alone stops being a signal. */}
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
            {thread.participantNames.join(" · ")} · {thread.lastMessagePreview}
          </p>
        </div>
        <span className="tnum flex-none text-[12px] text-ink-3">
          {formatStamp(thread.lastMessageAt, locale)}
        </span>
      </Link>
    </li>
  );
}
