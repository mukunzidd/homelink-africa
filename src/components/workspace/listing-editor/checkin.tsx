"use client";

import { useTranslations } from "next-intl";
import type { Listing } from "@/lib/domain/types";
import { EditorForm, field, fieldLabel } from "./editor-form";
import { cn } from "@/lib/cn";

type D = NonNullable<Listing["checkIn"]>;

/** Released to the guest 48 hours before arrival and never before; the page says so. */
export function CheckInTab({ listing }: { listing: Listing }) {
  const t = useTranslations("workspace.editor");
  return (
    <EditorForm<D> listingId={listing.id} initial={listing.checkIn ?? { directions: "", doorCode: "", wifiName: "", wifiPassword: "" }} toPatch={(checkIn) => ({ checkIn })}>
      {(d, set) => (
        <>
          <p className="rounded-ctl bg-surface-2 px-3 py-2 text-[13px] text-ink-2">{t("checkInHint")}</p>
          <label className={fieldLabel}>
            {t("directions")}
            <textarea rows={4} value={d.directions} maxLength={1000} onChange={(e) => set({ ...d, directions: e.target.value })} className={cn(field, "py-2")} />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={fieldLabel}>
              {t("doorCode")}
              <input value={d.doorCode} maxLength={40} autoComplete="off" onChange={(e) => set({ ...d, doorCode: e.target.value })} className={cn(field, "font-mono")} />
            </label>
            <label className={fieldLabel}>
              {t("wifiName")}
              <input value={d.wifiName} maxLength={60} onChange={(e) => set({ ...d, wifiName: e.target.value })} className={field} />
            </label>
            <label className={fieldLabel}>
              {t("wifiPassword")}
              <input value={d.wifiPassword} maxLength={60} autoComplete="off" onChange={(e) => set({ ...d, wifiPassword: e.target.value })} className={cn(field, "font-mono")} />
            </label>
          </div>
        </>
      )}
    </EditorForm>
  );
}
