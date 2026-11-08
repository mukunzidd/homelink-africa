"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { PaymentRail } from "@/lib/domain/types";
import type { Quote } from "@/lib/domain/pricing";
import { quoteBooking, toDisplayQuote } from "@/lib/domain/pricing";
import { depositPlan } from "@/lib/domain/payment-plan";
import { kigaliDay } from "@/lib/domain/instants";
import { monthsBetween } from "@/lib/domain/dates";
import {
  STEPS,
  canEnter,
  firstIncompleteStep,
  stepComplete,
  type FlowKind,
  type PeopleRules,
  type StepKey,
} from "@/lib/booking/draft";
import { useBookingDraft } from "@/lib/booking/use-draft";
import { placeBooking } from "@/app/actions/bookings";
import { usePreferences } from "@/lib/preferences/context";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/notifications/toaster";
import { ChevronLeftIcon, ClockIcon } from "@/components/ui/icons";
import { FlowSpine } from "./flow-spine";
import { FlowSummary, FlowSummaryBar } from "./flow-summary";
import { DetailsStep } from "./steps/details-step";
import { ExtrasStep } from "./steps/extras-step";
import { ReviewStep } from "./steps/review-step";
import { PayStep } from "./steps/pay-step";
import type { FlowSupply, FlowText } from "./types";

export type LaneStepRenderer = (args: {
  step: StepKey;
  draft: ReturnType<typeof useBookingDraft>[0];
  dispatch: ReturnType<typeof useBookingDraft>[1];
  attempted: boolean;
}) => ReactNode | null;

/**
 * The booking flow's frame, shared by every lane.
 *
 * The step lives in the URL (`?step=`) so the back button, a refresh and a
 * shared link all land on the same screen; the answers live in the draft.
 * Opening a step whose earlier steps are not done goes to the first one
 * that is not, rather than showing a form that cannot be submitted.
 *
 * The price is worked out here from the same function the server runs, so
 * the summary moves the moment an extra or a promo changes it. The server
 * still prices it again when the booking is placed.
 */
