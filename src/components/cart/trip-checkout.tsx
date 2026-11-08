"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Experience, Listing, PaymentRail, Vehicle } from "@/lib/domain/types";
import type { Quote } from "@/lib/domain/pricing";
import { convert, money } from "@/lib/domain/money";
import { useCart } from "@/lib/cart";
import { kigaliDay } from "@/lib/domain/instants";
import { cartBlocked, type CartItem } from "@/lib/cart-checks";
import { draftReducer, newDraft, stepComplete, type BookingDraft, type DraftAction } from "@/lib/booking/draft";
import { usePreferences } from "@/lib/preferences/context";
import { placeTrip } from "@/app/actions/trips";
import { useToast } from "@/components/notifications/toaster";
import { DetailsStep } from "@/components/booking/steps/details-step";
import { DriverStep } from "@/components/booking/steps/driver-step";
import { PeopleStep } from "@/components/booking/steps/people-step";
import { PayStep } from "@/components/booking/steps/pay-step";
import { StepSection } from "@/components/booking/fields";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type Step = "details" | "parts" | "review" | "pay";
const STEPS: Step[] = ["details", "parts", "review", "pay"];

const flowOf = (i: CartItem) => (i.kind === "stay" ? "stay" : i.kind === "car" ? "car" : "experience") as BookingDraft["flow"];

/**
 * One checkout for the whole trip: details once, then only what some parts
 * need (who is on each day out, a licence for a car you drive), one review
 * of every part's rules, one payment.
 *
 * Each part becomes its own booking, with its own reference and its own
 * cancellation rules; the server places them all or none.
 */
