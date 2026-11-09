"use client";

import { useTranslations } from "next-intl";
import type { LeaseIncluded, LeaseTerms, Listing, StayMode } from "@/lib/domain/types";
import { exponentOf, type Money } from "@/lib/domain/money";
import { EditorForm, FieldError, field, fieldLabel } from "./editor-form";
import { SingleDatePicker } from "@/components/ui/single-date-picker";
import { cn } from "@/lib/cn";

type D = { modes: StayMode[]; nightly: string; monthly: string; minNights: number; terms: LeaseTerms };
const INCLUDES: LeaseIncluded[] = ["water", "security", "internet", "garden"];

/** Rates are typed in major units in the currency the home is paid in, and stored in minor units. */
const toMajor = (m?: Money) => (m ? String(m.minor / 10 ** exponentOf(m.currency)) : "");
const toMinor = (v: string, currency: Money["currency"]): Money => ({ minor: Math.round(Number(v.replace(/[\s,]/g, "")) * 10 ** exponentOf(currency)), currency });

export function PricingTab({ listing }: { listing: Listing }) {
  const t = useTranslations("workspace.editor");
  const tInc = useTranslations("list.included");
  const currency = listing.nightlyRate.currency;
  const initial: D = {
    modes: listing.modes,
    nightly: toMajor(listing.nightlyRate),
    monthly: toMajor(listing.monthlyRate),
    minNights: listing.minNights ?? 1,
    terms: listing.leaseTerms ?? { depositMonths: 1, includes: [], availableFrom: new Date().toISOString().slice(0, 10) },
  };
  return (
    <EditorForm<D>
      listingId={listing.id}
      initial={initial}
      toPatch={(d) => ({
        modes: d.modes,
        nightlyRate: toMinor(d.nightly, currency),
        monthlyRate: d.monthly.trim() ? toMinor(d.monthly, currency) : null,
        minNights: d.minNights,
        ...(d.modes.includes("lease") ? { leaseTerms: d.terms } : {}),
      })}
    >
      {(d, set, errors) => (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[13px] font-medium text-ink-2">{t("offeredFor")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["nightly", "lease"] as StayMode[]).map((m) => {
                const on = d.modes.includes(m);
                return (
                  <label key={m} className={cn("flex min-h-10 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-[14px]", on ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-surface text-ink-2")}>
                    <input type="checkbox" checked={on} onChange={() => set({ ...d, modes: on ? d.modes.filter((x) => x !== m) : [...d.modes, m] })} className="size-4 accent-[var(--brand)]" />
                    {t(`mode.${m}`)}
                  </label>
                );
              })}
            </div>
            <FieldError show={errors.includes("modes")}>{t("errors.modes")}</FieldError>
          </fieldset>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            <label className={fieldLabel}>
              {t("nightlyRate", { currency })}
              <input inputMode="decimal" value={d.nightly} onChange={(e) => set({ ...d, nightly: e.target.value })} aria-invalid={errors.includes("nightlyRate")} className={cn(field, "tnum", errors.includes("nightlyRate") && "border-crit")} />
            </label>
            <label className={fieldLabel}>
              {t("monthlyRate", { currency })}
              <input inputMode="decimal" value={d.monthly} onChange={(e) => set({ ...d, monthly: e.target.value })} aria-invalid={errors.includes("monthlyRate")} className={cn(field, "tnum", errors.includes("monthlyRate") && "border-crit")} />
            </label>
            <label className={fieldLabel}>
              {t("minNights")}
              <input type="number" min={1} max={30} value={d.minNights} onChange={(e) => set({ ...d, minNights: Number(e.target.value) })} aria-invalid={errors.includes("minNights")} className={cn(field, errors.includes("minNights") && "border-crit")} />
            </label>
          </div>
          <FieldError show={errors.includes("nightlyRate")}>{t("errors.nightlyRate")}</FieldError>
          <FieldError show={errors.includes("monthlyRate")}>{t("errors.monthlyRate")}</FieldError>
          {d.modes.includes("lease") && (
            <fieldset className="flex flex-col gap-3 rounded-ctl border border-line p-4">
              <legend className="px-1 text-[13px] font-semibold text-ink">{t("rentingTerms")}</legend>
              <div className="grid max-w-md grid-cols-2 gap-3">
                <label className={fieldLabel}>
                  {t("depositMonths")}
                  <input type="number" min={0} max={6} value={d.terms.depositMonths} onChange={(e) => set({ ...d, terms: { ...d.terms, depositMonths: Number(e.target.value) } })} className={field} />
                </label>
                <SingleDatePicker label={t("availableFrom")} minDate="2000-01-01" value={d.terms.availableFrom || null} onChange={(x) => set({ ...d, terms: { ...d.terms, availableFrom: x ?? "" } })} />
              </div>
              <div className="flex flex-wrap gap-2">
                {INCLUDES.map((x) => {
                  const on = d.terms.includes.includes(x);
                  return (
                    <label key={x} className={cn("flex min-h-9 cursor-pointer items-center gap-2 rounded-ctl border px-3 text-[13px]", on ? "border-brand bg-brand-tint text-brand-deep" : "border-line text-ink-2")}>
                      <input type="checkbox" checked={on} onChange={() => set({ ...d, terms: { ...d.terms, includes: on ? d.terms.includes.filter((y) => y !== x) : [...d.terms.includes, x] } })} className="size-4 accent-[var(--brand)]" />
                      {tInc(x)}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
        </>
      )}
    </EditorForm>
  );
}
