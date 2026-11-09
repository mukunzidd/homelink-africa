"use client";

import { useTranslations } from "next-intl";
import type { Listing } from "@/lib/domain/types";
import { EditorForm } from "./editor-form";
import { Select } from "@/components/ui/select";
import { SingleDatePicker } from "@/components/ui/single-date-picker";

/** The person on the team who looks after this home, named on its page. */
export function ManagerTab({ listing, team }: { listing: Listing; team: string[] }) {
  const t = useTranslations("workspace.editor");
  const people = [...new Set([...team, ...(listing.propertyManager.name ? [listing.propertyManager.name] : [])])];
  return (
    <EditorForm<Listing["propertyManager"]> listingId={listing.id} initial={listing.propertyManager} toPatch={(propertyManager) => ({ propertyManager })}>
      {(d, set) => (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Select label={t("manager")} value={d.name} onChange={(v) => set({ ...d, name: v })} options={[{ value: "", label: t("nobody") }, ...people.map((p) => ({ value: p, label: p }))]} />
          <SingleDatePicker label={t("managerSince")} minDate="2000-01-01" value={d.since || null} onChange={(x) => set({ ...d, since: x ?? "" })} className="self-end" />
          <p className="text-[13px] text-ink-3 sm:col-span-2">{t("managerHint")}</p>
        </div>
      )}
    </EditorForm>
  );
}
