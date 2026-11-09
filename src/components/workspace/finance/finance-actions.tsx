"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { approveRefund, markPayoutPaid, matchLine, releaseDeposit } from "@/app/actions/finance";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import { control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { numberLocale } from "@/lib/domain/money";

function Act({ run, text, done, tone = "quiet" }: { run: () => Promise<{ ok: boolean }>; text: string; done: string; tone?: "quiet" | "primary" }) {
  const w = useWrite();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={w.busy} onClick={() => w.run(async () => { if (!(await run()).ok) throw new Error(); }, done)} className={cn(tone === "primary" ? primary : quiet, "min-h-9 px-3 text-[13px]")}>
        {text}
      </button>
      {w.error && <span role="alert" className="text-[12.5px] text-crit">{w.error}</span>}
    </span>
  );
}

export function ApproveRefund({ id }: { id: string }) {
  const t = useTranslations("workspace.finance");
  return <Act run={() => approveRefund(id)} text={t("approve")} done={t("approved")} tone="primary" />;
}
export function MatchLine({ lineId, paymentId }: { lineId: string; paymentId: string }) {
  const t = useTranslations("workspace.finance");
  return <Act run={() => matchLine(lineId, paymentId)} text={t("match")} done={t("matched")} />;
}
export function PayPayout({ id }: { id: string }) {
  const t = useTranslations("workspace.finance");
  return <Act run={() => markPayoutPaid(id)} text={t("markPaid")} done={t("paidDone")} tone="primary" />;
}

/**
 * Deductions need a reason, and admin reads the sentence the tenant will
 * get before it is sent: the amount back, the amount kept, and why.
 */
export function ReleaseDeposit({ bookingId, depositMajor, currency }: { bookingId: string; depositMajor: number; currency: string }) {
  const t = useTranslations("workspace.finance");
  const intl = INTL_LOCALES[useLocale() as Locale];
  const w = useWrite();
  const [kept, setKept] = useState("0");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const keptN = Number(kept.replace(/[\s,]/g, "")) || 0;
  const fmt = (n: number) => `${currency} ${new Intl.NumberFormat(numberLocale(intl)).format(n)}`;
  const invalid = keptN < 0 || keptN > depositMajor || (keptN > 0 && !reason.trim());
  const sentence = keptN > 0 ? t("sentenceKept", { back: fmt(depositMajor - keptN), deposit: fmt(depositMajor), kept: fmt(keptN), reason: reason.trim() }) : t("sentenceFull", { deposit: fmt(depositMajor) });
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (!invalid) setConfirming(true); }}>
      <div className="flex flex-wrap items-end gap-2">
        <label className={cn(label, "w-44")}>
          {t("keep", { currency })}
          <input inputMode="decimal" value={kept} onChange={(e) => setKept(e.target.value)} className={cn(control, "tnum", keptN > depositMajor && "border-crit")} />
        </label>
        <label className={cn(label, "min-w-56 flex-1")}>
          {t("reason")}
          <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} aria-invalid={keptN > 0 && !reason.trim()} placeholder={t("reasonPlaceholder")} className={cn(control, keptN > 0 && !reason.trim() && "border-crit")} />
        </label>
        <button type="submit" disabled={invalid || w.busy} className={primary}>{t("release")}</button>
      </div>
      {keptN > 0 && !reason.trim() && <p className="text-[12.5px] text-crit">{t("reasonNeeded")}</p>}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("confirmTitle")}
        description={t("confirmBody")}
        footer={
          <>
            <button type="button" onClick={() => setConfirming(false)} className={quiet}>{t("back")}</button>
            <button type="button" disabled={w.busy} onClick={() => w.run(async () => { if (!(await releaseDeposit(bookingId, keptN, reason)).ok) throw new Error(); setConfirming(false); }, t("released"))} className={primary}>{t("send")}</button>
          </>
        }
      >
        <blockquote className="rounded-ctl border-l-4 border-brand bg-surface-2 px-4 py-3 text-[15px] leading-relaxed text-ink">{sentence}</blockquote>
      </Dialog>
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </form>
  );
}