export function FlowShell({
  flow,
  init,
  supply,
  text,
  houseRules,
  rulesLane = "stay",
  people,
  rails,
  escrow,
  laneStep,
  signInHref,
}: {
  flow: FlowKind;
  init: { slug: string; start: string; end: string; party: number };
  supply: FlowSupply;
  text: FlowText;
  houseRules: string[];
  /** Which heading the rules get: a home's house rules, a hire's, a day's. */
  rulesLane?: "stay" | "car" | "experience";
  people?: PeopleRules;
  rails: PaymentRail[];
  escrow?: { title: string; body: string };
  /** Steps only this lane has (driver, people, application, agreement). */
  laneStep?: LaneStepRenderer;
  signInHref: string;
}) {
  const t = useTranslations("booking");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const { fx, currency, role, setRole } = usePreferences();
  const [draft, dispatch, { restored, reset }] = useBookingDraft({ flow, ...init });
  const steps = STEPS[flow];

  const asked = params.get("step") as StepKey | null;
  const step: StepKey = asked && steps.includes(asked) ? asked : steps[0];

  const [attempted, setAttempted] = useState(false);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<null | "datesTaken" | "invalid" | { priceChanged: Quote }>(null);
  const top = useRef<HTMLDivElement>(null);

  const quote = useMemo(
    () =>
      quoteBooking(
        supply.item,
        {
          kind: supply.kind,
          start: draft.start,
          end: supply.kind === "experience" ? draft.start : draft.end,
          party: draft.party,
          driveMode: draft.driveMode,
          extras: draft.extras,
          promoCode: draft.promoCode,
          ...(flow === "rent" ? { rentMonths: monthsBetween(draft.start, draft.end) } : {}),
        },
        kigaliDay(),
      ),
    [supply, flow, draft.start, draft.end, draft.party, draft.driveMode, draft.extras, draft.promoCode],
  );
  const plan = useMemo(
    () => (quote ? depositPlan(quote, draft.start, kigaliDay(), fx) : ({ offered: false } as const)),
    [quote, draft.start, fx],
  );

  const go = useCallback(
    (next: StepKey) => {
      const q = new URLSearchParams(params.toString());
      q.set("step", next);
      router.push(`${pathname}?${q.toString()}`, { scroll: false });
      setAttempted(false);
      top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [params, pathname, router],
  );

  // A step whose earlier steps are not done sends you to the first that is not.
  useEffect(() => {
    if (!restored) return;
    if (!canEnter(draft, step, people)) {
      const q = new URLSearchParams(params.toString());
      q.set("step", firstIncompleteStep(draft, people));
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    }
    // Only on arrival at a step, not on every keystroke inside it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, step]);

  const onExpire = useCallback(() => setExpired(true), []);
  const index = steps.indexOf(step);
  const nextStep = steps[index + 1];

  function next() {
    if (!stepComplete(draft, step, people)) {
      setAttempted(true);
      // Straight to the first field with a problem.
      window.setTimeout(() => {
        const bad = document.querySelector<HTMLElement>("[aria-invalid='true']");
        bad?.focus();
        bad?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    if (nextStep) go(nextStep);
  }

  async function approved(rail: PaymentRail) {
    if (!quote) return;
    setBusy(true);
    const result = await placeBooking({ draft, clientTotal: quote.total, payment: { rail, outcome: "approved" } });
    setBusy(false);
    if (result.ok) {
      reset();
      // The server signed the preview in as the guest; the header reads the
      // role from the browser's copy, so it has to hear about it too.
      if (role === "visitor") setRole("guest");
      toast.show({ title: t("booked", { ref: result.booking.reference }), tone: "ok" });
      router.push(`/bookings/${result.booking.reference}`);
      router.refresh();
    } else if (result.reason === "unavailable") setOutcome("datesTaken");
    else if (result.reason === "priceChanged" && result.quote) setOutcome({ priceChanged: result.quote });
    else setOutcome("invalid");
  }

  async function checkAgain() {
    dispatch({ type: "restartHold", at: new Date().toISOString() });
    setExpired(false);
  }

  const unitRate =
    supply.kind === "stay" ? supply.item.nightlyRate : supply.kind === "car" ? supply.item.dailyRate : supply.item.pricePerPerson;
  const units = supply.kind === "experience" ? draft.party : (quote?.nights ?? 0);
  const summaryProps = { text, quote, unitRate, units, holdStartedAt: draft.holdStartedAt, onExpire };

  let body: ReactNode = null;
  if (expired) {
    body = (
      <section className="flex flex-col items-start gap-4 rounded-card border border-warn/40 bg-warn-tint/50 p-6">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-surface text-warn">
          <ClockIcon size={20} />
        </span>
        <h2 className="font-display text-2xl font-semibold text-ink">{t("hold.expiredTitle")}</h2>
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{t("hold.expiredBody")}</p>
        <button type="button" onClick={checkAgain} className="min-h-11 cursor-pointer rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
          {t("hold.checkAgain")}
        </button>
      </section>
    );
  } else if (outcome === "datesTaken") {
    body = (
      <section role="alert" className="flex flex-col items-start gap-4 rounded-card border border-crit/40 bg-crit-tint/60 p-6">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("states.datesTakenTitle")}</h2>
        <p className="max-w-[56ch] text-[15px] leading-relaxed text-ink-2">{t("states.datesTakenBody", { name: text.title })}</p>
        <button type="button" onClick={() => { reset(); router.push(text.changeHref); }} className="min-h-11 cursor-pointer rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
          {t("states.pickNewDates")}
        </button>
      </section>
    );
  } else if (step === "details") {
    body = <DetailsStep draft={draft} dispatch={dispatch} attempted={attempted} flow={flow} signInHref={signInHref} />;
  } else if (step === "extras") {
    body = <ExtrasStep draft={draft} dispatch={dispatch} lane={supply.kind} />;
  } else if (step === "review") {
    body = (
      <ReviewStep draft={draft} dispatch={dispatch} text={text} quote={quote} houseRules={houseRules} rulesLane={rulesLane} attempted={attempted} onEdit={go} editable={steps} />
    );
  } else if (step === "pay" && quote) {
    body = (
      <PayStep draft={draft} dispatch={dispatch} quote={quote} plan={plan} depositDue={text.depositDue} rails={rails} escrowBody={quote.escrowHeld ? escrow : undefined} onApproved={approved} busy={busy} />
    );
  } else {
    body = laneStep?.({ step, draft, dispatch, attempted }) ?? null;
  }

  const showNav = !expired && outcome !== "datesTaken" && step !== "pay";
  const shownTotal = quote ? toDisplayQuote(quote, currency, fx).total : null;
  const { display } = usePreferences();

  return (
    <div ref={top} className="flex scroll-mt-24 flex-col gap-6">
      <FlowSpine steps={steps} current={step} isDone={(s) => stepComplete(draft, s, people)} onGo={go} />
      <FlowSummaryBar {...summaryProps} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* The step mounts only once the stored draft has loaded. Mounted
              earlier, a step's own defaults (the first participant's name,
              the meeting point) were written to a fresh draft and then
              replaced by the stored one: React runs a child's effects before
              its parent's. */}
          {restored ? (
            <div className="animate-[fade_160ms_ease-out]">{body}</div>
          ) : (
            <div aria-busy="true" className="flex flex-col gap-4">
              <div className="h-40 animate-pulse rounded-card bg-surface-2" />
              <div className="h-64 animate-pulse rounded-card bg-surface-2" />
            </div>
          )}

          {showNav && (
            <div className="hidden items-center justify-between gap-3 lg:flex">
              {index > 0 ? (
                <button type="button" onClick={() => go(steps[index - 1])} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-ctl px-3 text-[15px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink">
                  <ChevronLeftIcon size={16} />
                  {t("back")}
                </button>
              ) : (
                <span />
              )}
              <button type="button" onClick={next} className="min-h-12 cursor-pointer rounded-ctl bg-brand px-6 text-[16px] font-semibold text-on-brand hover:bg-brand-deep">
                {nextStep ? t("continueTo", { step: t(`steps.${nextStep}`) }) : t("continue")}
              </button>
            </div>
          )}
          {step === "pay" && index > 0 && !expired && (
            <button type="button" onClick={() => go(steps[index - 1])} className="inline-flex min-h-11 cursor-pointer items-center gap-1 self-start rounded-ctl px-3 text-[15px] font-semibold text-ink-2 hover:bg-surface-2 hover:text-ink">
              <ChevronLeftIcon size={16} />
              {t("back")}
            </button>
          )}
        </div>

        <div className="hidden lg:sticky lg:top-[calc(var(--header-offset)+24px)] lg:block">
          <FlowSummary {...summaryProps} />
        </div>
      </div>

      {/* Phone: the next step sits under the thumb, with the running total. */}
      {showNav && (
        <>
          <div aria-hidden="true" className="h-20 lg:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-surface/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
            {index > 0 && (
              <button type="button" onClick={() => go(steps[index - 1])} aria-label={t("back")} className="grid size-11 flex-none cursor-pointer place-items-center rounded-ctl border border-line text-ink-2">
                <ChevronLeftIcon size={18} />
              </button>
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[12px] text-ink-3">{t("summary.total")}</span>
              <span className="tnum truncate text-[16px] font-semibold text-ink">{shownTotal ? display(shownTotal) : ""}</span>
            </div>
            <button type="button" onClick={next} className="min-h-11 flex-none cursor-pointer rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand">
              {nextStep ? t("continueTo", { step: t(`steps.${nextStep}`) }) : t("continue")}
            </button>
          </div>
        </>
      )}

      <Dialog
        open={typeof outcome === "object" && outcome !== null}
        onClose={() => setOutcome(null)}
        title={t("states.priceChangedTitle")}
        description={
          typeof outcome === "object" && outcome && quote
            ? t("states.priceChangedBody", {
                next: display(toDisplayQuote(outcome.priceChanged, currency, fx).total),
                previous: display(toDisplayQuote(quote, currency, fx).total),
              })
            : ""
        }
        footer={
          <button type="button" onClick={() => { setOutcome(null); router.refresh(); }} className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
            {t("states.payNew")}
          </button>
        }
      />
      <Dialog
        open={outcome === "invalid"}
        onClose={() => setOutcome(null)}
        title={t("states.invalidTitle")}
        description={t("states.invalidBody")}
        footer={
          <button type="button" onClick={() => { setOutcome(null); go(steps[0]); }} className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
            {t("back")}
          </button>
        }
      />
    </div>
  );
}
