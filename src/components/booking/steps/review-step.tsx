"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BookingDraft, DraftAction, StepKey } from "@/lib/booking/draft";
import type { Quote } from "@/lib/domain/pricing";
import type { PromoResult } from "@/lib/domain/promo";
import { usePreferences } from "@/lib/preferences/context";
import { CheckIcon } from "@/components/ui/icons";
import { StepSection, TextInput } from "../fields";
import type { FlowText } from "../types";
import { cn } from "@/lib/cn";

/**
 * Everything at once, before money is asked for: who, when, what was added,
 * the house rules to accept, and what happens if plans change.
 *
 * Each block has its own Edit, which goes straight to the step that set it
 * and comes back here, so a wrong phone number is one tap to fix, not a walk
 * back through three screens. The cancellation rules are drawn as dated
 * stages rather than a paragraph, because "until 24 Nov" is the fact people
 * look for.
 */
export function ReviewStep({
  draft,
  dispatch,
  text,
  quote,
  houseRules,
  rulesLane,
  attempted,
  onEdit,
  editable,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  text: FlowText;
  quote: (Quote & { promo?: PromoResult }) | null;
  houseRules: string[];
  rulesLane: "stay" | "car" | "experience";
  attempted: boolean;
  onEdit: (s: StepKey) => void;
  /** The steps this lane has, so Edit only points where it can go. */
  editable: readonly StepKey[];
}) {
  const t = useTranslations("booking.review");
  const tx = useTranslations("extras");
  const { display } = usePreferences();
  const g = draft.guest;
  const [code, setCode] = useState(draft.promoCode ?? "");
  const promo = quote?.promo;

  return (
    <div className="flex flex-col gap-5">
      <StepSection title={t("title")}>
        <div className="flex flex-col">
          <Row edit={t("edit")} editable={editable} onEdit={onEdit} label={t("who")} step="details">
            <p>{g.name}</p>
            <p className="text-[14px] text-ink-2">
              {g.email} · {g.phone}
            </p>
            {g.forSomeoneElse && g.travellerName && (
              <p className="text-[14px] text-ink-2">{t("travelling", { name: g.travellerName })}</p>
            )}
          </Row>
          <Row edit={t("edit")} editable={editable} onEdit={onEdit} label={t("when")}>
            <p className="tnum">{text.range}</p>
            <p className="text-[14px] text-ink-2">{text.facts.join(" · ")}</p>
          </Row>
          {draft.participants.length > 0 && (
            <Row edit={t("edit")} editable={editable} onEdit={onEdit} label={t("people")} step="people">
              <ul className="flex flex-col">
                {draft.participants.map((p, i) => (
                  <li key={i}>
                    {p.name}
                    <span className="text-ink-3"> · {p.age}</span>
                  </li>
                ))}
              </ul>
              {draft.slot && <p className="tnum text-[14px] text-ink-2">{t("startsAt", { time: draft.slot })}</p>}
            </Row>
          )}
          {editable.includes("extras") && (
            <Row edit={t("edit")} editable={editable} onEdit={onEdit} label={t("extras")} step="extras">
              {draft.extras.length ? (
                <ul className="flex flex-col">
                  {draft.extras.map((e) => (
                    <li key={e.key}>
                      {tx(`${e.key}.name`)}
                      {e.quantity > 1 ? ` × ${e.quantity}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-3">{t("none")}</p>
              )}
            </Row>
          )}
          {g.requests?.trim() && (
            <Row edit={t("edit")} editable={editable} onEdit={onEdit} label={t("requests")} step="details">
              <p className="whitespace-pre-line text-[14px] text-ink-2">{g.requests}</p>
            </Row>
          )}
        </div>
      </StepSection>

      {houseRules.length > 0 && (
        <StepSection title={rulesLane === "stay" ? t("rulesTitle") : rulesLane === "car" ? t("rulesTitleCar") : t("rulesTitleDay")}>
          <ul className="flex flex-col gap-2">
            {houseRules.map((r) => (
              <li key={r} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-2">
                <span aria-hidden="true" className="mt-2 size-1.5 flex-none rounded-full bg-ink-3" />
                {r}
              </li>
            ))}
          </ul>
          <label
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl border px-4 py-2.5 text-[15px] font-medium transition-colors",
              draft.acceptedRules
                ? "border-brand bg-brand-tint text-brand-deep"
                : attempted
                  ? "border-crit text-ink"
                  : "border-line text-ink",
            )}
          >
            <input
              id="accept-rules"
              type="checkbox"
              checked={draft.acceptedRules}
              onChange={(e) => dispatch({ type: "acceptRules", value: e.target.checked })}
              aria-invalid={attempted && !draft.acceptedRules}
              aria-describedby={attempted && !draft.acceptedRules ? "accept-rules-error" : undefined}
              className="size-5 flex-none cursor-pointer accent-[var(--brand)]"
            />
            {rulesLane === "stay" ? t("rulesAccept") : t("rulesAcceptOther")}
          </label>
          {attempted && !draft.acceptedRules && (
            <p id="accept-rules-error" className="-mt-2 text-xs text-crit">
              {t("rulesError")}
            </p>
          )}
        </StepSection>
      )}

      {text.stages.length > 0 && (
        <StepSection title={t("cancelTitle")}>
          <ol className="flex flex-col gap-0 sm:flex-row">
            {text.stages.map((s, i) => (
              <li key={i} className="relative flex flex-1 gap-3 pb-4 sm:flex-col sm:gap-2 sm:pb-0 sm:pr-4">
                <div className="flex flex-col items-center sm:w-full sm:flex-row">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-3 flex-none rounded-full ring-4",
                      s.tone === "ok" ? "bg-ok ring-ok-tint" : s.tone === "warn" ? "bg-warn ring-warn-tint" : "bg-crit ring-crit-tint",
                    )}
                  />
                  {i < text.stages.length - 1 && <span aria-hidden="true" className="w-px flex-1 bg-line sm:h-px sm:w-auto" />}
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[14px] font-semibold text-ink">{s.title}</p>
                  <p className="tnum text-[13px] text-ink-3">{s.when}</p>
                </div>
              </li>
            ))}
          </ol>
          {text.stageNote && <p className="text-[13px] text-ink-2">{text.stageNote}</p>}
        </StepSection>
      )}

      <StepSection title={t("promoLabel")}>
        {promo?.ok ? (
          <div className="flex items-center justify-between gap-3 rounded-ctl border border-ok/40 bg-ok-tint/60 px-4 py-3">
            <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
              <CheckIcon size={15} className="text-ok" />
              {t("promoOk", { code: promo.code, amount: display(promo.discount) })}
            </p>
            <button
              type="button"
              onClick={() => {
                setCode("");
                dispatch({ type: "promo", value: undefined });
              }}
              className="cursor-pointer rounded-ctl px-2 py-1 text-[14px] font-semibold text-brand hover:bg-brand-tint"
            >
              {t("promoRemove")}
            </button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({ type: "promo", value: code });
            }}
          >
            <label htmlFor="promo" className="sr-only">
              {t("promoLabel")}
            </label>
            <div className="flex gap-2">
              <TextInput
                id="promo"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                invalid={!!promo && !promo.ok}
                autoComplete="off"
                spellCheck={false}
                className="font-mono uppercase tracking-wide sm:max-w-64"
                aria-describedby={promo && !promo.ok ? "promo-error" : undefined}
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="min-h-11 flex-none cursor-pointer rounded-ctl border border-line bg-surface px-4 text-[15px] font-semibold text-ink hover:border-brand hover:text-brand disabled:cursor-default disabled:opacity-50"
              >
                {t("promoApply")}
              </button>
            </div>
            {promo && !promo.ok && (
              <p id="promo-error" className="text-xs text-crit">
                {t(`promoErrors.${promo.reason}`)}
              </p>
            )}
          </form>
        )}
      </StepSection>
    </div>
  );
}

function Row({
  label,
  step,
  children,
  edit,
  editable,
  onEdit,
}: {
  label: string;
  step?: StepKey;
  children: React.ReactNode;
  edit: string;
  editable: readonly StepKey[];
  onEdit: (s: StepKey) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-line-soft py-3 first:border-0 first:pt-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-[13px] font-medium text-ink-3">{label}</p>
        <div className="text-[15px] text-ink">{children}</div>
      </div>
      {step && editable.includes(step) && (
        <button type="button" onClick={() => onEdit(step)} className="flex-none cursor-pointer rounded-ctl px-2 py-1 text-[14px] font-semibold text-brand hover:bg-brand-tint">
          {edit}
        </button>
      )}
    </div>
  );
}
