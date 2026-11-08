"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { Incident, ServiceKind } from "@/lib/domain/types";
import { CHECKLIST } from "@/lib/workspace/inspection";
import {
  assignAsk,
  incidentToTicket,
  publishInspection,
  quoteAsk,
  recordInspection,
  scheduleInspection,
  setAskStatus,
  updateIncident,
} from "@/app/actions/queue";
import { useToast } from "@/components/notifications/toaster";
import { cn } from "@/lib/cn";

export const control = "min-h-10 w-full rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink";
export const primary = "min-h-10 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-60";
export const quiet = "min-h-10 cursor-pointer rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink hover:border-brand disabled:opacity-60";
export const label = "flex flex-col gap-1 text-[12.5px] text-ink-3";

/** Runs a write, then refreshes the server page; a refusal shows inline. */
export function useWrite() {
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("workspace.queue");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (done) toast.show({ title: done, tone: "ok" });
      router.refresh();
    } catch {
      setError(t("notAllowed"));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

export function TeamSelect({ team, value, onChange, name }: { team: string[]; value: string; onChange: (v: string) => void; name: string }) {
  const t = useTranslations("workspace.queue");
  return (
    <select aria-label={name} value={value} onChange={(e) => onChange(e.target.value)} className={control}>
      <option value="">{t("nobody")}</option>
      {team.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

export function AskActions({ id, owner, status, team }: { id: string; owner?: string; status: string; team: string[] }) {
  const t = useTranslations("workspace.queue");
  const w = useWrite();
  const [francs, setFrancs] = useState("");
  const [note, setNote] = useState("");
  const amount = Number(francs.replace(/[\s,.]/g, ""));
  return (
    <div className="flex flex-col gap-4">
      <label className={cn(label, "max-w-xs")}>
        {t("owner")}
        <TeamSelect team={team} name={t("owner")} value={owner ?? ""} onChange={(v) => w.run(() => assignAsk(id, v), t("assigned", { name: v || t("nobody") }))} />
      </label>
      {(status === "open" || status === "quoted") && (
        <form
          className="flex flex-col gap-2 rounded-ctl border border-line bg-surface p-3"
          onSubmit={(e) => {
            e.preventDefault();
            w.run(async () => {
              const r = await quoteAsk(id, amount, note);
              if (!r.ok) throw new Error();
            }, t("quoteSent"));
          }}
        >
          <p className="text-[14px] font-semibold text-ink">{t("quote")}</p>
          <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
            <label className={label}>{t("quoteAmount")}<input inputMode="numeric" value={francs} onChange={(e) => setFrancs(e.target.value)} className={cn(control, "tnum")} /></label>
            <label className={label}>{t("quoteNote")}<input value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("quoteNoteHint")} className={control} /></label>
          </div>
          <p className="text-[12.5px] text-ink-3">{t("quoteHint")}</p>
          <button type="submit" disabled={w.busy || !(amount > 0)} className={cn(primary, "self-start")}>{t("quoteSend")}</button>
        </form>
      )}
      <div className="flex flex-wrap gap-2">
        {status !== "arranged" && <button type="button" disabled={w.busy} onClick={() => w.run(() => setAskStatus(id, "arranged"), t("markedArranged"))} className={primary}>{t("markArranged")}</button>}
        {status !== "declined" && status !== "arranged" && <button type="button" disabled={w.busy} onClick={() => w.run(() => setAskStatus(id, "declined"))} className={quiet}>{t("decline")}</button>}
        {(status === "declined" || status === "arranged") && <button type="button" disabled={w.busy} onClick={() => w.run(() => setAskStatus(id, "open"))} className={quiet}>{t("reopen")}</button>}
      </div>
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </div>
  );
}

export function InspectionActions({
  id,
  service,
  status,
  scheduledFor,
  inspector,
  checklist,
  notes,
  team,
  today,
  admin,
}: {
  id: string;
  service: ServiceKind;
  status: string;
  scheduledFor?: string;
  inspector?: string;
  checklist?: Record<string, boolean>;
  notes?: string;
  team: string[];
  today: string;
  admin: boolean;
}) {
  const t = useTranslations("workspace.queue");
  const w = useWrite();
  const [date, setDate] = useState(scheduledFor ?? "");
  const [who, setWho] = useState(inspector ?? "");
  const [points, setPoints] = useState<Record<string, boolean>>(checklist ?? {});
  const [text, setText] = useState(notes ?? "");
  const keys = CHECKLIST[service];
  const passed = keys.filter((k) => points[k]).length;
  if (status === "published") return null;
  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          w.run(async () => {
            const r = await scheduleInspection(id, date, who);
            if (!r.ok) throw new Error();
          }, t("visitBooked"));
        }}
      >
        <label className={label}>{t("date")}<input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={control} /></label>
        <label className={cn(label, "min-w-[180px]")}>{t("inspector")}<TeamSelect team={team} name={t("inspector")} value={who} onChange={setWho} /></label>
        <button type="submit" disabled={w.busy || !date || !who} className={quiet}>{scheduledFor ? t("reschedule") : t("schedule")}</button>
      </form>

      {(status === "scheduled" || status === "inspected") && (
        <form
          className="flex flex-col gap-3 rounded-ctl border border-line bg-surface p-3"
          onSubmit={(e) => {
            e.preventDefault();
            w.run(() => recordInspection(id, points, text), t("inspectionSaved"));
          }}
        >
          <div className="flex items-baseline justify-between">
            <p className="text-[14px] font-semibold text-ink">{t("checklist")}</p>
            <p className="tnum text-[13px] text-ink-2">{t("points", { passed, total: keys.length })}</p>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {keys.map((k) => (
              <label key={k} className={cn("flex min-h-10 cursor-pointer items-center gap-2.5 rounded-ctl border px-3 text-[14px]", points[k] ? "border-ok/40 bg-ok-tint/50 text-ink" : "border-line text-ink-2")}>
                <input type="checkbox" checked={!!points[k]} onChange={(e) => setPoints((p) => ({ ...p, [k]: e.target.checked }))} className="size-4 accent-[var(--brand)]" />
                {t(`check.${service}.${k}`)}
              </label>
            ))}
          </div>
          <label className={label}>{t("notes")}<textarea rows={2} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} className={cn(control, "py-2")} /></label>
          <button type="submit" disabled={w.busy} className={cn(primary, "self-start")}>{t("saveInspection")}</button>
        </form>
      )}

      {status === "inspected" &&
        (admin ? (
          <button
            type="button"
            disabled={w.busy}
            onClick={() =>
              w.run(async () => {
                const r = await publishInspection(id);
                if (!r.ok) throw new Error();
              }, t("publishedToast"))
            }
            className={cn(primary, "self-start")}
          >
            {t("publish")}
          </button>
        ) : (
          <p className="text-[13px] text-ink-3">{t("publishAdmin")}</p>
        ))}
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </div>
  );
}

