"use client";

import { useTranslations } from "next-intl";
import type { Amenity, Listing } from "@/lib/domain/types";
import { AMENITIES } from "@/lib/search-params";
import { EditorForm } from "./editor-form";
import { cn } from "@/lib/cn";

export function AmenitiesTab({ listing }: { listing: Listing }) {
  const t = useTranslations("workspace.editor");
  const ta = useTranslations("amenities");
  return (
    <EditorForm<Amenity[]> listingId={listing.id} initial={listing.amenities} toPatch={(amenities) => ({ amenities })}>
      {(list, set) => (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[14px] text-ink-2">{t("amenitiesHint")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {AMENITIES.map((a) => {
              const on = list.includes(a);
              return (
                <label key={a} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl border px-3 text-[14px]", on ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-surface text-ink-2")}>
                  <input type="checkbox" checked={on} onChange={() => set(on ? list.filter((x) => x !== a) : [...list, a])} className="size-4 accent-[var(--brand)]" />
                  {ta(a)}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </EditorForm>
  );
}
