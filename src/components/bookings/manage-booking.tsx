"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingEventKind, IncidentCategory, Review, ServiceKind } from "@/lib/domain/types";
import type { Money } from "@/lib/domain/money";
import { usePreferences } from "@/lib/preferences/context";
import { Link, useRouter } from "@/i18n/navigation";
import { cancelBooking, changeBookingDates } from "@/app/actions/bookings";
import { addGuests, previewChange, reportIssue, submitCheckIn, submitReview } from "@/app/actions/stay";
import { Dialog } from "@/components/ui/dialog";
import { FileDrop } from "@/components/ui/file-drop";
import { Select } from "@/components/ui/select";
import { SingleDatePicker } from "@/components/ui/single-date-picker";
import { useToast } from "@/components/notifications/toaster";
import {
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  KeyIcon,
  MinusIcon,
  PlusIcon,
  UsersIcon,
  WifiIcon,
} from "@/components/ui/icons";
import { ChoiceCards, Field, TextArea, TextInput } from "@/components/booking/fields";
import { cn } from "@/lib/cn";

export type ManageProps = {
  reference: string;
  service: ServiceKind;
  lease: boolean;
  phase: "before" | "released" | "during" | "after";
  party: number;
  maxParty: number;
  start: string;
  end: string;
  today: string;
  refund: Money | null;
  kept: Money | null;
  releaseWhen: string;
  checkIn: { directions: string; doorCode: string; wifiName: string; wifiPassword: string } | null;
  manager: string | null;
  reviewed: boolean;
  issues: number;
  onlineCheckIn: string[] | null;
  guestName: string;
  bookAgainHref: string;
  deposit: Money | null;
  timeline: { kind: BookingEventKind; when: string; note?: string }[];
};

type Open = null | "dates" | "extend" | "guests" | "cancel" | "report";
const CATEGORIES: IncidentCategory[] = ["power", "water", "internet", "cleanliness", "safety", "noise", "other"];
const ASPECTS = ["cleanliness", "accuracy", "checkIn", "communication", "location", "value"] as const;
const REASONS = ["plansChanged", "foundElse", "travel", "other"] as const;

/**
 * Everything a guest can do with a booking, shown for the phase it is in.
 *
 * Coming up: change dates, change guests, cancel (with the refund stated
 * before anyone presses anything), check in online, and the check-in card,
 * locked with the time it unlocks. From 48 hours out the card shows the way
 * in. During the stay: report a problem, stay longer. Afterwards: a review,
 * book again, and for a long-term stay where the deposit is.
 */