export function TripCheckout() {
  const t = useTranslations("cart");
  const tb = useTranslations("booking");
  const { fx, role, setRole } = usePreferences();
  const cart = useCart();
  const router = useRouter();
  const toast = useToast();
  const open = cart.items.filter((i) => !i.bookedReference);
  const first = open.map((i) => i.start).sort()[0] ?? kigaliDay();
  const last = open.map((i) => i.end).sort().at(-1) ?? first;

  const [step, setStep] = useState<Step>("details");
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guest, setGuest] = useState<BookingDraft>(() =>
    newDraft({ flow: "trip", slug: "trip", start: first, end: last, party: 1 }, new Date()),
  );
  const [parts, setParts] = useState<Record<string, BookingDraft>>({});
  const partDraft = (i: CartItem): BookingDraft =>
    parts[i.id] ??
    ({
      ...newDraft({ flow: flowOf(i), slug: i.slug, start: i.start, end: i.end, party: i.party }, new Date()),
      ...(i.driveMode ? { driveMode: i.driveMode } : {}),
    } as BookingDraft);
  const dispatchFor = (i: CartItem) => (a: DraftAction) =>
    setParts((p) => ({ ...p, [i.id]: draftReducer(p[i.id] ?? partDraft(i), a) }));
  const guestDispatch = (a: DraftAction) => setGuest((g) => draftReducer(g, a));

  const needs = open.filter((i) => i.kind !== "stay");
  const partOk = (i: CartItem) => {
    const d = partDraft(i);
    if (i.kind === "car") return stepComplete(d, "driver");
    const e = i.supply as Experience | undefined;
    return stepComplete(d, "people", { minAge: e?.minAge ?? 0, requiresPermit: !!e?.requiresPermit });
  };

  const done: Record<Step, boolean> = {
    details: stepComplete(guest, "details"),
    parts: needs.every(partOk),
    review: guest.acceptedRules,
    pay: false,
  };

  // One payment for the sum, in RWF, the currency it is charged in.
  const combined: Quote = useMemo(() => {
    const lines = open.map((i) => ({ key: "accommodation" as const, amount: convert(i.quote.total, "RWF", fx) }));
    return { nights: 0, lines, total: money(lines.reduce((n, l) => n + l.amount.minor, 0), "RWF"), escrowHeld: false };
  }, [open, fx]);

  function next() {
    if (!done[step]) {
      setAttempted(true);
      window.setTimeout(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus(), 0);
      return;
    }
    setAttempted(false);
    setStep(STEPS[STEPS.indexOf(step) + 1]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay(rail: PaymentRail) {
    setBusy(true);
    setError(null);
    const drafts = open.map((i) => {
      const base = partDraft(i);
      return { ...base, guest: guest.guest, acceptedRules: true, rail };
    });
    const r = await placeTrip({
      drafts,
      clientTotal: { minor: combined.total.minor, currency: "RWF" },
      payment: { rail, outcome: "approved" },
      bookedReferences: cart.items.filter((i) => i.bookedReference).map((i) => i.bookedReference!),
    });
    setBusy(false);
    if (r.ok) {
      cart.disable();
      if (role === "visitor") setRole("guest");
      toast.show({ title: t("booked_toast", { count: r.bookings.length }), tone: "ok" });
      router.push("/trips");
      router.refresh();
    } else {
      const bad = r.failed[0];
      setError(t("failed", { name: bad && bad.index >= 0 ? open[bad.index]?.title ?? "" : "" }));
      setStep("review");
    }
  }

  if (!open.length || cartBlocked(cart.items, kigaliDay())) {
    return <p className="text-[15px] text-ink-2">{t("blocked")}</p>;
  }

  const index = STEPS.indexOf(step);
  const label = (s: Step) => (s === "parts" ? t("stepItems") : tb(`steps.${s}`));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-semibold text-ink">{label(step)}</span>
          <span className="tnum text-ink-3">{tb("stepOf", { current: index + 1, total: STEPS.length })}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-card border border-crit/40 bg-crit-tint px-5 py-4 text-[14px] text-crit">
          {error}
        </p>
      )}

      {step === "details" && <DetailsStep draft={guest} dispatch={guestDispatch} attempted={attempted} flow="trip" signInHref="/sign-in?next=/trip/checkout" />}

      {step === "parts" && (
        <div className="flex flex-col gap-6">
          <p className="max-w-[62ch] text-[15px] text-ink-2">{t("stepItemsBody")}</p>
          {open.map((i) => (
            <section key={i.id} className="flex flex-col gap-3">
              <h2 className="text-[17px] font-semibold text-ink">{i.title}</h2>
              {i.kind === "car" && i.supply ? (
                <DriverStep draft={partDraft(i)} dispatch={dispatchFor(i)} attempted={attempted} vehicle={i.supply as Vehicle} initialMode={i.driveMode ?? "withDriver"} />
              ) : i.kind === "experience" && i.supply ? (
                <PeopleStep draft={{ ...partDraft(i), guest: guest.guest }} dispatch={dispatchFor(i)} attempted={attempted} experience={i.supply as Experience} />
              ) : (
                <p className="rounded-card border border-line bg-surface px-5 py-4 text-[14px] text-ink-3">{t("nothingNeeded")}</p>
              )}
            </section>
          ))}
        </div>
      )}

      {step === "review" && (
        <StepSection title={t("reviewItems")}>
          {open.map((i) => {
            const rules = (i.supply as Listing | undefined)?.houseRules ?? (i.supply as Vehicle | Experience | undefined)?.rules ?? [];
            return (
              <div key={i.id} className="flex flex-col gap-2 border-t border-line-soft pt-3 first:border-0 first:pt-0">
                <p className="text-[15px] font-semibold text-ink">{i.title}</p>
                <ul className="flex flex-col gap-1">
                  {rules.map((r) => (
                    <li key={r} className="flex gap-2 text-[13.5px] text-ink-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 flex-none rounded-full bg-ink-3" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <label
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl border px-4 py-2.5 text-[15px] font-medium",
              guest.acceptedRules ? "border-brand bg-brand-tint text-brand-deep" : attempted ? "border-crit" : "border-line",
            )}
          >
            <input
              type="checkbox"
              checked={guest.acceptedRules}
              aria-invalid={attempted && !guest.acceptedRules}
              onChange={(e) => guestDispatch({ type: "acceptRules", value: e.target.checked })}
              className="size-5 cursor-pointer accent-[var(--brand)]"
            />
            {t("rulesAll")}
          </label>
        </StepSection>
      )}

      {step === "pay" && (
        <PayStep draft={guest} dispatch={guestDispatch} quote={combined} plan={{ offered: false }} rails={["card", "mobileMoney"]} onApproved={pay} busy={busy} />
      )}

      <div className="flex items-center justify-between gap-3">
        {index > 0 ? (
          <button type="button" onClick={() => setStep(STEPS[index - 1])} className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-ctl px-3 text-[15px] font-semibold text-ink-2 hover:bg-surface-2">
            <ChevronLeftIcon size={16} />
            {tb("back")}
          </button>
        ) : (
          <span />
        )}
        {step !== "pay" && (
          <button type="button" onClick={next} className="min-h-12 cursor-pointer rounded-ctl bg-brand px-6 text-[16px] font-semibold text-on-brand hover:bg-brand-deep">
            {tb("continueTo", { step: label(STEPS[index + 1]) })}
          </button>
        )}
      </div>
    </div>
  );
}
