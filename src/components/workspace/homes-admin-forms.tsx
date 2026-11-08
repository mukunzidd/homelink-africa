"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HomeForSale, Viewing } from "@/lib/domain/types";
import { assignJob, recordRent, returnDeposit, sendRentReminder, setViewing, startMoveOut, updateSale } from "@/app/actions/homes-admin";
import { control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { cn } from "@/lib/cn";

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
          <label className={cn(label, "w-48")}>
            {t("moveOutDate")}
            <input type="date" min={today} required value={date} onChange={(e) => setDate(e.target.value)} className={control} />
          </label>
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
      <label className={cn(label, "w-48")}>
        {t("status")}
        <select value={state} onChange={(e) => setState(e.target.value as typeof state)} className={control}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`sale.${s}`)}</option>)}
        </select>
      </label>
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
          <label className={cn(label, "w-44")}>{t("day")}<input type="date" min={today} value={d} onChange={(e) => setD(e.target.value)} className={control} /></label>
          <label className={cn(label, "w-32")}>{t("time")}<input type="time" step={1800} value={tm} onChange={(e) => setTm(e.target.value)} className={control} /></label>
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
    <label className="flex items-center gap-2 text-[13px] text-ink-3">
      <span className="sr-only">{t("assignTo")}</span>
      <select
        value={current ?? ""}
        disabled={w.busy}
        onChange={(e) => w.run(async () => { if (!(await assignJob(bookingId, e.target.value || null)).ok) throw new Error(); }, t("assigned"))}
        className="min-h-9 rounded-ctl border border-line bg-surface px-2 text-[13px] text-ink"
      >
        <option value="">{t("nobody")}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      {w.error && <span role="alert" className="text-crit">{w.error}</span>}
    </label>
  );
}
