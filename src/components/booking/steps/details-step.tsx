"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingDraft, DraftAction, FlowKind } from "@/lib/booking/draft";
import { VALID } from "@/lib/booking/validation";
import { usePreferences } from "@/lib/preferences/context";
import { Link } from "@/i18n/navigation";
import { UsersIcon } from "@/components/ui/icons";
import { Field, StepSection, TextArea, TextInput, ChoiceCards, controlClass } from "../fields";

const ARRIVALS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

/**
 * Who the booking is for, and how to reach them.
 *
 * A signed-in guest gets their details filled in and a line saying so; a
 * visitor is offered sign-in first and told plainly they can carry on
 * without it. Arrival time and the reason for the trip are asked on stays
 * only, where someone has to be at the door with the keys.
 */
export function DetailsStep({
  draft,
  dispatch,
  attempted,
  flow,
  signInHref,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  attempted: boolean;
  flow: FlowKind;
  signInHref: string;
}) {
  const t = useTranslations("booking.details");
  const tc = useTranslations("checkout");
  const { role } = usePreferences();
  const g = draft.guest;
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const touch = (k: string) => setTouched((s) => new Set(s).add(k));
  const show = (k: string, ok: boolean) => !ok && (attempted || touched.has(k));
  const set = (value: Partial<typeof g>) => dispatch({ type: "guest", value });
  const stayish = flow === "stay" || flow === "rent" || flow === "trip";

  return (
    <div className="flex flex-col gap-5">
      {role === "visitor" && (
        <div className="flex flex-col gap-3 rounded-card border border-brand/25 bg-brand-tint/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span aria-hidden="true" className="grid size-10 flex-none place-items-center rounded-full bg-surface text-brand">
              <UsersIcon size={18} />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-ink">{t("haveAccount")}</p>
              <p className="text-[13.5px] text-ink-2">{t("signInBody")}</p>
              <p className="text-[13px] text-ink-3">{t("orGuest")}</p>
            </div>
          </div>
          <Link
            href={signInHref}
            className="inline-flex min-h-11 flex-none items-center justify-center rounded-ctl border border-brand bg-surface px-5 text-[15px] font-semibold text-brand hover:bg-brand-tint"
          >
            {t("signIn")}
          </Link>
        </div>
      )}

      <StepSection title={t("contactTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fullName")} error={show("name", VALID["guest-name"](g.name ?? "")) && tc("fullNameError")} className="sm:col-span-2" id="guest-name">
            {(a) => (
              <TextInput {...a} invalid={a["aria-invalid"]} autoComplete="name" value={g.name ?? ""} onChange={(e) => set({ name: e.target.value })} onBlur={() => touch("name")} />
            )}
          </Field>
          <Field label={t("email")} error={show("email", VALID["guest-email"](g.email ?? "")) && tc("emailError")} id="guest-email">
            {(a) => (
              <TextInput {...a} invalid={a["aria-invalid"]} type="email" inputMode="email" autoComplete="email" spellCheck={false} value={g.email ?? ""} onChange={(e) => set({ email: e.target.value })} onBlur={() => touch("email")} />
            )}
          </Field>
          <Field label={t("phone")} hint={t("phoneHint")} error={show("phone", VALID["guest-phone"](g.phone ?? "")) && tc("phoneError")} id="guest-phone">
            {(a) => (
              <TextInput {...a} invalid={a["aria-invalid"]} type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 78 000 0000" value={g.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} onBlur={() => touch("phone")} />
            )}
          </Field>
        </div>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-ink">
          <input
            type="checkbox"
            checked={!!g.forSomeoneElse}
            onChange={(e) => set({ forSomeoneElse: e.target.checked })}
            className="size-5 flex-none cursor-pointer accent-[var(--brand)]"
          />
          {t("forSomeoneElse")}
        </label>
        {g.forSomeoneElse && (
          <Field label={t("travellerName")} hint={t("travellerHint")} error={show("traveller", (g.travellerName ?? "").trim().length >= 2) && t("travellerError")} id="traveller-name">
            {(a) => (
              <TextInput {...a} invalid={a["aria-invalid"]} value={g.travellerName ?? ""} onChange={(e) => set({ travellerName: e.target.value })} onBlur={() => touch("traveller")} />
            )}
          </Field>
        )}
      </StepSection>

      {stayish && (
        <StepSection title={t("arrivalTitle")}>
          <Field label={t("arrival")} hint={t("arrivalHint")} id="arrival-time">
            {(a) => (
              <select {...a} value={g.arrivalTime ?? ""} onChange={(e) => set({ arrivalTime: e.target.value || undefined })} className={`${controlClass()} tnum cursor-pointer sm:max-w-60`}>
                <option value="">{t("arrivalNotSure")}</option>
                {ARRIVALS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="flex flex-col gap-1.5">
            <p className="text-[13px] font-semibold text-ink-2">{t("purpose")}</p>
            <ChoiceCards
              name={t("purpose")}
              value={g.purpose}
              onChange={(purpose) => set({ purpose })}
              options={[
                { value: "leisure", title: t("purposeLeisure") },
                { value: "work", title: t("purposeWork") },
              ]}
            />
          </div>
        </StepSection>
      )}

      <StepSection title={t("requests")}>
        <Field label={<span className="sr-only">{t("requests")}</span>} hint={t("requestsCount", { count: (g.requests ?? "").length })} id="requests">
          {(a) => (
            <TextArea {...a} maxLength={500} placeholder={t("requestsPlaceholder")} value={g.requests ?? ""} onChange={(e) => set({ requests: e.target.value })} />
          )}
        </Field>
      </StepSection>
    </div>
  );
}
