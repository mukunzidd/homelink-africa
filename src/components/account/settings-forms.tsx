"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { AccountSession, IdCheck, Profile, SavedMethod, Segment } from "@/lib/domain/types";
import { addCard, addMomo, cycleId, deleteAccount, makeDefault, removeMethod, saveProfile, setTwoStep, signOutOthers, signOutSession, submitId } from "@/app/actions/account";
import { control, label, primary, quiet, useWrite } from "@/components/queue/queue-forms";
import { FileDrop } from "@/components/ui/file-drop";
import { Dialog } from "@/components/ui/dialog";
import { PreferencesPanel } from "@/components/shell/preference-controls";
import { usePreferences } from "@/lib/preferences/context";
import { cn } from "@/lib/cn";

const must = async (p: Promise<{ ok: boolean }>) => { if (!(await p).ok) throw new Error(); };
const card = "flex flex-col gap-4 rounded-card border border-line bg-surface p-5";
function useFiles() {
  const tf = useTranslations("files");
  return { type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") };
}

/**
 * Name, email, phone, photo and someone to call. A new email or phone is
 * only taken once a code sent to it comes back, so saving one goes on to
 * the code screen.
 */
export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations("account.settings");
  const w = useWrite();
  const router = useRouter();
  const files = useFiles();
  const [p, setP] = useState(profile);
  const changed = p.email !== profile.email ? p.email : p.phone !== profile.phone ? p.phone : null;
  return (
    <form className={card} onSubmit={(e) => { e.preventDefault(); w.run(async () => { await must(saveProfile(p)); if (changed) router.push(`/verify?to=${encodeURIComponent(changed)}&next=${encodeURIComponent("/account/settings")}`); }, changed ? t("codeSent", { to: changed }) : t("saved")); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t("name")}<input required autoComplete="name" value={p.name} maxLength={80} onChange={(e) => setP({ ...p, name: e.target.value })} className={control} /></label>
        <label className={label}>{t("email")}<input required type="email" autoComplete="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} className={control} /></label>
        <label className={label}>{t("phone")}<input required type="tel" autoComplete="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} className={control} /></label>
      </div>
      {changed && <p className="text-[13px] text-ink-2">{t("verifyHint")}</p>}
      <FileDrop label={t("photo")} accept="image/*" value={p.photoName} onFile={(f) => setP({ ...p, photoName: f?.name })} errors={files} capture="user" />
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-[14px] font-semibold text-ink">{t("emergency")}</legend>
        <label className={label}>{t("emergencyName")}<input value={p.emergency?.name ?? ""} maxLength={80} onChange={(e) => setP({ ...p, emergency: { name: e.target.value, phone: p.emergency?.phone ?? "" } })} className={control} /></label>
        <label className={label}>{t("emergencyPhone")}<input type="tel" value={p.emergency?.phone ?? ""} onChange={(e) => setP({ ...p, emergency: { name: p.emergency?.name ?? "", phone: e.target.value } })} className={control} /></label>
      </fieldset>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={w.busy} className={primary}>{t("save")}</button>
        {w.error && <span role="alert" className="text-[13px] text-crit">{t("checkFields")}</span>}
      </div>
    </form>
  );
}

export function PasswordForm() {
  const t = useTranslations("account.settings");
  const w = useWrite();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const bad = next.length > 0 && (next.length < 8 || next === cur);
  const mismatch = again.length > 0 && again !== next;
  return (
    <form className={card} onSubmit={(e) => { e.preventDefault(); if (!bad && !mismatch && cur && next) w.run(async () => { setCur(""); setNext(""); setAgain(""); }, t("passwordChanged")); }}>
      <h2 className="text-[16px] font-semibold text-ink">{t("password")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={label}>{t("currentPassword")}<input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} className={control} /></label>
        <label className={label}>{t("newPassword")}<input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} aria-invalid={bad} className={cn(control, bad && "border-crit")} /></label>
        <label className={label}>{t("again")}<input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} aria-invalid={mismatch} className={cn(control, mismatch && "border-crit")} /></label>
      </div>
      {bad && <p className="text-[13px] text-crit">{t("passwordRule")}</p>}
      {mismatch && <p className="text-[13px] text-crit">{t("passwordMismatch")}</p>}
      <button type="submit" disabled={w.busy || !cur || !next || bad || mismatch} className={cn(primary, "self-start")}>{t("changePassword")}</button>
    </form>
  );
}

