"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GuestDetails } from "@/lib/domain/types";
import { VALID } from "@/lib/booking/validation";
import { requestViewing } from "@/app/actions/viewings";
import { usePreferences } from "@/lib/preferences/context";
import { Link } from "@/i18n/navigation";
import { CheckIcon, MonitorIcon, PinIcon } from "@/components/ui/icons";
import { ChoiceCards, Field, StepSection, TextArea, TextInput } from "@/components/booking/fields";
import { cn } from "@/lib/cn";

/**
 * Asking to see a home for sale: how, which day, which hour, who you are.
 *
 * Days are a strip of chips with their free hours under them, so a day
 * with nothing left is simply not there; there is no "sorry, that slot is
 * gone" after the fact unless someone took it in the last minute, and then
 * the times refresh.
 */
export function ViewingForm({
  saleId,
  slug,
  days,
}: {
  saleId: string;
  slug: string;
  /** Free days with their free times, and each day's label formatted on the server. */
  days: { date: string; label: string; times: string[] }[];
}) {
  const t = useTranslations("booking.viewing");
  const tc = useTranslations("checkout");
  const tD = useTranslations("booking.details");
  const { role, setRole } = usePreferences();
  const [mode, setMode] = useState<"inPerson" | "video">("inPerson");
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [time, setTime] = useState<string | null>(null);
  const [contact, setContact] = useState<Partial<GuestDetails>>({});
  const [notes, setNotes] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { label: string; time: string }>(null);
  const [taken, setTaken] = useState<string[]>([]);

  const day = days.find((d) => d.date === date);
  const times = (day?.times ?? []).filter((x) => !taken.includes(`${date} ${x}`));
  const bad = {
    name: !VALID["guest-name"](contact.name ?? ""),
    email: !VALID["guest-email"](contact.email ?? ""),
    phone: !VALID["guest-phone"](contact.phone ?? ""),
  };

  async function submit() {
    setAttempted(true);
    if (!time || bad.name || bad.email || bad.phone) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }
    setBusy(true);
    const r = await requestViewing({
      saleId,
      mode,
      date,
      time,
      contact: { name: contact.name!, email: contact.email!, phone: contact.phone! },
      notes: notes.trim() || undefined,
    });
    setBusy(false);
    if (r.ok) {
      if (role === "visitor") setRole("guest");
      setDone({ label: day?.label ?? date, time });
    } else {
      setTaken((x) => [...x, `${date} ${time}`]);
      setTime(null);
    }
  }

  if (done) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-card border border-ok/30 bg-ok-tint/50 p-6">
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-full bg-ok text-white">
          <CheckIcon size={20} />
        </span>
        <h2 className="font-display text-2xl font-semibold text-ink">{t("doneTitle")}</h2>
        <p className="text-[15px] text-ink-2">{t("doneBody", { date: done.label, time: done.time })}</p>
        <p className="text-[14px] text-ink-2">{mode === "inPerson" ? t("bringPerson") : t("bringVideo")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/account/viewings" className="inline-flex min-h-11 items-center rounded-ctl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:bg-brand-deep">
            {t("seeViewings")}
          </Link>
          <Link href={`/buy/${slug}`} className="inline-flex min-h-11 items-center rounded-ctl border border-line bg-surface px-5 text-[15px] font-semibold text-ink">
            {t("back")}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <StepSection title={t("how")}>
        <ChoiceCards
          name={t("how")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "inPerson", title: t("inPerson"), body: t("inPersonBody"), icon: <PinIcon size={15} /> },
            { value: "video", title: t("video"), body: t("videoBody"), icon: <MonitorIcon size={15} /> },
          ]}
        />
      </StepSection>

      <StepSection title={t("day")}>
        <div role="radiogroup" aria-label={t("day")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              role="radio"
              aria-checked={d.date === date}
              onClick={() => {
                setDate(d.date);
                setTime(null);
              }}
              className={cn(
                "flex min-h-14 min-w-20 flex-none cursor-pointer flex-col items-center justify-center rounded-ctl border px-3 text-[13px] transition-colors",
                d.date === date ? "border-brand bg-brand-tint font-semibold text-brand-deep" : "border-line bg-surface text-ink-2 hover:border-ink-3/40",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-semibold text-ink-2">{t("time")}</p>
          <div role="radiogroup" aria-label={t("time")} className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {times.map((x) => (
              <button
                key={x}
                type="button"
                role="radio"
                aria-checked={x === time}
                aria-invalid={attempted && !time ? true : undefined}
                onClick={() => setTime(x)}
                className={cn(
                  "tnum min-h-11 cursor-pointer rounded-ctl border text-[14px] font-medium transition-colors",
                  x === time ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-ink hover:border-brand",
                )}
              >
                {x}
              </button>
            ))}
          </div>
          {attempted && !time && <p className="text-xs text-crit">{t("timeError")}</p>}
        </div>
      </StepSection>

      <StepSection title={t("contact")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tD("fullName")} error={attempted && bad.name && tc("fullNameError")} className="sm:col-span-2" id="v-name">
            {(a) => <TextInput {...a} invalid={a["aria-invalid"]} autoComplete="name" value={contact.name ?? ""} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />}
          </Field>
          <Field label={tD("email")} error={attempted && bad.email && tc("emailError")} id="v-email">
            {(a) => <TextInput {...a} invalid={a["aria-invalid"]} type="email" autoComplete="email" value={contact.email ?? ""} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />}
          </Field>
          <Field label={tD("phone")} error={attempted && bad.phone && tc("phoneError")} id="v-phone">
            {(a) => <TextInput {...a} invalid={a["aria-invalid"]} type="tel" autoComplete="tel" value={contact.phone ?? ""} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />}
          </Field>
        </div>
        <Field label={t("notes")} id="v-notes">
          {(a) => <TextArea {...a} maxLength={500} placeholder={t("notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </StepSection>

      <button type="button" onClick={submit} disabled={busy} className="min-h-12 cursor-pointer rounded-ctl bg-brand px-6 text-[16px] font-semibold text-on-brand hover:bg-brand-deep disabled:opacity-70 sm:self-end">
        {busy ? t("sending") : t("submit")}
      </button>
    </div>
  );
}
