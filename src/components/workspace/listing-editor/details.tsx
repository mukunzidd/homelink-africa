"use client";

import { useTranslations } from "next-intl";
import type { Listing } from "@/lib/domain/types";
import { EditorForm, FieldError, field, fieldLabel } from "./editor-form";
import { cn } from "@/lib/cn";

type D = { name: string; summary: string; bedrooms: number; sleeps: number };

export function DetailsTab({ listing }: { listing: Listing }) {
  const t = useTranslations("workspace.editor");
  return (
    <EditorForm<D> listingId={listing.id} initial={{ name: listing.name, summary: listing.summary, bedrooms: listing.bedrooms, sleeps: listing.sleeps }} toPatch={(d) => d}>
      {(d, set, errors) => (
        <>
          <label className={fieldLabel}>
            {t("name")}
            <input value={d.name} maxLength={120} onChange={(e) => set({ ...d, name: e.target.value })} aria-invalid={errors.includes("name")} className={cn(field, errors.includes("name") && "border-crit")} />
            <FieldError show={errors.includes("name")}>{t("errors.name")}</FieldError>
          </label>
          <label className={fieldLabel}>
            {t("summary")}
            <textarea rows={5} value={d.summary} maxLength={2000} onChange={(e) => set({ ...d, summary: e.target.value })} className={cn(field, "py-2 leading-relaxed")} />
            <span className="text-[12px] font-normal text-ink-3">{t("summaryHint", { count: d.summary.length })}</span>
          </label>
          <div className="grid max-w-md grid-cols-2 gap-3">
            <label className={fieldLabel}>
              {t("bedrooms")}
              <input type="number" min={0} max={20} value={d.bedrooms} onChange={(e) => set({ ...d, bedrooms: Number(e.target.value) })} className={field} />
            </label>
            <label className={fieldLabel}>
              {t("sleeps")}
              <input type="number" min={1} max={40} value={d.sleeps} onChange={(e) => set({ ...d, sleeps: Number(e.target.value) })} aria-invalid={errors.includes("sleeps")} className={cn(field, errors.includes("sleeps") && "border-crit")} />
            </label>
          </div>
          <FieldError show={errors.includes("sleeps") || errors.includes("bedrooms")}>{t("errors.sleeps")}</FieldError>
        </>
      )}
    </EditorForm>
  );
}