export function IncidentActions({ id, status, assignee, team, stay, ticketId }: { id: string; status: Incident["status"]; assignee?: string; team: string[]; stay: boolean; ticketId?: string }) {
  const t = useTranslations("workspace.queue");
  const w = useWrite();
  return (
    <div className="flex flex-col gap-3">
      <div className="grid max-w-md gap-2 sm:grid-cols-2">
        <label className={label}>{t("who")}<TeamSelect team={team} name={t("who")} value={assignee ?? ""} onChange={(v) => w.run(() => updateIncident(id, { assignee: v }), t("assigned", { name: v || t("nobody") }))} /></label>
        <label className={label}>
          {t("status")}
          <select value={status} onChange={(e) => w.run(() => updateIncident(id, { status: e.target.value as Incident["status"] }))} className={control}>
            {(["open", "inProgress", "resolved"] as const).map((s) => <option key={s} value={s}>{t(`incidentStatus.${s}`)}</option>)}
          </select>
        </label>
      </div>
      {stay && !ticketId && (
        <button type="button" disabled={w.busy} onClick={() => w.run(async () => { const r = await incidentToTicket(id); if (!r.ok) throw new Error(); }, t("ticketOpened"))} className={cn(quiet, "self-start")}>
          {t("toTicket")}
        </button>
      )}
      {!stay && <p className="text-[13px] text-ink-3">{t("noHome")}</p>}
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </div>
  );
}