export function ManageBooking(p: ManageProps) {
  const t = useTranslations("booking.manage");
  const { display } = usePreferences();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const stay = p.service === "stay";

  return (
    <div className="flex flex-col">
      {(p.phase === "before" || p.phase === "released") && (
        <section className="flex flex-col gap-3 border-t border-line py-6">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("actions")}</h2>
          <div className="flex flex-wrap gap-2">
            {p.service !== "experience" && !p.lease && <ActionButton icon={<CalendarIcon size={15} />} label={t("changeDates")} onClick={() => setOpen("dates")} />}
            <ActionButton icon={<UsersIcon size={15} />} label={t("addGuests")} onClick={() => setOpen("guests")} />
            <ActionButton icon={<FlagIcon size={15} />} label={t("cancel")} onClick={() => setOpen("cancel")} tone="crit" />
          </div>
        </section>
      )}

      {stay && !p.lease && p.phase !== "after" && (
        <section className="flex flex-col gap-3 border-t border-line py-6">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("checkInTitle")}</h2>
          {p.checkIn ? (
            <div className="grid gap-4 rounded-card border border-trust/30 bg-trust-tint/40 p-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <p className="text-[13px] font-medium text-ink-3">{t("directions")}</p>
                <p className="text-[15px] leading-relaxed text-ink">{p.checkIn.directions}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
                  <KeyIcon size={14} />
                  {t("doorCode")}
                </p>
                <p className="tnum font-mono text-[26px] font-semibold tracking-[0.2em] text-ink">{p.checkIn.doorCode}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-3">
                  <WifiIcon size={14} />
                  {t("wifi")}
                </p>
                <p className="text-[15px] text-ink">{p.checkIn.wifiName}</p>
                <p className="font-mono text-[15px] text-ink">{p.checkIn.wifiPassword}</p>
              </div>
              {p.manager && (
                <div className="flex flex-col gap-1 border-t border-trust/20 pt-3 sm:col-span-2">
                  <p className="text-[13px] font-medium text-ink-3">{t("manager")}</p>
                  <p className="text-[15px] text-ink">
                    {p.manager} · <a href="tel:+250788000000" className="tnum font-semibold text-brand">+250 788 000 000</a>
                  </p>
                  <p className="text-[13px] text-ink-2">
                    {t("emergency")}: <a href="tel:+250788999999" className="tnum font-semibold text-crit">+250 788 999 999</a>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="flex items-center gap-2 rounded-card border border-dashed border-line bg-surface px-5 py-4 text-[15px] text-ink-2">
              <KeyIcon size={16} className="text-ink-3" />
              {t("checkInLocked", { when: t("whenReleased", { date: p.releaseWhen }) })}
            </p>
          )}
          {p.phase !== "during" && <OnlineCheckIn {...p} />}
        </section>
      )}

      {p.phase === "during" && (
        <section className="flex flex-col gap-3 border-t border-line py-6">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("duringTitle")}</h2>
          <div className="flex flex-wrap gap-2">
            <ActionButton icon={<FlagIcon size={15} />} label={t("report")} onClick={() => setOpen("report")} tone="crit" />
            {stay && !p.lease && <ActionButton icon={<CalendarIcon size={15} />} label={t("extend")} onClick={() => setOpen("extend")} />}
          </div>
          {p.issues > 0 && <p className="text-[14px] text-ink-2">{t("openIssues", { count: p.issues })}</p>}
        </section>
      )}

      {p.phase === "after" && <AfterStay {...p} />}

      {p.timeline.length > 0 && (
        <section className="flex flex-col gap-3 border-t border-line py-6">
          <h2 className="text-[15px] font-semibold text-ink">{t("timeline")}</h2>
          <ol className="flex flex-col">
            {p.timeline.map((e, i) => (
              <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                <span className="relative flex flex-col items-center">
                  <span aria-hidden="true" className={cn("mt-1.5 size-2.5 rounded-full", e.kind === "cancelled" || e.kind === "issueReported" ? "bg-crit" : "bg-brand")} />
                  {i < p.timeline.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-line" />}
                </span>
                <span className="flex flex-col">
                  <span className="text-[14px] font-medium text-ink">{t(`events.${e.kind}`)}</span>
                  <span className="tnum text-[12.5px] text-ink-3">
                    {e.when}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <DatesDialog open={open === "dates" || open === "extend"} extend={open === "extend"} onClose={close} {...p} />
      <GuestsDialog open={open === "guests"} onClose={close} {...p} />
      <Dialog
        open={open === "cancel"}
        onClose={close}
        title={t("cancelTitle")}
        description={
          p.refund && p.kept
            ? p.kept.minor === 0
              ? t("cancelRefundFull", { refund: display(p.refund) })
              : t("cancelRefund", { refund: display(p.refund), kept: display(p.kept) })
            : undefined
        }
        footer={<CancelFooter reference={p.reference} refund={p.refund} onDone={() => { close(); router.refresh(); }} toast={toast} display={display} />}
      />
      <ReportDialog open={open === "report"} onClose={close} reference={p.reference} />
    </div>
  );
}

function ActionButton({ icon, label, onClick, tone }: { icon: React.ReactNode; label: string; onClick: () => void; tone?: "crit" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-ctl border bg-surface px-4 text-[15px] font-semibold transition-colors",
        tone === "crit" ? "border-line text-crit hover:border-crit" : "border-line text-ink hover:border-brand hover:text-brand",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function CancelFooter({
  reference,
  refund,
  onDone,
  toast,
  display,
}: {
  reference: string;
  refund: Money | null;
  onDone: () => void;
  toast: ReturnType<typeof useToast>;
  display: (m: Money) => string;
}) {
  const t = useTranslations("booking.manage");
  const [reason, setReason] = useState<(typeof REASONS)[number]>("plansChanged");
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex w-full flex-col gap-4">
      <Select label={t("cancelReason")} value={reason} onChange={(v) => setReason(v as typeof reason)} options={REASONS.map((r) => ({ value: r, label: t(`reasons.${r}`) }))} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onDone} className="min-h-11 cursor-pointer rounded-ctl border border-line px-4 text-[15px] font-semibold text-ink hover:bg-surface-2">
          {t("keep")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await cancelBooking(reference, reason);
            toast.show({ title: t("cancelledToast", { refund: refund ? display(refund) : "" }), tone: "ok" });
            onDone();
          }}
          className="min-h-11 cursor-pointer rounded-ctl bg-crit px-4 text-[15px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {t("confirmCancel", { refund: refund ? display(refund) : "" })}
        </button>
      </div>
    </div>
  );
}

function DatesDialog({ open, onClose, extend, reference, start, end, today }: ManageProps & { open: boolean; onClose: () => void; extend: boolean }) {
  const t = useTranslations("booking.manage");
  const { display } = usePreferences();
  const router = useRouter();
  const toast = useToast();
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(end);
  const [result, setResult] = useState<null | Awaited<ReturnType<typeof previewChange>>>(null);
  const [busy, setBusy] = useState(false);

  async function check(f: string, e: string) {
    setResult(null);
    setResult(await previewChange(reference, f, e));
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={extend ? t("extend") : t("changeDates")}
      footer={
        <button
          type="button"
          disabled={!result?.ok || busy}
          onClick={async () => {
            setBusy(true);
            const r = await changeBookingDates(reference, from, to);
            setBusy(false);
            if (r.ok) {
              toast.show({ title: t("events.datesChanged"), tone: "ok" });
              onClose();
              router.refresh();
            } else setResult({ ok: false, reason: r.reason });
          }}
          className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-50"
        >
          {t("confirmChange")}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* The calendar has no disabled state; a disabled fieldset disables the button inside it, which is what `disabled` did on the native input when extending. */}
          <fieldset disabled={extend} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
            <SingleDatePicker label={t("arrive")} minDate={today} value={from || null} onChange={(d) => { const v = d ?? ""; setFrom(v); void check(v, to); }} />
          </fieldset>
          <SingleDatePicker label={t("leave")} minDate={(extend ? end : from) || today} value={to || null} onChange={(d) => { const v = d ?? ""; setTo(v); void check(from, v); }} />
        </div>
        <p aria-live="polite" className="min-h-6 text-[14px]">
          {result === null ? (
            <span className="text-ink-3">{from !== start || to !== end ? t("checking") : ""}</span>
          ) : result.ok ? (
            <span className="font-medium text-ink">
              {result.difference.minor > 0
                ? t("costMore", { amount: display(result.difference) })
                : result.difference.minor < 0
                  ? t("costLess", { amount: display({ ...result.difference, minor: -result.difference.minor }) })
                  : t("costSame")}
            </span>
          ) : (
            <span className="text-crit">{result.reason === "unavailable" ? t("unavailable") : t("invalid")}</span>
          )}
        </p>
      </div>
    </Dialog>
  );
}

function GuestsDialog({ open, onClose, reference, party, maxParty }: ManageProps & { open: boolean; onClose: () => void }) {
  const t = useTranslations("booking.manage");
  const router = useRouter();
  const [n, setN] = useState(party);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("addGuests")}
      size="sm"
      footer={
        <button
          type="button"
          disabled={n === party}
          onClick={async () => {
            await addGuests(reference, n);
            onClose();
            router.refresh();
          }}
          className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand disabled:opacity-50"
        >
          {t("save")}
        </button>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-semibold text-ink">{t("guests")}</p>
        <div className="flex items-center gap-1 rounded-ctl border border-line">
          <button type="button" aria-label="−" disabled={n <= 1} onClick={() => setN(n - 1)} className="grid size-11 cursor-pointer place-items-center text-brand disabled:opacity-40">
            <MinusIcon size={14} />
          </button>
          <span className="tnum w-6 text-center text-[17px] font-semibold" aria-live="polite">
            {n}
          </span>
          <button type="button" aria-label="+" disabled={n >= maxParty} onClick={() => setN(n + 1)} className="grid size-11 cursor-pointer place-items-center text-brand disabled:opacity-40">
            <PlusIcon size={14} />
          </button>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-ink-3">{t("guestsMax", { count: maxParty })}</p>
    </Dialog>
  );
}

function ReportDialog({ open, onClose, reference }: { open: boolean; onClose: () => void; reference: string }) {
  const t = useTranslations("booking.manage");
  const tf = useTranslations("files");
  const router = useRouter();
  const toast = useToast();
  const [category, setCategory] = useState<IncidentCategory>("power");
  const [urgency, setUrgency] = useState<"now" | "today" | "whenever">("today");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [tried, setTried] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t("reportTitle")}
      description={t("reportBody")}
      footer={
        <button
          type="button"
          onClick={async () => {
            setTried(true);
            if (text.trim().length < 3) return;
            const r = await reportIssue({ reference, category, urgency, description: text, photoName: photo });
            if (r.ok) {
              toast.show({ title: t("reported"), tone: "ok" });
              onClose();
              router.refresh();
            }
          }}
          className="min-h-11 cursor-pointer rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
        >
          {t("send")}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Select label={t("category")} value={category} onChange={(v) => setCategory(v as IncidentCategory)} options={CATEGORIES.map((c) => ({ value: c, label: t(`categories.${c}`) }))} />
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-ink-2">{t("urgency")}</p>
          <ChoiceCards
            name={t("urgency")}
            value={urgency}
            onChange={setUrgency}
            columns={3}
            options={(["now", "today", "whenever"] as const).map((u) => ({ value: u, title: t(`urgencies.${u}`) }))}
          />
        </div>
        <Field label={t("describe")} error={tried && text.trim().length < 3 && t("describe")} id="r-text">
          {(a) => <TextArea {...a} invalid={a["aria-invalid"]} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />}
        </Field>
        <FileDrop
          label={t("photo")}
          accept="image/*"
          capture="environment"
          value={photo}
          onFile={(f) => setPhoto(f?.name)}
          errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }}
        />
      </div>
    </Dialog>
  );
}

