"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { replaceDocument, respondToOffer } from "@/app/actions/partner";
import { control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { FileDrop } from "@/components/ui/file-drop";
import { SingleDatePicker } from "@/components/ui/single-date-picker";
import { cn } from "@/lib/cn";

/** Time left on an offer, ticking each minute, and the moment it runs out. */
export function Countdown({ until }: { until: string }) {
  const t = useTranslations("workspace.partner");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (now === null) return null;
  const mins = Math.max(0, Math.round((Date.parse(until) - now) / 60_000));
  return (
    <span className={cn("tnum text-[13px] font-semibold", mins <= 60 ? "text-crit" : "text-warn")}>
      {mins === 0 ? t("ranOut") : t("answerWithin", { h: Math.floor(mins / 60), m: mins % 60 })}
    </span>
  );
}

export function OfferActions({ id }: { id: string }) {
  const t = useTranslations("workspace.partner");
  const w = useWrite();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const go = (accept: boolean) => w.run(async () => { if (!(await respondToOffer(id, accept, reason)).ok) throw new Error(); }, accept ? t("accepted") : t("declined"));
  return (
    <div className="flex flex-col gap-2">
      {!declining ? (
        <div className="flex gap-2">
          <button type="button" disabled={w.busy} onClick={() => go(true)} className={cn(primary, "flex-1 sm:flex-none")}>{t("accept")}</button>
          <button type="button" disabled={w.busy} onClick={() => setDeclining(true)} className={cn(quiet, "flex-1 sm:flex-none")}>{t("decline")}</button>
        </div>
      ) : (
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); if (reason.trim()) go(false); }}>
          <label className={cn(label, "flex-1")}>{t("why")}<input required autoFocus value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={t("whyPlaceholder")} className={control} /></label>
          <div className="flex gap-2">
            <button type="submit" disabled={w.busy || !reason.trim()} className={primary}>{t("sendDecline")}</button>
            <button type="button" onClick={() => setDeclining(false)} className={quiet}>{t("back")}</button>
          </div>
        </form>
      )}
      {w.error && <p role="alert" className="text-[13px] text-crit">{t("cannotAnswer")}</p>}
    </div>
  );
}

export function ReplaceDocument({ id, today }: { id: string; today: string }) {
  const t = useTranslations("workspace.partner");
  const tf = useTranslations("files");
  const w = useWrite();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<string | undefined>();
  const [expires, setExpires] = useState("");
  if (!open) return <button type="button" onClick={() => setOpen(true)} className={cn(quiet, "min-h-9 px-3 text-[13px]")}>{t("replace")}</button>;
  return (
    <form className="flex w-full flex-col gap-3 rounded-ctl border border-line bg-surface-2/50 p-3" onSubmit={(e) => { e.preventDefault(); w.run(async () => { if (!(await replaceDocument(id, file ?? "", expires)).ok) throw new Error(); setOpen(false); }, t("replaced")); }}>
      <FileDrop label={t("newCopy")} accept="image/*,application/pdf" value={file} onFile={(f) => setFile(f?.name)} errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }} capture="environment" />
      <SingleDatePicker label={t("validUntil")} minDate={today} value={expires || null} onChange={(d) => setExpires(d ?? "")} className="w-48" />
      <div className="flex gap-2">
        <button type="submit" disabled={w.busy || !file || !expires} className={primary}>{t("send")}</button>
        <button type="button" onClick={() => setOpen(false)} className={quiet}>{t("back")}</button>
      </div>
      {w.error && <p role="alert" className="text-[13px] text-crit">{t("replaceRefused")}</p>}
    </form>
  );
}