export function TwoStep({ on }: { on: boolean }) {
  const t = useTranslations("account.settings");
  const w = useWrite();
  return (
    <div className={cn(card, "sm:flex-row sm:items-center sm:justify-between")}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[16px] font-semibold text-ink">{t("twoStep")}</h2>
        <p className="text-[14px] text-ink-2">{t("twoStepBody")}</p>
      </div>
      <button type="button" role="switch" aria-checked={on} disabled={w.busy} onClick={() => w.run(() => must(setTwoStep(!on)), on ? t("twoStepOff") : t("twoStepOn"))} className={cn("relative h-7 w-12 flex-none cursor-pointer rounded-full transition-colors", on ? "bg-brand" : "bg-line")}>
        <span className={cn("absolute top-1 size-5 rounded-full bg-surface shadow transition-all", on ? "left-6" : "left-1")} />
        <span className="sr-only">{t("twoStep")}</span>
      </button>
    </div>
  );
}

export function Sessions({ sessions, labels }: { sessions: AccountSession[]; labels: Record<string, string> }) {
  const t = useTranslations("account.settings");
  const w = useWrite();
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold text-ink">{t("sessions")}</h2>
        {sessions.length > 1 && <button type="button" disabled={w.busy} onClick={() => w.run(() => must(signOutOthers()), t("signedOutOthers"))} className={quiet}>{t("signOutOthers")}</button>}
      </div>
      <ul className="flex flex-col">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft py-3 first:border-0">
            <span className="flex flex-col">
              <span className="text-[14.5px] font-medium text-ink">{s.device}</span>
              <span className="text-[13px] text-ink-3">{s.city} · {s.current ? t("thisDevice") : labels[s.id]}</span>
            </span>
            {!s.current && <button type="button" disabled={w.busy} onClick={() => w.run(() => must(signOutSession(s.id)), t("signedOut"))} className="min-h-9 cursor-pointer rounded-ctl px-3 text-[13px] font-semibold text-ink-2 hover:text-crit">{t("signOut")}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Methods({ methods }: { methods: SavedMethod[] }) {
  const t = useTranslations("account.settings");
  const w = useWrite();
  const [removing, setRemoving] = useState<SavedMethod | null>(null);
  const [adding, setAdding] = useState<"card" | "mobileMoney" | null>(null);
  const [num, setNum] = useState("");
  const [exp, setExp] = useState("");
  const [name, setName] = useState("");
  const title = (m: SavedMethod) => (m.kind === "card" ? `${t(`brand.${m.brand ?? "card"}`)} •••• ${m.last4}` : `${t(`provider.${m.provider ?? "mtn"}`)} •••• ${m.last4}`);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col rounded-card border border-line bg-surface">
        {methods.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft px-4 py-3 first:border-0">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-mono text-[14.5px] text-ink">{title(m)}</span>
              <span className="text-[12.5px] text-ink-3">{m.kind === "card" ? t("expires", { date: m.expiry ?? "" }) : t("mobileMoney")}</span>
            </span>
            {m.isDefault ? <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[12px] font-semibold text-brand-deep">{t("default")}</span> : <button type="button" disabled={w.busy} onClick={() => w.run(() => must(makeDefault(m.id)), t("defaultSet"))} className="min-h-9 cursor-pointer rounded-ctl px-2 text-[13px] font-semibold text-brand hover:underline">{t("makeDefault")}</button>}
            <button type="button" onClick={() => setRemoving(m)} className="min-h-9 cursor-pointer rounded-ctl px-2 text-[13px] font-medium text-ink-2 hover:text-crit">{t("remove")}</button>
          </li>
        ))}
        {!methods.length && <li className="p-5 text-[14px] text-ink-3">{t("noMethods")}</li>}
      </ul>
      {adding ? (
        <form className={card} onSubmit={(e) => { e.preventDefault(); w.run(async () => { await must(adding === "card" ? addCard(num, exp, name) : addMomo(num)); setAdding(null); setNum(""); setExp(""); setName(""); }, t("added")); }}>
          <h2 className="text-[16px] font-semibold text-ink">{adding === "card" ? t("addCard") : t("addMomo")}</h2>
          {adding === "card" ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
              <label className={label}>{t("cardNumber")}<input inputMode="numeric" autoComplete="cc-number" required value={num} onChange={(e) => setNum(e.target.value.replace(/[^\d ]/g, "").slice(0, 23))} placeholder="4242 4242 4242 4242" className={cn(control, "font-mono")} /></label>
              <label className={label}>{t("expiry")}<input inputMode="numeric" autoComplete="cc-exp" required value={exp} onChange={(e) => setExp(e.target.value.replace(/[^\d/]/g, "").slice(0, 5))} placeholder="MM/YY" className={cn(control, "font-mono")} /></label>
              <label className={cn(label, "sm:col-span-2")}>{t("nameOnCard")}<input autoComplete="cc-name" required value={name} onChange={(e) => setName(e.target.value)} className={control} /></label>
            </div>
          ) : (
            <label className={label}>{t("momoNumber")}<input type="tel" required value={num} onChange={(e) => setNum(e.target.value)} placeholder="078 812 3456" className={cn(control, "font-mono")} /></label>
          )}
          <p className="text-[12.5px] text-ink-3">{t("weKeep")}</p>
          <div className="flex gap-2">
            <button type="submit" disabled={w.busy} className={primary}>{t("save")}</button>
            <button type="button" onClick={() => setAdding(null)} className={quiet}>{t("cancel")}</button>
          </div>
          {w.error && <p role="alert" className="text-[13px] text-crit">{adding === "card" ? t("cardRefused") : t("momoRefused")}</p>}
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setAdding("card")} className={quiet}>{t("addCard")}</button>
          <button type="button" onClick={() => setAdding("mobileMoney")} className={quiet}>{t("addMomo")}</button>
        </div>
      )}
      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={t("removeTitle")}
        description={removing ? t("removeBody", { what: title(removing) }) : ""}
        size="sm"
        footer={<>
          <button type="button" onClick={() => setRemoving(null)} className={quiet}>{t("keep")}</button>
          <button type="button" disabled={w.busy} onClick={() => w.run(async () => { await must(removeMethod(removing!.id)); setRemoving(null); }, t("removed"))} className="min-h-10 cursor-pointer rounded-ctl bg-crit px-4 text-[14px] font-semibold text-white">{t("remove")}</button>
        </>}
      />
    </div>
  );
}