function OnlineCheckIn({ reference, party, onlineCheckIn, guestName }: ManageProps) {
  const t = useTranslations("booking.manage");
  const tf = useTranslations("files");
  const router = useRouter();
  const [adults, setAdults] = useState(
    Array.from({ length: party }, (_, i) => ({ name: i === 0 ? guestName : "", idFileName: "" })),
  );
  if (onlineCheckIn) {
    return (
      <p className="flex items-center gap-2 text-[14px] font-medium text-ok">
        <CheckIcon size={15} />
        {t("onlineDone", { names: onlineCheckIn.join(", ") })}
      </p>
    );
  }
  const ready = adults.every((a) => a.name.trim().length >= 2 && a.idFileName);
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-ink">{t("onlineTitle")}</p>
        <p className="text-[14px] text-ink-2">{t("onlineBody")}</p>
      </div>
      {adults.map((a, i) => (
        <div key={i} className="grid gap-3 rounded-ctl border border-line-soft p-3 sm:grid-cols-2">
          <Field label={t("adult", { n: i + 1 })} id={`oc-${i}`}>
            {(f) => <TextInput {...f} value={a.name} onChange={(e) => setAdults((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />}
          </Field>
          <FileDrop
            label="ID"
            value={a.idFileName || undefined}
            onFile={(file) => setAdults((x) => x.map((y, j) => (j === i ? { ...y, idFileName: file?.name ?? "" } : y)))}
            errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }}
          />
        </div>
      ))}
      <button
        type="button"
        disabled={!ready}
        onClick={async () => {
          await submitCheckIn(reference, adults);
          router.refresh();
        }}
        className="min-h-11 cursor-pointer self-start rounded-ctl bg-brand px-4 text-[15px] font-semibold text-on-brand disabled:opacity-50"
      >
        {t("sendIds")}
      </button>
    </div>
  );
}

