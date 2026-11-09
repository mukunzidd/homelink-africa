"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { INTL_LOCALES, type Locale } from "@/i18n/routing";
import type { HousekeepingTask, MaintenanceTicket } from "@/lib/domain/types";
import { addTicketNote, blockForTicket, createTicket, unblockForTicket, updateHousekeeping, updateTicket } from "@/app/actions/work";
import { Caption, TeamSelect, control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { Select } from "@/components/ui/select";
import { SingleDatePicker } from "@/components/ui/single-date-picker";
import { FileDrop } from "@/components/ui/file-drop";
import { cn } from "@/lib/cn";
import { dateTimeFormat } from "@/lib/domain/date-format";

const HK: HousekeepingTask["status"][] = ["todo", "inProgress", "ready", "issue"];

/** Who has the clean, how far it got, and anything the next person should know. */
export function HousekeepingActions({ task, team }: { task: HousekeepingTask; team: string[] }) {
  const t = useTranslations("workspace.work");
  const w = useWrite();
  const [note, setNote] = useState(task.note ?? "");
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
        <Caption text={t("cleaner")}>
          <TeamSelect team={team} name={t("cleaner")} value={task.assignee ?? ""} onChange={(v) => w.run(() => updateHousekeeping(task.id, { assignee: v }), t("assignedTo", { name: v || t("nobody") }))} />
        </Caption>
        <div className={label}>
          {t("progress")}
          <div role="group" aria-label={t("progress")} className="grid grid-cols-2 gap-1 rounded-ctl bg-surface-2 p-1 sm:grid-cols-4">
            {HK.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={task.status === s}
                disabled={w.busy}
                onClick={() => w.run(() => updateHousekeeping(task.id, { status: s }), t(`hkDone.${s}`))}
                className={cn(
                  "min-h-9 cursor-pointer rounded-inner px-2 text-[13px] font-medium transition-colors",
                  task.status === s ? (s === "issue" ? "bg-crit-tint text-crit" : s === "ready" ? "bg-brand text-on-brand" : "bg-surface text-ink shadow-[var(--shadow-card)]") : "text-ink-2 hover:text-ink",
                )}
              >
                {t(`hk.${s}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          w.run(() => updateHousekeeping(task.id, { note }), t("noteSaved"));
        }}
      >
        <label className="sr-only" htmlFor={`hk-note-${task.id}`}>{t("note")}</label>
        <input id={`hk-note-${task.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder={t("notePlaceholder")} className={cn(control, "flex-1")} />
        <button type="submit" disabled={w.busy || note === (task.note ?? "")} className={quiet}>{t("saveNote")}</button>
      </form>
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </div>
  );
}

const STATUSES: MaintenanceTicket["status"][] = ["open", "scheduled", "inProgress", "done"];
const PRIORITIES: MaintenanceTicket["priority"][] = ["urgent", "normal", "low"];

/** Move a repair on: who, when, how far, what was said, and whether the home is off sale for it. */
export function TicketActions({ ticket, team, today }: { ticket: MaintenanceTicket; team: string[]; today: string }) {
  const t = useTranslations("workspace.work");
  const intl = INTL_LOCALES[useLocale() as Locale];
  const day = (d: string) => dateTimeFormat(intl, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const w = useWrite();
  const [when, setWhen] = useState(ticket.scheduledFor ?? "");
  const [note, setNote] = useState("");
  const [from, setFrom] = useState(ticket.scheduledFor && ticket.scheduledFor >= today ? ticket.scheduledFor : today);
  const [nights, setNights] = useState("1");
  const [blockError, setBlockError] = useState<string | null>(null);
  const people = [...new Set([...team, ...(ticket.assignee ? [ticket.assignee] : [])])];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Caption text={t("status")}>
          <Select label={t("status")} hideLabel value={ticket.status} disabled={w.busy} onChange={(v) => w.run(() => updateTicket(ticket.id, { status: v as MaintenanceTicket["status"] }), t("moved"))} options={STATUSES.map((s) => ({ value: s, label: t(`ticket.${s}`) }))} />
        </Caption>
        <Caption text={t("priority")}>
          <Select label={t("priority")} hideLabel value={ticket.priority} disabled={w.busy} onChange={(v) => w.run(() => updateTicket(ticket.id, { priority: v as MaintenanceTicket["priority"] }), t("moved"))} options={PRIORITIES.map((p) => ({ value: p, label: t(`priorityName.${p}`) }))} />
        </Caption>
        <Caption text={t("fixer")}>
          <TeamSelect team={people} name={t("fixer")} value={ticket.assignee ?? ""} onChange={(v) => w.run(() => updateTicket(ticket.id, { assignee: v }), t("assignedTo", { name: v || t("nobody") }))} />
        </Caption>
      </div>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          w.run(() => updateTicket(ticket.id, { scheduledFor: when }), when ? t("scheduledFor", { date: day(when) }) : t("unscheduled"));
        }}
      >
        <SingleDatePicker label={t("visit")} value={when || null} minDate={today} onChange={(d) => setWhen(d ?? "")} className="w-48" />
        <button type="submit" disabled={w.busy || when === (ticket.scheduledFor ?? "")} className={quiet}>{t("setVisit")}</button>
      </form>

      <div className="flex flex-col gap-2 rounded-ctl border border-line bg-surface p-3">
        <p className="text-[13px] font-semibold text-ink">{t("blockTitle")}</p>
        {ticket.blockedDates?.length ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[13px] text-ink-2">{t("blockedFor", { count: ticket.blockedDates.length, first: day(ticket.blockedDates[0]), last: day(ticket.blockedDates.at(-1)!) })}</p>
            <button type="button" disabled={w.busy} onClick={() => w.run(() => unblockForTicket(ticket.id), t("unblocked"))} className={quiet}>{t("unblock")}</button>
          </div>
        ) : (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setBlockError(null);
              w.run(async () => {
                const r = await blockForTicket(ticket.id, from, Number(nights));
                if (!r.ok) {
                  setBlockError(r.reason === "booked" ? t("blockBooked", { dates: r.dates.map(day).join(", ") }) : t("blockInvalid"));
                  return;
                }
              }, undefined);
            }}
          >
            <SingleDatePicker label={t("from")} value={from || null} minDate={today} onChange={(d) => setFrom(d ?? "")} className="w-44" />
            <label className={cn(label, "w-28")}>
              {t("nights")}
              <input type="number" min={1} max={30} value={nights} onChange={(e) => setNights(e.target.value)} className={control} />
            </label>
            <button type="submit" disabled={w.busy} className={quiet}>{t("block")}</button>
          </form>
        )}
        <p className="text-[12.5px] text-ink-3">{t("blockHint")}</p>
        {blockError && <p role="alert" className="text-[13px] text-crit">{blockError}</p>}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          w.run(async () => {
            const r = await addTicketNote(ticket.id, note);
            if (!r.ok) throw new Error();
            setNote("");
          }, t("noteSaved"));
        }}
      >
        <label className={label}>
          {t("addNote")}
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder={t("ticketNotePlaceholder")} className={cn(control, "py-2")} />
        </label>
        <button type="submit" disabled={w.busy || !note.trim()} className={cn(primary, "self-start")}>{t("addNote")}</button>
      </form>
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </div>
  );
}