/** The header menu's language, currency and theme, plus who the site is set up for. */
export function PreferencesForm() {
  const t = useTranslations("segment");
  const { segment, setSegment } = usePreferences();
  return (
    <div className="flex flex-col gap-5">
      <div className={cn(card, "max-w-md")}><PreferencesPanel /></div>
      <div className={cn(card, "max-w-md")}>
        <p className="text-[13px] font-medium text-ink-3">{t("label")}</p>
        <div role="group" aria-label={t("label")} className="grid grid-cols-2 gap-1 rounded-ctl bg-surface-2 p-1">
          {(["abroad", "rwanda"] as Segment[]).map((s) => (
            <button key={s} type="button" aria-pressed={segment === s} onClick={() => setSegment(s)} className={cn("h-9 cursor-pointer rounded-inner text-[14px]", segment === s ? "bg-surface font-medium text-ink shadow-[var(--shadow-card)]" : "text-ink-3")}>{t(s)}</button>
          ))}
        </div>
        <p className="text-[13px] text-ink-3">{t("hint")}</p>
      </div>
    </div>
  );
}

/**
 * Take a copy of everything, or leave. Deleting asks for the word in the
 * page's language and is refused while a booking is still to come, naming it.
 */
export function PrivacyForm({ data, word }: { data: unknown; word: string }) {
  const t = useTranslations("account.settings");
  const { setRole } = usePreferences();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (gone) {
    return (
      <div className={card}>
        <h2 className="font-display text-2xl font-semibold text-ink">{t("deletedTitle")}</h2>
        <p className="text-[15px] text-ink-2">{t("deletedBody")}</p>
        <button type="button" onClick={() => { router.push("/"); router.refresh(); }} className={cn(primary, "self-start")}>{t("toHome")}</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <div className={card}>
        <h2 className="text-[16px] font-semibold text-ink">{t("download")}</h2>
        <p className="text-[14px] text-ink-2">{t("downloadBody")}</p>
        <button
          type="button"
          onClick={() => {
            const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
            Object.assign(document.createElement("a"), { href: url, download: "homelink-my-data.json" }).click();
            URL.revokeObjectURL(url);
          }}
          className={cn(quiet, "self-start")}
        >
          {t("downloadButton")}
        </button>
      </div>
      <div className={cn(card, "border-crit/40")}>
        <h2 className="text-[16px] font-semibold text-crit">{t("deleteTitle")}</h2>
        <p className="text-[14px] text-ink-2">{t("deleteBody")}</p>
        <label className={cn(label, "max-w-xs")}>{t("typeWord", { word })}<input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className={cn(control, "font-mono")} /></label>
        <button type="button" disabled={typed.trim() !== word} onClick={() => { setBlocked(null); setConfirming(true); }} className="min-h-10 cursor-pointer self-start rounded-ctl bg-crit px-4 text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{t("deleteButton")}</button>
        {blocked && <p role="alert" className="rounded-ctl bg-warn-tint px-3 py-2 text-[14px] text-warn">{t("deleteBlocked", { reference: blocked })}</p>}
      </div>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmBody")}
        size="sm"
        footer={<>
          <button type="button" onClick={() => setConfirming(false)} className={quiet}>{t("keep")}</button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const r = await deleteAccount();
              setBusy(false);
              setConfirming(false);
              if (r.ok) {
                setRole("visitor");
                setGone(true);
              } else setBlocked(r.reference);
            }}
            className="min-h-10 cursor-pointer rounded-ctl bg-crit px-4 text-[14px] font-semibold text-white"
          >
            {t("deleteForever")}
          </button>
        </>}
      />
    </div>
  );
}

