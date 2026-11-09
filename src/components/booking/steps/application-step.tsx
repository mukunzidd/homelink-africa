"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Listing, RentApplication } from "@/lib/domain/types";
import type { BookingDraft, DraftAction } from "@/lib/booking/draft";
import { monthsBetween } from "@/lib/domain/dates";
import { FileDrop } from "@/components/ui/file-drop";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { ChoiceCards, Field, StepSection, TextInput } from "../fields";

const BANDS: RentApplication["incomeBand"][] = ["under500k", "500kTo1m", "1mTo2m", "over2m"];

/**
 * What the Kigali team needs to say yes to a tenant: who will live there,
 * where they work, a band of income, and an ID. Asked as little as that,
 * with the reason for each said beside it; the ID can come later.
 */
export function ApplicationStep({
  draft,
  dispatch,
  attempted,
  listing,
  monthLabel,
}: {
  draft: BookingDraft;
  dispatch: (a: DraftAction) => void;
  attempted: boolean;
  listing: Listing;
  /** The move-in month, formatted on the server. */
  monthLabel: string;
}) {
  const t = useTranslations("booking.application");
  const tf = useTranslations("files");
  const months = monthsBetween(draft.start, draft.end);
  const a: RentApplication = draft.application ?? {
    occupants: 1,
    employer: "",
    incomeBand: undefined as unknown as RentApplication["incomeBand"],
    moveIn: draft.start,
    months,
  };
  const set = (p: Partial<RentApplication>) => dispatch({ type: "application", value: { ...a, ...p } });

  useEffect(() => {
    if (!draft.application) dispatch({ type: "application", value: a });
    // Seed once; `a` is derived from the draft it would be compared with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.application]);

  return (
    <StepSection title={t("title")} body={t("body")}>
      <p className="rounded-ctl bg-surface-2 px-4 py-3 text-[14px] font-medium text-ink">
        {t("term", { month: monthLabel, count: months })}
      </p>

      <div className="flex items-center justify-between gap-4">
        <p className="text-[14px] font-semibold text-ink-2">{t("occupants")}</p>
        <div className="flex items-center gap-1 rounded-ctl border border-line bg-surface">
          <button type="button" onClick={() => set({ occupants: Math.max(1, a.occupants - 1) })} disabled={a.occupants <= 1} aria-label="−" className="grid size-11 cursor-pointer place-items-center rounded-ctl text-brand disabled:opacity-40">
            <MinusIcon size={14} />
          </button>
          <span className="tnum w-6 text-center text-[16px] font-semibold text-ink" aria-live="polite">
            {a.occupants}
          </span>
          <button type="button" onClick={() => set({ occupants: Math.min(listing.sleeps, a.occupants + 1) })} disabled={a.occupants >= listing.sleeps} aria-label="+" className="grid size-11 cursor-pointer place-items-center rounded-ctl text-brand disabled:opacity-40">
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      <Field label={t("employer")} hint={t("employerHint")} error={attempted && a.employer.trim().length < 2 && t("employerError")} id="employer">
        {(f) => <TextInput {...f} invalid={f["aria-invalid"]} autoComplete="organization" value={a.employer} onChange={(e) => set({ employer: e.target.value })} />}
      </Field>

      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-semibold text-ink-2">{t("income")}</p>
        <ChoiceCards
          name={t("income")}
          value={a.incomeBand}
          onChange={(incomeBand) => set({ incomeBand })}
          options={BANDS.map((b) => ({ value: b, title: t(`incomeBands.${b}`) }))}
        />
        {attempted && !a.incomeBand ? (
          <p className="text-xs text-crit" aria-invalid="true" tabIndex={-1}>
            {t("incomeError")}
          </p>
        ) : (
          <p className="text-xs text-ink-3">{t("incomeHint")}</p>
        )}
      </div>

      <FileDrop
        label={t("id")}
        hint={t("idHint")}
        value={a.idFileName}
        onFile={(f) => set({ idFileName: f?.name })}
        errors={{ type: tf("type"), size: tf("size"), choose: tf("choose"), drop: tf("drop"), remove: tf("remove") }}
      />
      {/* A checked ID on the account saves this upload, now and next time. */}
      <Link href="/account/verify-id" className="self-start text-[14px] font-semibold text-brand hover:underline">
        {t("verifyIdLink")}
      </Link>
    </StepSection>
  );
}
