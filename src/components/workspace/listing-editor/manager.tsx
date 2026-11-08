"use client";

import { useTranslations } from "next-intl";
import type { Listing } from "@/lib/domain/types";
import { EditorForm, field, fieldLabel } from "./editor-form";

/** The person on the team who looks after this home, named on its page. */
export function ManagerTab({ listing, team }: { listing: Listing; team: string[] }) {
  const t = useTranslations("workspace.editor");
  const people = [...new Set([...team, ...(listing.propertyManager.name ? [listing.propertyManager.name] : [])])];
  return (
    <EditorForm<Listing["propertyManager"]> listingId={listing.id} initial={listing.propertyManager} toPatch={(propertyManager) => ({ propertyManager })}>
      {(d, set) => (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <label className={fieldLabel}>
            {t("manager")}
            <select value={d.name} onChange={(e) => set({ ...d, name: e.target.value })} className={field}>
              <option value="">{t("nobody")}</option>
              {people.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className={fieldLabel}>
            {t("managerSince")}
            <input type="date" value={d.since} onChange={(e) => set({ ...d, since: e.target.value })} className={field} />
          </label>
          <p className="text-[13px] text-ink-3 sm:col-span-2">{t("managerHint")}</p>
        </div>
      )}
    </EditorForm>
  );
}
