"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HomeForSale, Viewing } from "@/lib/domain/types";
import { assignJob, recordRent, returnDeposit, sendRentReminder, setViewing, startMoveOut, updateSale } from "@/app/actions/homes-admin";
import { Caption, control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { Select } from "@/components/ui/select";
import { SingleDatePicker } from "@/components/ui/single-date-picker";
import { cn } from "@/lib/cn";

/**
 * Half-hours from 06:00 to 22:00, as "HH:MM", in place of the native time input with a 30-minute step.
 * A time already on the viewing that falls between them is kept as a choice,
 * so opening the form never silently moves it.
 */
function halfHours(current: string): string[] {
  const all: string[] = [];
  for (let m = 6 * 60; m <= 22 * 60; m += 30) all.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return current && !all.includes(current) ? [...all, current].sort() : all;
}

/** Remind, record a transfer, and the move-out: the three things a rent roll does. */
export function TenantActions({ reference, rentMajor, currency, moveOut, today }: { reference: string; rentMajor: number; currency: string; moveOut?: { status: "scheduled" | "returned"; date: string }; today: string }) {
  const t = useTranslations("workspace.homes");
  const w = useWrite();
  const [amount, setAmount] = useState(String(rentMajor));
  const [date, setDate] = useState("");
  const fail = () => { throw new Error(); };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={w.busy} onClick={() => w.run(async () => { if (!(await sendRentReminder(reference)).ok) fail(); }, t("reminded"))} className={quiet}>{t("remind")}</button>
      </div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); w.run(async () => { if (!(await recordRent(reference, Number(amount.replace(/[\s,]/g, "")))).ok) fail(); }, t("recorded")); }}>
        <label className={cn(label, "w-48")}>
          {t("received", { currency })}
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={cn(control, "tnum")} />
        </label>
        <button type="submit" disabled={w.busy} className={primary}>{t("record")}</button>
        <span className="text-[12.5px] text-ink-3">{t("recordHint")}</span>
      </form>
      {!moveOut ? (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); w.run(async () => { if (!(await startMoveOut(reference, date)).ok) fail(); }, t("moveOutBooked")); }}>
          <SingleDatePicker label={t("moveOutDate")} minDate={today} value={date || null} onChange={(d) => setDate(d ?? "")} className="w-48" />
          <button type="submit" disabled={w.busy || !date} className={quiet}>{t("startMoveOut")}</button>
        </form>
      ) : moveOut.status === "scheduled" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-ctl border border-line bg-surface p-3">
          <p className="text-[14px] text-ink-2">{t("moveOutOn", { date: moveOut.date })}</p>
          <button type="button" disabled={w.busy} onClick={() => w.run(async () => { if (!(await returnDeposit(reference)).ok) fail(); }, t("depositReturned"))} className={primary}>{t("returnDeposit")}</button>
        </div>
      ) : (
        <p className="text-[14px] text-ink-3">{t("depositDone")}</p>
      )}
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </div>
  );
}

const STATUSES: NonNullable<HomeForSale["saleStatus"]>[] = ["onMarket", "underOffer", "sold"];

export function SaleEditor({ id, priceMajor, currency, status }: { id: string; priceMajor: number; currency: string; status: NonNullable<HomeForSale["saleStatus"]> }) {
  const t = useTranslations("workspace.homes");
  const w = useWrite();
  const [price, setPrice] = useState(String(priceMajor));
  const [state, setState] = useState(status);
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); w.run(async () => { if (!(await updateSale(id, { priceMajor: Number(price.replace(/[\s,]/g, "")), status: state })).ok) throw new Error(); }, t("saleSaved")); }}>
      <label className={cn(label, "w-56")}>
        {t("askingPrice", { currency })}
        <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={cn(control, "tnum")} />
      </label>
      <Caption text={t("status")} className="w-48">
        <Select label={t("status")} hideLabel value={state} onChange={(v) => setState(v as typeof state)} options={STATUSES.map((s) => ({ value: s, label: t(`sale.${s}`) }))} />
      </Caption>
      <button type="submit" disabled={w.busy} className={primary}>{t("save")}</button>
      {w.error && <p role="alert" className="w-full text-[13px] text-crit">{w.error}</p>}
    </form>
  );
}

export function ViewingActions({ id, status, date, time, today }: { id: string; status: Viewing["status"]; date: string; time: string; today: string }) {
  const t = useTranslations("workspace.homes");
  const w = useWrite();
  const [moving, setMoving] = useState(false);
  const [d, setD] = useState(date >= today ? date : today);
  const [tm, setTm] = useState(time);
  if (status === "done" || status === "cancelled") return null;
  const go = (s: "confirmed" | "rescheduled" | "done" | "cancelled", move?: { date: string; time: string }, done?: string) =>
    w.run(async () => { if (!(await setViewing(id, s, move)).ok) throw new Error(); setMoving(false); }, done);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "requested" && <button type="button" disabled={w.busy} onClick={() => go("confirmed", undefined, t("viewingConfirmed"))} className={primary}>{t("confirm")}</button>}
        <button type="button" disabled={w.busy} onClick={() => setMoving((m) => !m)} className={quiet}>{t("reschedule")}</button>
        {date <= today && <button type="button" disabled={w.busy} onClick={() => go("done", undefined, t("viewingDone"))} className={quiet}>{t("markDone")}</button>}
        <button type="button" disabled={w.busy} onClick={() => go("cancelled", undefined, t("viewingCancelled"))} className="min-h-10 cursor-pointer rounded-ctl px-3 text-[14px] font-medium text-ink-2 hover:text-crit">{t("cancelViewing")}</button>
      </div>
      {moving && (
        <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); go("rescheduled", { date: d, time: tm }, t("viewingMoved")); }}>
          <SingleDatePicker label={t("day")} minDate={today} value={d || null} onChange={(x) => setD(x ?? "")} className="w-44" />
          <Caption text={t("time")} className="w-32"><Select label={t("time")} hideLabel value={tm} onChange={setTm} options={halfHours(time).map((h) => ({ value: h, label: h }))} /></Caption>
          <button type="submit" disabled={w.busy} className={primary}>{t("move")}</button>
        </form>
      )}
      {w.error && <p role="alert" className="text-[13px] text-crit">{t("viewingFailed")}</p>}
    </div>
  );
}

export function AssignJob({ bookingId, current, options }: { bookingId: string; current?: string; options: { id: string; name: string }[] }) {
  const t = useTranslations("workspace.homes");
  const w = useWrite();
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-3">
      <Select
        label={t("assignTo")}
        hideLabel
        size="sm"
        className="min-w-44"
        value={current ?? ""}
        disabled={w.busy}
        onChange={(v) => w.run(async () => { if (!(await assignJob(bookingId, v || null)).ok) throw new Error(); }, t("assigned"))}
        options={[{ value: "", label: t("nobody") }, ...options.map((o) => ({ value: o.id, label: o.name }))]}
      />
      {w.error && <span role="alert" className="text-crit">{w.error}</span>}
    </div>
  );
}