/** A repair someone on the team spotted. Tickets from guests come through incidents. */
export function NewTicket({ homes, startOpen }: { homes: { id: string; name: string }[]; startOpen: boolean }) {
  const t = useTranslations("workspace.work");
  const tf = useTranslations("files");
  const w = useWrite();
  const [open, setOpen] = useState(startOpen);
  const [listingId, setListingId] = useState(homes[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<MaintenanceTicket["priority"]>("normal");
  const [photo, setPhoto] = useState<string | undefined>();
  const [tried, setTried] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={cn(primary, "self-start")}>
        {t("newTicket")}
      </button>
    );
  }
  return (
    <form
      className="flex w-full flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (!title.trim()) return;
        w.run(async () => {
          const r = await createTicket({ listingId, title, description, priority, photoName: photo });
          if (!r.ok) throw new Error();
          setOpen(false);
          setTitle("");
          setDescription("");
          setPhoto(undefined);
          setTried(false);
        }, t("ticketCreated"));
      }}
    >
      <h2 className="text-[16px] font-semibold text-ink">{t("newTicket")}</h2>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Caption text={t("home")}>
          <Select label={t("home")} hideLabel value={listingId} onChange={setListingId} options={homes.map((h) => ({ value: h.id, label: h.name }))} />
        </Caption>
        <Caption text={t("priority")}>
          <Select label={t("priority")} hideLabel value={priority} onChange={(v) => setPriority(v as MaintenanceTicket["priority"])} options={PRIORITIES.map((p) => ({ value: p, label: t(`priorityName.${p}`) }))} />
        </Caption>
      </div>
      <label className={label}>
        {t("what")}
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} aria-invalid={tried && !title.trim()} placeholder={t("whatPlaceholder")} className={cn(control, tried && !title.trim() && "border-crit")} />
      </label>
      <label className={label}>
        {t("details")}
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} className={cn(control, "py-2")} />
      </label>
      <FileDrop
        label={t("photo")}
        accept="image/*"
        value={photo}
        onFile={(f) => setPhoto(f?.name)}
        errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }}
        capture="environment"
      />
      <div className="flex gap-2">
        <button type="submit" disabled={w.busy} className={primary}>{t("create")}</button>
        <button type="button" onClick={() => setOpen(false)} className={quiet}>{t("cancel")}</button>
      </div>
      {w.error && <p role="alert" className="text-[13px] text-crit">{w.error}</p>}
    </form>
  );
}