function AfterStay({ reference, reviewed, bookAgainHref, lease, deposit }: ManageProps) {
  const t = useTranslations("booking.manage");
  const { display } = usePreferences();
  const router = useRouter();
  const [ratings, setRatings] = useState<Partial<Review["ratings"]>>({});
  const [text, setText] = useState("");
  const [done, setDone] = useState(reviewed);
  const complete = ASPECTS.every((a) => ratings[a]);

  return (
    <>
      {lease && deposit && (
        <section className="flex flex-col gap-2 border-t border-line py-6">
          <h2 className="font-display text-2xl font-semibold text-ink">{t("depositTitle")}</h2>
          <ol className="flex flex-col gap-2 text-[15px]">
            <li className="flex items-center gap-2 text-ink-2"><CheckIcon size={15} className="text-ok" />{t("depositHeld", { amount: display(deposit) })}</li>
            <li className="flex items-center gap-2 text-ink"><span aria-hidden="true" className="size-2 rounded-full bg-warn" />{t("depositInspection")}</li>
          </ol>
        </section>
      )}
      <section className="flex flex-col gap-4 border-t border-line py-6">
        <h2 className="font-display text-2xl font-semibold text-ink">{t("reviewTitle")}</h2>
        {done ? (
          <p className="flex items-center gap-2 text-[15px] font-medium text-ok">
            <CheckIcon size={16} />
            {t("reviewed")}
          </p>
        ) : (
          <>
            <p className="text-[15px] text-ink-2">{t("reviewBody")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ASPECTS.map((aspect) => (
                <div key={aspect} className="flex items-center justify-between gap-3 rounded-ctl border border-line bg-surface px-3 py-2">
                  <span className="text-[14px] text-ink">{t(`aspects.${aspect}`)}</span>
                  <span role="radiogroup" aria-label={t(`aspects.${aspect}`)} className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={ratings[aspect] === n}
                        aria-label={t("stars", { count: n, aspect: t(`aspects.${aspect}`) })}
                        onClick={() => setRatings((r) => ({ ...r, [aspect]: n }))}
                        className={cn("grid size-8 cursor-pointer place-items-center text-[20px] leading-none", (ratings[aspect] ?? 0) >= n ? "text-[#C69434]" : "text-line")}
                      >
                        ★
                      </button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
            <Field label={t("reviewText")} id="rv-text">
              {(a) => <TextArea {...a} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />}
            </Field>
            <button
              type="button"
              disabled={!complete || text.trim().length < 3}
              onClick={async () => {
                const r = await submitReview(reference, ratings as Review["ratings"], text);
                if (r.ok) {
                  setDone(true);
                  router.refresh();
                }
              }}
              className="min-h-11 cursor-pointer self-start rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand disabled:opacity-50"
            >
              {t("submitReview")}
            </button>
          </>
        )}
        <Link href={bookAgainHref} className="self-start rounded-ctl text-[15px] font-semibold text-brand hover:text-brand-deep">
          {t("bookAgain")}
        </Link>
      </section>
    </>
  );
}
