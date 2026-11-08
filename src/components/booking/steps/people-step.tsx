"use client";

import { useEffect, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Experience, Participant } from "@/lib/domain/types";
import type { BookingDraft, DraftAction } from "@/lib/booking/draft";
import { ClockIcon } from "@/components/ui/icons";
import { ChoiceCards, Field, StepSection, TextArea, TextInput, controlClass } from "../fields";

/** Where most guests on a Rwandan day out come from, then everyone else. */
const NATIONALITIES = ["RW", "KE", "UG", "TZ", "BI", "CD", "US", "GB", "FR", "BE", "DE", "NL", "CA", "CN", "IN", "ZA", "NG"];

/**
 * A day out's first question: who is coming, and when.
 *
 * One row per person, because a park permit and a guide's headcount are
 * both per person. Passport details are asked only where a permit needs
 * them, with the reason said once above the rows. An age below the day's
 * minimum is refused with the minimum stated, not a bare "invalid".
 */
export function PeopleStep({
  draft,
  dispatch,
  attempted,
  experience,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  attempted: boolean;
  experience: Experience;
}) {
  const t = useTranslations("booking.people");
  const locale = useLocale();
  const slots = useMemo(() => experience.slots ?? [experience.departs], [experience.slots, experience.departs]);
  const permit = !!experience.requiresPermit;

  // Countries named in the reader's language, from the browser's own data.
  const names = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([locale === "rw" ? "en" : locale], { type: "region" });
      return Object.fromEntries(NATIONALITIES.map((c) => [c, dn.of(c) ?? c]));
    } catch {
      return Object.fromEntries(NATIONALITIES.map((c) => [c, c]));
    }
  }, [locale]);

  // One row per person, prefilled with the guest's own name in the first.
  useEffect(() => {
    if (draft.participants.length === draft.party) return;
    const rows: Participant[] = Array.from({ length: draft.party }, (_, i) =>
      draft.participants[i] ?? { name: i === 0 ? (draft.guest.name ?? "") : "", age: NaN },
    );
    dispatch({ type: "participants", value: rows });
  }, [draft.party, draft.participants, draft.guest.name, dispatch]);

  useEffect(() => {
    if (!draft.slot && slots.length === 1) dispatch({ type: "slot", value: slots[0] });
    if (!draft.pickup) dispatch({ type: "pickup", value: { kind: "address", detail: experience.meetingPoint } });
  }, [draft.slot, draft.pickup, slots, dispatch, experience.meetingPoint]);

  const update = (i: number, p: Partial<Participant>) =>
    dispatch({ type: "participants", value: draft.participants.map((x, j) => (j === i ? { ...x, ...p } : x)) });

  return (
    <div className="flex flex-col gap-5">
      <StepSection title={t("slot")}>
        {slots.length > 1 ? (
          <ChoiceCards
            name={t("slot")}
            value={draft.slot}
            onChange={(v) => dispatch({ type: "slot", value: v })}
            options={slots.map((s) => ({ value: s, title: <span className="tnum">{s}</span>, icon: <ClockIcon size={15} /> }))}
          />
        ) : (
          <p className="flex items-center gap-2 text-[15px] text-ink">
            <ClockIcon size={16} className="text-ink-3" />
            {t("fixedSlot", { time: slots[0] })}
          </p>
        )}
      </StepSection>

      <StepSection title={t("title")} body={t("body")}>
        {permit && (
          <p className="rounded-ctl border border-warn/30 bg-warn-tint/60 px-4 py-3 text-[13.5px] leading-relaxed text-ink-2">
            {t("permitNote")}
          </p>
        )}
        <ol className="flex flex-col gap-4">
          {draft.participants.map((p, i) => {
            const nameBad = attempted && p.name.trim().length < 2;
            const ageBad = attempted && (!Number.isInteger(p.age) || p.age < experience.minAge || p.age > 110);
            const natBad = attempted && permit && !p.nationality;
            const passBad = attempted && permit && (p.passport ?? "").trim().length < 5;
            return (
              <li key={i} className="flex flex-col gap-3 rounded-ctl border border-line-soft bg-surface-2/40 p-4">
                <p className="text-[13px] font-semibold text-ink-3">{t("person", { n: i + 1 })}</p>
                <div className="grid gap-3 sm:grid-cols-[1fr_96px]">
                  <Field label={t("name")} error={nameBad && t("nameError")} id={`p${i}-name`}>
                    {(a) => <TextInput {...a} invalid={a["aria-invalid"]} autoComplete={i === 0 ? "name" : "off"} value={p.name} onChange={(e) => update(i, { name: e.target.value })} />}
                  </Field>
                  <Field label={t("age")} error={ageBad && t("ageError", { min: experience.minAge })} id={`p${i}-age`}>
                    {(a) => (
                      <TextInput
                        {...a}
                        invalid={a["aria-invalid"]}
                        inputMode="numeric"
                        maxLength={3}
                        value={Number.isFinite(p.age) ? String(p.age) : ""}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, "");
                          update(i, { age: v ? Number(v) : NaN });
                        }}
                        className="tnum"
                      />
                    )}
                  </Field>
                </div>
                {permit && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t("nationality")} error={natBad && t("nationalityError")} id={`p${i}-nat`}>
                      {(a) => (
                        <select {...a} value={p.nationality ?? ""} onChange={(e) => update(i, { nationality: e.target.value || undefined })} className={`${controlClass(a["aria-invalid"])} cursor-pointer`}>
                          <option value="">{t("choose")}</option>
                          {NATIONALITIES.map((c) => (
                            <option key={c} value={c} suppressHydrationWarning>
                              {names[c]}
                            </option>
                          ))}
                          <option value="XX">{t("other")}</option>
                        </select>
                      )}
                    </Field>
                    <Field label={t("passport")} error={passBad && t("passportError")} id={`p${i}-passport`}>
                      {(a) => <TextInput {...a} invalid={a["aria-invalid"]} autoCapitalize="characters" spellCheck={false} value={p.passport ?? ""} onChange={(e) => update(i, { passport: e.target.value.toUpperCase() })} className="font-mono uppercase" />}
                    </Field>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </StepSection>

      <StepSection title={t("pickup")}>
        <Field label={<span className="sr-only">{t("pickup")}</span>} hint={t("pickupHint")} id="day-pickup">
          {(a) => <TextInput {...a} value={draft.pickup?.detail ?? ""} onChange={(e) => dispatch({ type: "pickup", value: { kind: "address", detail: e.target.value } })} />}
        </Field>
        <Field label={t("dietary")} id="dietary">
          {(a) => <TextArea {...a} rows={2} className="min-h-16" placeholder={t("dietaryPlaceholder")} value={draft.dietary ?? ""} onChange={(e) => dispatch({ type: "dietary", value: e.target.value })} />}
        </Field>
      </StepSection>
    </div>
  );
}
