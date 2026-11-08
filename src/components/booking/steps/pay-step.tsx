"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingDraft, DraftAction } from "@/lib/booking/draft";
import type { Quote } from "@/lib/domain/pricing";
import type { PaymentRail } from "@/lib/domain/types";
import type { DepositPlan } from "@/lib/domain/payment-plan";
import { toDisplayQuote } from "@/lib/domain/pricing";
import { FORMAT, VALID, type FieldId } from "@/lib/booking/validation";
import {
  MOMO_WAIT_SECONDS,
  cardOutcome,
  momoOutcome,
  momoProvider,
} from "@/lib/booking/payment-sim";
import { usePreferences } from "@/lib/preferences/context";
import { Dialog } from "@/components/ui/dialog";
import { BanknoteIcon, ShieldIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { ChoiceCards, Field, StepSection, TextInput } from "../fields";
import { cn } from "@/lib/cn";

type Phase = "form" | "processing" | "challenge" | "momoWait" | "declined" | "momoTimeout" | "momoDeclined";

const CARD: FieldId[] = ["card-number", "card-name", "card-expiry", "card-cvc"];

/**
 * Taking the money, and every way that can go.
 *
 * The button names the exact amount. A declined card, a bank's extra check
 * and a phone prompt that times out are each shown where the person is
 * looking, with what to do next and the line that matters most after a
 * failure: nothing was charged. The test numbers that produce each case are
 * printed under the button, because this is a preview and someone should be
 * able to see all of them.
 */
export function PayStep({
  draft,
  dispatch,
  quote,
  plan,
  depositDue,
  rails,
  escrowBody,
  onApproved,
  busy,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  quote: Quote;
  plan: DepositPlan;
  depositDue?: string;
  rails: PaymentRail[];
  escrowBody?: { title: string; body: string };
  /** Payment approved: the shell places the booking. */
  onApproved: (rail: PaymentRail) => void;
  busy: boolean;
}) {
  const t = useTranslations("booking.pay");
  const tm = useTranslations("booking.momo");
  const t3 = useTranslations("booking.threeDs");
  const tc = useTranslations("checkout");
  const tv = useTranslations("verification");
  const { display, currency, fx } = usePreferences();

  const [phase, setPhase] = useState<Phase>("form");
  const [values, setValues] = useState<Record<FieldId, string>>({
    "guest-name": "", "guest-email": "", "guest-phone": "",
    "card-number": "", "card-name": draft.guest.name ?? "", "card-expiry": "", "card-cvc": "",
    "momo-number": draft.guest.phone ?? "",
  });
  const [attempted, setAttempted] = useState(false);
  const [code, setCode] = useState("");
  const [codeTried, setCodeTried] = useState(false);
  const [left, setLeft] = useState(MOMO_WAIT_SECONDS);
  const alertRef = useRef<HTMLDivElement>(null);

  const rail = draft.rail;
  const useDeposit = plan.offered && draft.plan === "deposit";
  const dueNow = useDeposit && plan.offered ? plan.now : quote.total;
  const shownDue = useDeposit ? display(dueNow) : display(toDisplayQuote(quote, currency, fx).total);
  const active: FieldId[] = rail === "card" ? CARD : rail === "mobileMoney" ? ["momo-number"] : [];
  const invalid = active.filter((id) => !VALID[id](values[id]));
  const provider = momoProvider(values["momo-number"]);

  // The Mobile Money countdown.
  useEffect(() => {
    if (phase !== "momoWait") return;
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setPhase("momoTimeout");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // The stored draft arrives a moment after the first render (after a
  // refresh, say); fill the name on the card and the Mobile Money number
  // from it then, without overwriting anything already typed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues((v) => ({
      ...v,
      "card-name": v["card-name"] || draft.guest.name || "",
      "momo-number": v["momo-number"] || draft.guest.phone || "",
    }));
  }, [draft.guest.name, draft.guest.phone]);

  // A failure is announced where the person is looking. They pressed Pay at
  // the bottom of the step; the message sits at the top, so it is brought
  // into view and given focus rather than left to be found.
  useEffect(() => {
    if (phase === "declined" || phase === "momoTimeout" || phase === "momoDeclined") {
      alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      alertRef.current?.focus({ preventScroll: true });
    }
  }, [phase]);

  function set(id: FieldId, raw: string) {
    setValues((v) => ({ ...v, [id]: FORMAT[id]?.(raw) ?? raw }));
  }

  function submit() {
    setAttempted(true);
    if (invalid.length) {
      document.getElementById(invalid[0])?.focus();
      return;
    }
    if (rail === "mobileMoney") {
      setLeft(MOMO_WAIT_SECONDS);
      setPhase("momoWait");
      return;
    }
    if (rail === "bankTransfer") {
      onApproved("bankTransfer");
      return;
    }
    setPhase("processing");
    // A short pause, as a real authorisation takes; instant success reads as fake.
    window.setTimeout(() => {
      const outcome = cardOutcome(values["card-number"]);
      if (outcome === "approved") onApproved("card");
      else if (outcome === "challenge") setPhase("challenge");
      else setPhase("declined");
    }, 900);
  }

  function momoApproved() {
    const outcome = momoOutcome(values["momo-number"]);
    if (outcome === "approved") onApproved("mobileMoney");
    else setPhase(outcome === "declined" ? "momoDeclined" : "momoTimeout");
  }

  const working = busy || phase === "processing";
  const err = (id: FieldId, msg: string) => attempted && invalid.includes(id) && msg;

  // Waiting on the phone replaces the form: there is nothing else to do.
  if (phase === "momoWait") {
    const pct = (left / MOMO_WAIT_SECONDS) * 100;
    return (
      <StepSection title={tm("waitTitle")}>
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="relative grid size-28 place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--line)" strokeWidth="6" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="var(--brand)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={(2 * Math.PI * 44 * (100 - pct)) / 100}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <span className="tnum text-[26px] font-semibold text-ink">{left}</span>
          </div>
          <p className="max-w-[44ch] text-[15px] leading-relaxed text-ink-2">
            {tm("waitBody", {
              provider: provider === "airtel" ? "Airtel" : "MTN",
              amount: shownDue,
              number: values["momo-number"],
            })}
          </p>
          <p className="sr-only" aria-live="polite">
            {left % 15 === 0 ? tm("remaining", { seconds: left }) : ""}
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={momoApproved}
              disabled={busy}
              className="min-h-11 cursor-pointer rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-60"
            >
              {busy ? t("processing") : tm("approved")}
            </button>
            <button
              type="button"
              onClick={() => setPhase("form")}
              className="min-h-11 cursor-pointer rounded-ctl border border-line bg-surface px-5 text-[15px] font-semibold text-ink hover:border-ink-3/40"
            >
              {tm("other")}
            </button>
          </div>
        </div>
      </StepSection>
    );
  }

  const alert =
    phase === "declined"
      ? { title: t("declinedTitle"), body: t("declinedBody") }
      : phase === "momoTimeout"
        ? { title: tm("timeoutTitle"), body: tm("timeoutBody") }
        : phase === "momoDeclined"
          ? { title: tm("declinedTitle"), body: tm("declinedBody") }
          : null;

  return (
    <div className="flex flex-col gap-5">
      {alert && (
        <div ref={alertRef} tabIndex={-1} role="alert" className="flex flex-col gap-1 rounded-card border border-crit/40 bg-crit-tint px-5 py-4">
          <p className="text-[15px] font-semibold text-crit">{alert.title}</p>
          <p className="text-[14px] text-ink-2">{alert.body}</p>
        </div>
      )}

      {plan.offered && (
        <StepSection title={t("planTitle")}>
          <ChoiceCards
            name={t("planTitle")}
            value={draft.plan}
            onChange={(v) => dispatch({ type: "plan", value: v })}
            options={[
              { value: "full", title: t("planFull"), body: t("planFullBody", { amount: display(toDisplayQuote(quote, currency, fx).total) }) },
              {
                value: "deposit",
                title: t("planDeposit"),
                body: t("planDepositBody", { now: display(plan.now), balance: display(plan.balance), date: depositDue ?? "" }),
              },
            ]}
          />
        </StepSection>
      )}

      <StepSection title={t("methodTitle")} aside={<ShieldIcon size={18} className="mt-1 text-ok" />}>
        <ChoiceCards
          name={t("methodTitle")}
          value={rail}
          columns={rails.length === 3 ? 3 : 2}
          onChange={(v) => {
            dispatch({ type: "rail", value: v });
            setPhase("form");
          }}
          options={rails.map((r) => ({
            value: r,
            title: t(r),
            body: t(`${r}Hint`),
            icon: r === "bankTransfer" ? <BanknoteIcon size={15} /> : undefined,
          }))}
        />

        {rail === "card" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tc("cardNumber")} error={err("card-number", tc("cardNumberError"))} id="card-number" className="sm:col-span-2">
              {(a) => (
                <TextInput {...a} invalid={a["aria-invalid"]} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" value={values["card-number"]} onChange={(e) => set("card-number", e.target.value)} className="tnum" />
              )}
            </Field>
            <Field label={tc("cardHolder")} error={err("card-name", tc("cardHolderError"))} id="card-name" className="sm:col-span-2">
              {(a) => (
                <TextInput {...a} invalid={a["aria-invalid"]} autoComplete="cc-name" value={values["card-name"]} onChange={(e) => set("card-name", e.target.value)} />
              )}
            </Field>
            <Field label={tc("expiry")} error={err("card-expiry", tc("expiryError"))} id="card-expiry">
              {(a) => (
                <TextInput {...a} invalid={a["aria-invalid"]} inputMode="numeric" autoComplete="cc-exp" placeholder={tc("expiryPlaceholder")} maxLength={5} value={values["card-expiry"]} onChange={(e) => set("card-expiry", e.target.value)} className="tnum" />
              )}
            </Field>
            <Field label={tc("cvc")} error={err("card-cvc", tc("cvcError"))} id="card-cvc">
              {(a) => (
                <TextInput {...a} invalid={a["aria-invalid"]} inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} value={values["card-cvc"]} onChange={(e) => set("card-cvc", e.target.value)} className="tnum" />
              )}
            </Field>
          </div>
        )}

        {rail === "mobileMoney" && (
          <Field
            label={tc("mobileNumber")}
            hint={provider ? t("momoProvider", { provider: provider === "mtn" ? "MTN" : "Airtel" }) : t("momoUnknown")}
            error={err("momo-number", tc("mobileNumberError"))}
            id="momo-number"
          >
            {(a) => (
              <div className="relative sm:max-w-80">
                <TextInput {...a} invalid={a["aria-invalid"]} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="078 000 0000" value={values["momo-number"]} onChange={(e) => set("momo-number", e.target.value)} className="tnum pr-20" />
                {provider && (
                  <span
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 rounded-chip px-2 py-0.5 text-[11.5px] font-bold",
                      provider === "mtn" ? "bg-[#ffcc00] text-[#1a1a1a]" : "bg-[#e4002b] text-white",
                    )}
                  >
                    {provider === "mtn" ? "MTN" : "Airtel"}
                  </span>
                )}
              </div>
            )}
          </Field>
        )}
      </StepSection>

      {escrowBody && (
        <section className="flex flex-col gap-2 rounded-card border border-trust/30 bg-trust-tint/40 p-5">
          <VerifiedBadge label={tv("escrow")} className="self-start" />
          <h2 className="font-display text-lg font-semibold leading-snug text-ink">{escrowBody.title}</h2>
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">{escrowBody.body}</p>
        </section>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={working}
          className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-ctl bg-brand px-5 text-[16px] font-semibold text-on-brand transition-colors hover:bg-brand-deep disabled:cursor-wait disabled:opacity-70"
        >
          {working && <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-on-brand/40 border-t-on-brand" />}
          {working ? t("processing") : useDeposit ? t("payDeposit", { amount: shownDue }) : t("payNow", { amount: shownDue })}
        </button>
        <p className="flex items-center justify-center gap-1.5 text-center text-[12.5px] text-ink-3">
          <ShieldIcon size={13} />
          {t("secure")}
        </p>
        <p className="text-center text-[12.5px] text-ink-3">{t("agree")}</p>
        <p className="rounded-ctl bg-warn-tint px-3 py-2 text-[12px] leading-relaxed text-warn">{t("testHint")}</p>
      </div>

      <Dialog
        open={phase === "challenge"}
        onClose={() => setPhase("declined")}
        title={t3("title")}
        description={t3("body")}
        size="sm"
        dismissable={false}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPhase("declined")}
              className="min-h-11 cursor-pointer rounded-ctl border border-line px-4 text-[15px] font-semibold text-ink hover:bg-surface-2"
            >
              {t3("cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeTried(true);
                if (/^\d{6}$/.test(code)) {
                  setPhase("processing");
                  onApproved("card");
                }
              }}
              className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
            >
              {t3("confirm")}
            </button>
          </>
        }
      >
        <Field label={t3("code")} error={codeTried && !/^\d{6}$/.test(code) && t3("codeError")} id="three-ds-code">
          {(a) => (
            <TextInput
              {...a}
              invalid={a["aria-invalid"]}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="tnum text-center font-mono text-[22px] tracking-[0.4em]"
            />
          )}
        </Field>
      </Dialog>
    </div>
  );
}
