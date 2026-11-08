"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { NUMBER_LOCALES, type Locale } from "@/i18n/routing";
import { exponentOf, formatMoney, type Money } from "@/lib/domain/money";
import { resendConfirmation, staffAddGuests, staffCancel, staffChangeDates, staffRefund } from "@/app/actions/bookings";
import { addBookingNote } from "@/app/actions/desk";
import { useToast } from "@/components/notifications/toaster";
import { cn } from "@/lib/cn";

type Panel = "dates" | "party" | "cancel" | "refund" | null;

export type StaffActionsProps = {
  reference: string;
  guestName: string;
  admin: boolean;
  start: string;
  end: string;
  today: string;
  party: number;
  maxParty: number;
  canChange: boolean;
  canAddGuests: boolean;
  canCancel: boolean;
  policyRefund: Money | null;
  refundable: Money;
};

const control = "min-h-10 w-full rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink";
const primary = "min-h-10 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-60";

/**
 * What the desk can do to a booking, each behind one button that opens its
 * own small form in place. Money going back beyond the policy (a goodwill
 * cancel, a part refund) shows only to admin, and the server checks again.
 */
export function BookingStaffActions(p: StaffActionsProps) {
  const t = useTranslations("workspace.bookings");
  const num = NUMBER_LOCALES[useLocale() as Locale];
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [start, setStart] = useState(p.start);
  const [end, setEnd] = useState(p.end);
  const [party, setParty] = useState(p.party);
  const [reason, setReason] = useState("");
  const [goodwill, setGoodwill] = useState(false);
  const [amount, setAmount] = useState("");
  const fmt = (m: Money) => formatMoney(m, num);

  function toggle(panel: Panel) {
    setOpen((o) => (o === panel ? null : panel));
    setError(null);
    setReason("");
  }

  async function run<T>(fn: () => Promise<T>, ok: (r: T) => string | null) {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      const msg = ok(r);
      if (msg) {
        toast.show({ title: msg, tone: "ok" });
        setOpen(null);
        router.refresh();
      }
    } catch {
      setError(t("notAllowed"));
    } finally {
      setBusy(false);
    }
  }

  const exp = exponentOf(p.refundable.currency);
  const minor = Math.round(Number(amount.replace(",", ".")) * 10 ** exp);

  const button = (panel: Exclude<Panel, null>, label: string, tone?: "crit") => (
    <button
      type="button"
      aria-expanded={open === panel}
      onClick={() => toggle(panel)}
      className={cn(
        "flex min-h-10 w-full cursor-pointer items-center justify-between rounded-ctl px-3 text-left text-[14px] font-semibold",
        open === panel ? "bg-surface-2" : "hover:bg-surface-2",
        tone === "crit" ? "text-crit" : "text-ink",
      )}
    >
      {label}
      <span aria-hidden="true" className="text-ink-3">{open === panel ? "−" : "+"}</span>
    </button>
  );

  return (
    <section className="flex flex-col gap-1 rounded-card border border-line bg-surface p-2">
      <h2 className="px-3 pb-1 pt-2 text-[15px] font-semibold text-ink">{t("actions")}</h2>
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => resendConfirmation(p.reference), (r) => (r.ok ? t("resent", { name: p.guestName }) : null))}
        className="flex min-h-10 w-full cursor-pointer items-center rounded-ctl px-3 text-left text-[14px] font-semibold text-ink hover:bg-surface-2"
      >
        {t("resend")}
      </button>

      {p.canChange && button("dates", t("changeDates"))}
      {open === "dates" && (
        <form
          className="flex flex-col gap-2 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => staffChangeDates(p.reference, start, end),
              (r) => {
                if (r.ok) return t("moved", { amount: fmt(r.difference) });
                setError(r.reason === "unavailable" ? t("unavailable") : t("invalid"));
                return null;
              },
            );
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">{t("start")}<input type="date" min={p.today} value={start} onChange={(e) => setStart(e.target.value)} className={control} /></label>
            <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">{t("end")}<input type="date" min={start} value={end} onChange={(e) => setEnd(e.target.value)} className={control} /></label>
          </div>
          <button type="submit" disabled={busy || (start === p.start && end === p.end)} className={primary}>{t("saveDates")}</button>
        </form>
      )}

      {p.canAddGuests && button("party", t("changeParty"))}
      {open === "party" && (
        <form
          className="flex items-end gap-2 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => staffAddGuests(p.reference, party), (r) => {
              if (r.ok) return t("partySaved");
              setError(t("partyFailed"));
              return null;
            });
          }}
        >
          <label className="flex flex-1 flex-col gap-1 text-[12.5px] text-ink-3">
            {t("partySize", { max: p.maxParty })}
            <input type="number" min={1} max={p.maxParty} value={party} onChange={(e) => setParty(Number(e.target.value))} className={control} />
          </label>
          <button type="submit" disabled={busy || party === p.party} className={primary}>{t("save")}</button>
        </form>
      )}

      {p.admin && p.refundable.minor > 0 && button("refund", t("refund"))}
      {open === "refund" && (
        <form
          className="flex flex-col gap-2 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => staffRefund(p.reference, minor, reason), (r) => {
              if (r.ok) return t("refunded", { amount: fmt({ minor, currency: p.refundable.currency }) });
              setError(r.reason === "tooMuch" ? t("tooMuch") : t("refundInvalid"));
              return null;
            });
          }}
        >
          <p className="text-[13px] text-ink-2">{t("refundLeft", { amount: fmt(p.refundable) })}</p>
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
            {t("refundAmount", { currency: p.refundable.currency })}
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={cn(control, "tnum")} />
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
            {t("reason")}
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t("refundReasonHint")} className={control} />
          </label>
          <button type="submit" disabled={busy || !(minor > 0) || reason.trim().length < 3} className={primary}>{t("refundSubmit")}</button>
        </form>
      )}

      {p.canCancel && button("cancel", t("cancel"), "crit")}
      {open === "cancel" && (
        <form
          className="flex flex-col gap-2 px-3 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => staffCancel(p.reference, reason, goodwill), (r) => t("cancelled", { amount: r.refund ? fmt(r.refund) : fmt({ minor: 0, currency: p.refundable.currency }) }));
          }}
        >
          <fieldset className="flex flex-col gap-1.5">
            <legend className="sr-only">{t("refundChoice")}</legend>
            {[
              [false, t("cancelPolicy", { amount: fmt(p.policyRefund ?? { minor: 0, currency: p.refundable.currency }) })],
              ...(p.admin ? [[true, t("cancelGoodwill", { amount: fmt(p.refundable) })] as const] : []),
            ].map(([value, label]) => (
              <label key={String(value)} className={cn("flex min-h-10 cursor-pointer items-center gap-2.5 rounded-ctl border px-3 py-2 text-[14px]", goodwill === value ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink")}>
                <input type="radio" name="goodwill" checked={goodwill === value} onChange={() => setGoodwill(value as boolean)} className="accent-[var(--brand)]" />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-col gap-1 text-[12.5px] text-ink-3">
            {t("reason")}
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} className={control} />
          </label>
          <button type="submit" disabled={busy} className="min-h-10 cursor-pointer rounded-ctl bg-crit px-4 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
            {t("confirmCancel")}
          </button>
        </form>
      )}

      {error && <p role="alert" className="mx-3 mb-2 rounded-ctl bg-crit-tint px-3 py-2 text-[13px] text-crit">{error}</p>}
    </section>
  );
}

/** A note for the next person on the desk; never shown to the guest. */
export function StaffNoteForm({ reference }: { reference: string }) {
  const t = useTranslations("workspace.bookings");
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (text.trim().length < 2) return;
        setBusy(true);
        await addBookingNote(reference, text.trim().slice(0, 500));
        setText("");
        setBusy(false);
        router.refresh();
      }}
    >
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={500} placeholder={t("notePlaceholder")} aria-label={t("notes")} className="w-full rounded-ctl border border-line bg-surface px-3 py-2 text-[14px] text-ink" />
      <button type="submit" disabled={busy || text.trim().length < 2} className={cn(primary, "self-start")}>{t("addNote")}</button>
    </form>
  );
}
