"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { ServiceKind } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import { bookingReference, toDisplayQuote } from "@/lib/domain/pricing";
import { usePreferences } from "@/lib/preferences/context";
import { Button } from "@/components/ui/button";
import { QuoteBreakdown } from "@/components/listing/quote-breakdown";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/cn";

type Rail = "card" | "mobileMoney";

/** What is being paid for, reduced to what the pay step actually needs. */
export type CheckoutItem = {
  kind: ServiceKind;
  id: string;
  slug: string;
  name: string;
  unitRate: Money;
};

/**
 * The pay step, shared by stays, cars, and experiences.
 *
 * A checkout is the worst place to introduce variety: people have learned one
 * shape and any deviation reads as a trick. So the three modules differ only
 * in what they hand in — the rail choice, the escrow statement, the price
 * breakdown, and the button that names the amount are identical.
 *
 * Nothing is charged; payment rails land in Phase 2. Until then the fields
 * are validated so the form behaves like the real one, and their values go
 * nowhere: the confirmation is rebuilt from the query string.
 */
export function CheckoutForm({
  item,
  quote,
  units,
  confirmQuery,
  referenceSeed,
  cancellationNote,
  guarantee,
}: {
  item: CheckoutItem;
  quote: Quote;
  units: number;
  detailHref?: string;
  /** Carried to the confirmation screen, which has no store to read from yet. */
  confirmQuery: Record<string, string>;
  referenceSeed: string;
  /**
   * The lane's own cancellation sentence, already worded. The stay rule is
   * counted in nights and a hire in days, so the page that knows the lane
   * writes it, and "the cancellation policy above" always has a policy above.
   */
  cancellationNote?: string;
  /** Who inspected it, and when. Carries the guarantee where there is no escrow. */
  guarantee?: { inspector: string; inspectedOn: string; points: number };
}) {
  const t = useTranslations("checkout");
  const tQuote = useTranslations("quote");
  const tVerify = useTranslations("verification");
  const router = useRouter();

  const { rail: defaultRail, display, currency, fx } = usePreferences();

  // The button must name the same number the breakdown above it totals to.
  const shownTotal = toDisplayQuote(quote, currency, fx).total;

  const [rail, setRail] = useState<Rail>(defaultRail);
  const [values, setValues] = useState<Record<FieldId, string>>(EMPTY);
  const [touched, setTouched] = useState<ReadonlySet<FieldId>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Only the fields on screen count. A half-typed card number does not block
  // someone who has since switched to Mobile Money.
  const active: FieldId[] = [
    ...DETAIL_FIELDS,
    ...(rail === "mobileMoney" ? MOMO_FIELDS : CARD_FIELDS),
  ];
  const invalid = new Set(active.filter((id) => !VALID[id](values[id])));
  const showError = (id: FieldId) =>
    invalid.has(id) && (attempted || touched.has(id));

  function set(id: FieldId, raw: string) {
    setValues((v) => ({ ...v, [id]: FORMAT[id]?.(raw) ?? raw }));
  }

  function blur(id: FieldId) {
    setTouched((s) => new Set(s).add(id));
  }

  function submit() {
    setAttempted(true);
    const first = active.find((id) => invalid.has(id));
    if (first) {
      // Straight to the field, rather than a summary at the top that the
      // reader then has to match against the form by eye.
      document.getElementById(first)?.focus();
      return;
    }

    setSubmitting(true);
    const reference = bookingReference(referenceSeed);
    const qs = new URLSearchParams({ kind: item.kind, ...confirmQuery });
    router.push(`/bookings/${reference}?${qs.toString()}`);
  }

  const input = (
    id: FieldId,
    props: InputHTMLAttributes<HTMLInputElement>,
  ) => (
    <input
      id={id}
      name={id}
      value={values[id]}
      onChange={(e) => set(id, e.target.value)}
      onBlur={() => blur(id)}
      aria-invalid={showError(id)}
      aria-describedby={showError(id) ? `${id}-error` : undefined}
      className={cn(
        "min-h-11 w-full rounded-ctl border bg-surface px-3 py-2.5 text-[15px] text-ink",
        showError(id) ? "border-crit" : "border-line focus-visible:border-brand",
      )}
      {...props}
    />
  );

  const field = (id: FieldId, label: string, control: ReactNode, error: string) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {control}
      {showError(id) && (
        <span id={`${id}-error`} className="text-xs text-crit">
          {error}
        </span>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Who the booking is for, before how it is paid for. The confirmation
          and the Kigali team's messages both need somewhere to go, and a card
          holder's name is not always the guest's. */}
      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-xs font-medium text-ink-3">{t("detailsTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            {field(
              "guest-name",
              t("fullName"),
              input("guest-name", { autoComplete: "name" }),
              t("fullNameError"),
            )}
          </div>
          {field(
            "guest-email",
            t("email"),
            input("guest-email", {
              type: "email",
              inputMode: "email",
              autoComplete: "email",
              spellCheck: false,
            }),
            t("emailError"),
          )}
          {field(
            "guest-phone",
            t("phone"),
            input("guest-phone", {
              type: "tel",
              inputMode: "tel",
              autoComplete: "tel",
              placeholder: "+250 78 000 0000",
            }),
            t("phoneError"),
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="text-xs font-medium text-ink-3">
          {t("payWith")}
        </h2>

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { value: "card", label: t("card"), hint: t("cardHint") },
              {
                value: "mobileMoney",
                label: t("mobileMoney"),
                hint: t("mobileMoneyHint"),
              },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={rail === option.value}
              onClick={() => setRail(option.value)}
              className={cn(
                "flex min-h-11 flex-col items-start gap-0.5 rounded-ctl border px-4 py-3 text-left",
                "cursor-pointer transition-colors duration-150 ease-out",
                rail === option.value
                  ? "border-brand bg-brand-tint"
                  : "border-line bg-surface hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "text-[15px] font-semibold",
                  rail === option.value ? "text-brand" : "text-ink",
                )}
              >
                {option.label}
              </span>
              <span className="text-xs text-ink-3">{option.hint}</span>
            </button>
          ))}
        </div>

        {rail === "mobileMoney" ? (
          <div className="mt-1">
            {field(
              "momo-number",
              t("mobileNumber"),
              input("momo-number", {
                type: "tel",
                inputMode: "numeric",
                autoComplete: "tel-national",
                placeholder: "078 000 0000",
              }),
              t("mobileNumberError"),
            )}
          </div>
        ) : (
          <div className="mt-1 grid gap-3 sm:grid-cols-2">
            {field(
              "card-number",
              t("cardNumber"),
              input("card-number", {
                inputMode: "numeric",
                autoComplete: "cc-number",
                placeholder: "4242 4242 4242 4242",
              }),
              t("cardNumberError"),
            )}
            {field(
              "card-name",
              t("cardHolder"),
              input("card-name", { autoComplete: "cc-name" }),
              t("cardHolderError"),
            )}
            {/* Expiry and CVC share a row at every width: both are four
                characters at most, and stacking them on a phone made two
                full-width boxes for eight digits. */}
            <div className="grid grid-cols-2 gap-3 sm:col-span-2">
              {field(
                "card-expiry",
                t("expiry"),
                input("card-expiry", {
                  inputMode: "numeric",
                  autoComplete: "cc-exp",
                  placeholder: t("expiryPlaceholder"),
                  maxLength: 5,
                }),
                t("expiryError"),
              )}
              {field(
                "card-cvc",
                t("cvc"),
                input("card-cvc", {
                  inputMode: "numeric",
                  autoComplete: "cc-csc",
                  placeholder: "123",
                  maxLength: 4,
                }),
                t("cvcError"),
              )}
            </div>
          </div>
        )}
      </section>

      {/* The promise, stated in money terms, where money is being asked for. */}
      {quote.escrowHeld ? (
        <section className="flex flex-col gap-2 rounded-card border border-trust/30 bg-trust-tint/40 p-5">
          <VerifiedBadge label={tVerify("escrow")} className="self-start" />
          <h2 className="font-display text-xl font-semibold leading-snug text-ink">
            {t("escrowTitle")}
          </h2>
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
            {t("escrowBody")}
          </p>
        </section>
      ) : item.kind !== "stay" && guarantee ? (
        // A hire or a day out is not held in escrow, and this slot used to say
        // so. What does stand behind them is the inspection the detail page
        // already names, so the card says that, in the same voice as escrow.
        <section className="flex flex-col gap-2 rounded-card border border-trust/30 bg-trust-tint/40 p-5">
          <VerifiedBadge label={tVerify("badge")} className="self-start" />
          <h2 className="font-display text-xl font-semibold leading-snug text-ink">
            {t(`kinds.${item.kind}.guaranteeTitle`, { name: guarantee.inspector })}
          </h2>
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
            {t(`kinds.${item.kind}.guaranteeBody`, {
              date: guarantee.inspectedOn,
              points: guarantee.points,
            })}
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-5">
          <p className="max-w-[62ch] text-sm leading-relaxed text-ink-2">
            {t("noEscrowBody")}
          </p>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
        <QuoteBreakdown
          quote={quote}
          unitRate={item.unitRate}
          units={units}
          showEscrow={false}
        />

        {cancellationNote && (
          <p className="text-xs leading-relaxed text-ink-3">{cancellationNote}</p>
        )}

        <Button size="lg" fullWidth onClick={submit} disabled={submitting}>
          {submitting
            ? t("processing")
            : t("payNow", { amount: display(shownTotal) })}
        </Button>

        <p className="text-center text-xs text-ink-3">{t("agree")}</p>
        {/* Phase 2 brings the payment rails. Until then this button records
            the booking against fixture data and charges nothing, which is the
            only part of that the person paying needs to know. */}
        <p className="rounded-ctl bg-warn-tint px-3 py-2 text-center text-xs font-medium text-warn">
          {t("stubNotice")}
        </p>
        <p className="text-center text-xs text-ink-3">{tQuote("noHiddenFees")}</p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ the fields */

/** Stable ids: the label points at them, and a failed submit focuses one. */
type FieldId =
  | "guest-name"
  | "guest-email"
  | "guest-phone"
  | "card-number"
  | "card-name"
  | "card-expiry"
  | "card-cvc"
  | "momo-number";

const DETAIL_FIELDS: FieldId[] = ["guest-name", "guest-email", "guest-phone"];
const CARD_FIELDS: FieldId[] = ["card-number", "card-name", "card-expiry", "card-cvc"];
const MOMO_FIELDS: FieldId[] = ["momo-number"];

const EMPTY: Record<FieldId, string> = {
  "guest-name": "",
  "guest-email": "",
  "guest-phone": "",
  "card-number": "",
  "card-name": "",
  "card-expiry": "",
  "card-cvc": "",
  "momo-number": "",
};

const digits = (v: string) => v.replace(/\D/g, "");

/**
 * Light checks: the shape of the thing, not whether it exists. A real card is
 * the payment provider's question, and Phase 2 asks it.
 */
const VALID: Record<FieldId, (v: string) => boolean> = {
  "guest-name": (v) => v.trim().length >= 2,
  "guest-email": (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  // Nine digits is a Rwandan number without the 0; a visitor's number with
  // its country code is longer.
  "guest-phone": (v) => digits(v).length >= 9 && digits(v).length <= 15,
  "card-number": (v) => digits(v).length >= 13 && digits(v).length <= 19,
  "card-name": (v) => v.trim().length >= 2,
  "card-expiry": (v) => {
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);
    if (!m) return false;
    // A card is good to the end of its expiry month.
    const now = new Date();
    const expires = new Date(2000 + Number(m[2]), Number(m[1]), 1);
    return expires > now;
  },
  "card-cvc": (v) => /^\d{3,4}$/.test(v),
  // Typed the way Rwandans write it (078 123 4567), without the leading 0, or
  // with +250 in front. All three are the same nine-digit subscriber number.
  // It used to accept only the nine, while its own placeholder showed ten.
  "momo-number": (v) => /^(?:250|0)?7\d{8}$/.test(digits(v)),
};

/** Typed as the card prints it, so the reader can check it against the card. */
const FORMAT: Partial<Record<FieldId, (v: string) => string>> = {
  "card-number": (v) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "),
  "card-expiry": (v) => {
    const d = digits(v).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  },
  "card-cvc": (v) => digits(v).slice(0, 4),
};
