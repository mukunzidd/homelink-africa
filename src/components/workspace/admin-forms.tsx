"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Announcement, ServiceKind, StaffMember } from "@/lib/domain/types";
import { deactivateStaff, inviteStaff, saveContent, saveSettings, setStaffRole } from "@/app/actions/admin";
import { control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { ChevronDownIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const ROLES: StaffMember["role"][] = ["ops", "admin", "driver", "guide"];
const must = async (p: Promise<{ ok: boolean }>) => { if (!(await p).ok) throw new Error(); };

function SaveBar({ busy, error, dirty = true }: { busy: boolean; error: string | null; dirty?: boolean }) {
  const t = useTranslations("workspace.admin");
  return (
    <div className="flex items-center gap-3">
      <button type="submit" disabled={busy || !dirty} className={primary}>{t("save")}</button>
      {error && <span role="alert" className="text-[13px] text-crit">{t("refused")}</span>}
    </div>
  );
}

export function InviteForm() {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffMember["role"]>("ops");
  return (
    <form className="flex flex-wrap items-end gap-2 rounded-card border border-line bg-surface p-4" onSubmit={(e) => { e.preventDefault(); w.run(async () => { await must(inviteStaff(email, role)); setEmail(""); }, t("invited", { email })); }}>
      <label className={cn(label, "min-w-60 flex-1")}>{t("email")}<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={control} /></label>
      <label className={cn(label, "w-40")}>{t("role")}<select value={role} onChange={(e) => setRole(e.target.value as StaffMember["role"])} className={control}>{ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}</select></label>
      <button type="submit" disabled={w.busy} className={primary}>{t("invite")}</button>
      {w.error && <p role="alert" className="w-full text-[13px] text-crit">{t("inviteRefused")}</p>}
    </form>
  );
}

export function StaffControls({ id, role, status }: { id: string; role: StaffMember["role"]; status: StaffMember["status"] }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select aria-label={t("role")} value={role} disabled={w.busy || status === "deactivated"} onChange={(e) => w.run(() => must(setStaffRole(id, e.target.value)), t("roleChanged"))} className="min-h-9 rounded-ctl border border-line bg-surface px-2 text-[13px] text-ink">
        {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}`)}</option>)}
      </select>
      {status !== "deactivated" && <button type="button" disabled={w.busy} onClick={() => w.run(() => must(deactivateStaff(id)), t("deactivated"))} className="min-h-9 cursor-pointer rounded-ctl px-2 text-[13px] font-medium text-ink-2 hover:text-crit">{t("deactivate")}</button>}
      {w.error && <span role="alert" className="w-full text-right text-[12.5px] text-crit">{t("lastAdmin")}</span>}
    </div>
  );
}

export function AnnouncementsEditor({ initial, today }: { initial: Announcement[]; today: string }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [list, setList] = useState(initial);
  const set = (i: number, patch: Partial<Announcement>) => setList(list.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveContent({ announcements: list })), t("saved")); }}>
      {list.map((a, i) => (
        <div key={a.id} className="grid gap-2 rounded-ctl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_150px_150px_auto] sm:items-end">
          <label className={label}>{t("annText")}<input required maxLength={200} value={a.text} onChange={(e) => set(i, { text: e.target.value })} className={control} /></label>
          <label className={label}>{t("from")}<input type="date" required value={a.start} onChange={(e) => set(i, { start: e.target.value })} className={control} /></label>
          <label className={label}>{t("until")}<input type="date" required min={a.start} value={a.end} onChange={(e) => set(i, { end: e.target.value })} className={control} /></label>
          <button type="button" aria-label={t("remove")} onClick={() => setList(list.filter((_, j) => j !== i))} className="grid size-10 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-crit-tint hover:text-crit"><CloseIcon size={14} /></button>
        </div>
      ))}
      <button type="button" disabled={list.length >= 5} onClick={() => setList([...list, { id: `ann_${Date.now()}`, text: "", start: today, end: today }])} className={cn(quiet, "inline-flex items-center gap-2 self-start")}><PlusIcon size={14} />{t("addAnnouncement")}</button>
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

export function FeaturedEditor({ homes, initial }: { homes: { id: string; name: string }[]; initial: string[] }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [ids, setIds] = useState(initial);
  const name = (id: string) => homes.find((h) => h.id === id)?.name ?? id;
  const move = (i: number, to: number) => { if (to < 0 || to >= ids.length) return; const n = [...ids]; [n[i], n[to]] = [n[to], n[i]]; setIds(n); };
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveContent({ featured: ids })), t("saved")); }}>
      <ol className="flex flex-col gap-1.5">
        {ids.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-ctl border border-line bg-surface px-3 py-2 text-[14px]">
            <span className="tnum w-5 text-ink-3">{i + 1}.</span>
            <span className="flex-1 text-ink">{name(id)}</span>
            <button type="button" aria-label={t("up", { name: name(id) })} disabled={i === 0} onClick={() => move(i, i - 1)} className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 disabled:opacity-30"><ChevronDownIcon size={14} className="rotate-180" /></button>
            <button type="button" aria-label={t("down", { name: name(id) })} disabled={i === ids.length - 1} onClick={() => move(i, i + 1)} className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 disabled:opacity-30"><ChevronDownIcon size={14} /></button>
            <button type="button" aria-label={t("remove")} onClick={() => setIds(ids.filter((x) => x !== id))} className="grid size-8 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:text-crit"><CloseIcon size={13} /></button>
          </li>
        ))}
      </ol>
      <label className={cn(label, "max-w-sm")}>
        {t("addHome")}
        <select value="" onChange={(e) => e.target.value && setIds([...ids, e.target.value])} className={control}>
          <option value="">{t("choose")}</option>
          {homes.filter((h) => !ids.includes(h.id)).map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </label>
      <p className="text-[12.5px] text-ink-3">{t("featuredHint")}</p>
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

export function NeighbourhoodsEditor({ names, initial }: { names: string[]; initial: Record<string, { text?: string; showLandmarks?: boolean }> }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [map, setMap] = useState(initial);
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveContent({ neighbourhoods: map })), t("saved")); }}>
      {names.map((n) => (
        <div key={n} className="grid gap-2 rounded-ctl border border-line bg-surface p-3 sm:grid-cols-[140px_minmax(0,1fr)_auto] sm:items-center">
          <span className="text-[14px] font-semibold text-ink">{n}</span>
          <input aria-label={t("ourLine", { name: n })} maxLength={300} value={map[n]?.text ?? ""} placeholder={t("ourLinePlaceholder")} onChange={(e) => setMap({ ...map, [n]: { ...map[n], text: e.target.value } })} className={control} />
          <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={map[n]?.showLandmarks !== false} onChange={(e) => setMap({ ...map, [n]: { ...map[n], showLandmarks: e.target.checked } })} className="size-4 accent-[var(--brand)]" />{t("showTimes")}</label>
        </div>
      ))}
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

type ExtraRow = { key: string; lane: ServiceKind; francs: number; enabled: boolean };
export function ExtrasForm({ rows }: { rows: ExtraRow[] }) {
  const t = useTranslations("workspace.admin");
  const tx = useTranslations("extras");
  const w = useWrite();
  const [list, setList] = useState(rows);
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveSettings({ extras: Object.fromEntries(list.map((r) => [r.key, { francs: r.francs, enabled: r.enabled }])) })), t("saved")); }}>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((r, i) => (
          <div key={r.key} className="flex items-center gap-3 rounded-ctl border border-line bg-surface px-3 py-2">
            <input type="checkbox" aria-label={t("offered", { name: tx(`${r.key}.name`) })} checked={r.enabled} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)))} className="size-4 accent-[var(--brand)]" />
            <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-[14px] font-medium text-ink">{tx(`${r.key}.name`)}</span><span className="text-[12px] text-ink-3">{t(`lanes.${r.lane}`)}</span></span>
            <label className="flex items-center gap-1.5 text-[12.5px] text-ink-3">RWF<input inputMode="numeric" value={r.francs} onChange={(e) => setList(list.map((x, j) => (j === i ? { ...x, francs: Number(e.target.value.replace(/[^\d]/g, "")) } : x)))} className="tnum min-h-9 w-24 rounded-ctl border border-line bg-surface px-2 text-right text-[14px] text-ink" /></label>
          </div>
        ))}
      </div>
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

type PromoRow = { code: string; percent: number; capRwf: number; validUntil: string; lane?: string };
export function PromosForm({ rows, today }: { rows: PromoRow[]; today: string }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [list, setList] = useState(rows);
  const set = (i: number, p: Partial<PromoRow>) => setList(list.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveSettings({ promos: list })), t("saved")); }}>
      {list.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-ctl border border-line bg-surface p-3 sm:grid-cols-[1fr_90px_130px_150px_150px_auto] sm:items-end">
          <label className={label}>{t("code")}<input required value={p.code} maxLength={20} onChange={(e) => set(i, { code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} className={cn(control, "font-mono")} /></label>
          <label className={label}>{t("percent")}<input type="number" min={1} max={90} value={p.percent} onChange={(e) => set(i, { percent: Number(e.target.value) })} className={control} /></label>
          <label className={label}>{t("cap")}<input inputMode="numeric" value={p.capRwf} onChange={(e) => set(i, { capRwf: Number(e.target.value.replace(/[^\d]/g, "")) })} className={cn(control, "tnum")} /></label>
          <label className={label}>{t("expires")}<input type="date" min={today} value={p.validUntil} onChange={(e) => set(i, { validUntil: e.target.value })} className={control} /></label>
          <label className={label}>{t("lane")}<select value={p.lane ?? ""} onChange={(e) => set(i, { lane: e.target.value || undefined })} className={control}><option value="">{t("anyLane")}</option>{(["stay", "car", "experience"] as const).map((l) => <option key={l} value={l}>{t(`lanes.${l}`)}</option>)}</select></label>
          <button type="button" aria-label={t("remove")} onClick={() => setList(list.filter((_, j) => j !== i))} className="grid size-10 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:text-crit"><CloseIcon size={14} /></button>
        </div>
      ))}
      <button type="button" onClick={() => setList([...list, { code: "", percent: 10, capRwf: 50_000, validUntil: today }])} className={cn(quiet, "inline-flex items-center gap-2 self-start")}><PlusIcon size={14} />{t("addCode")}</button>
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

export function NumbersForm({ fields, kind }: { fields: { key: string; label: string; value: number; step?: number }[]; kind: "windows" | "fxDisplay" }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [vals, setVals] = useState(Object.fromEntries(fields.map((f) => [f.key, f.value])));
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveSettings({ [kind]: vals })), t("saved")); }}>
      <div className="flex flex-wrap gap-3">
        {fields.map((f) => (
          <label key={f.key} className={cn(label, "w-48")}>{f.label}<input type="number" step={f.step ?? 1} min={0} value={vals[f.key]} onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) })} className={cn(control, "tnum")} /></label>
        ))}
      </div>
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

export function BankForm({ bank }: { bank: Record<string, string> }) {
  const t = useTranslations("workspace.admin");
  const w = useWrite();
  const [vals, setVals] = useState(bank);
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); w.run(() => must(saveSettings({ bank: vals })), t("saved")); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.keys(bank).map((k) => (
          <label key={k} className={label}>{t(`bank.${k}`)}<input value={vals[k]} maxLength={80} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className={cn(control, k === "accountNumber" || k === "swift" ? "font-mono" : "")} /></label>
        ))}
      </div>
      <SaveBar busy={w.busy} error={w.error} />
    </form>
  );
}

/** The rows on screen as a CSV file, made in the browser: nothing leaves for a server to build it. */
export function ExportCsv({ rows, name }: { rows: string[][]; name: string }) {
  const t = useTranslations("workspace.admin");
  return (
    <button
      type="button"
      onClick={() => {
        const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
        // A leading = + - @ would run as a formula in a spreadsheet; a quote makes it text.
        const safe = (v: string) => (/^[=+\-@]/.test(v) ? `'${v}` : v);
        const csv = rows.map((r) => r.map((c) => cell(safe(c))).join(",")).join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = Object.assign(document.createElement("a"), { href: url, download: name });
        a.click();
        URL.revokeObjectURL(url);
      }}
      className={quiet}
    >
      {t("export")}
    </button>
  );
}