const DOCS: NonNullable<IdCheck["docType"]>[] = ["nationalId", "passport", "drivingLicence"];

export function IdCheckForm({ check }: { check: IdCheck }) {
  const t = useTranslations("account.id");
  const files = useFiles();
  const w = useWrite();
  const [doc, setDoc] = useState<NonNullable<IdCheck["docType"]>>(check.docType ?? "nationalId");
  const [front, setFront] = useState<string>();
  const [back, setBack] = useState<string>();
  const [selfie, setSelfie] = useState<string>();
  const needsBack = doc !== "passport";
  const ready = !!front && !!selfie && (!needsBack || !!back);
  const tone = { none: "border-line", pending: "border-warn/50 bg-warn-tint/40", verified: "border-brand/50 bg-brand-tint/50", retry: "border-crit/50 bg-crit-tint/40" }[check.status];
  return (
    <div className="flex flex-col gap-5">
      <div className={cn("flex flex-wrap items-center justify-between gap-3 rounded-card border p-4", tone)}>
        <div className="flex flex-col gap-1">
          <p className="text-[15px] font-semibold text-ink">{t(`status.${check.status}`)}</p>
          <p className="text-[14px] text-ink-2">{t(`statusBody.${check.status}`)}</p>
        </div>
        <button type="button" disabled={w.busy} onClick={() => w.run(() => must(cycleId()))} className="min-h-9 cursor-pointer rounded-ctl border border-dashed border-line px-3 text-[12.5px] text-ink-3 hover:text-ink">{t("previewCycle")}</button>
      </div>
      {check.status !== "verified" && check.status !== "pending" && (
        <form className={card} onSubmit={(e) => { e.preventDefault(); if (ready) w.run(() => must(submitId({ docType: doc, front: front!, back, selfie: selfie! })), t("sent")); }}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[14px] font-semibold text-ink">{t("which")}</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {DOCS.map((d) => (
                <label key={d} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-[14px]", doc === d ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink-2")}>
                  <input type="radio" name="doc" checked={doc === d} onChange={() => setDoc(d)} className="accent-[var(--brand)]" />{t(`doc.${d}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <FileDrop label={t("front")} accept="image/*,application/pdf" value={front} onFile={(f) => setFront(f?.name)} errors={files} capture="environment" />
            {needsBack && <FileDrop label={t("back")} accept="image/*,application/pdf" value={back} onFile={(f) => setBack(f?.name)} errors={files} capture="environment" />}
            <FileDrop label={t("selfie")} hint={t("selfieHint")} accept="image/*" value={selfie} onFile={(f) => setSelfie(f?.name)} errors={files} capture="user" />
          </div>
          <p className="text-[12.5px] text-ink-3">{t("privacy")}</p>
          <button type="submit" disabled={!ready || w.busy} className={cn(primary, "self-start")}>{t("send")}</button>
        </form>
      )}
    </div>
  );
}
