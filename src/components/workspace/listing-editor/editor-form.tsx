"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { updateListing } from "@/app/actions/portfolio";
import type { PatchError } from "@/lib/workspace/listing-patch";
import { useToast } from "@/components/notifications/toaster";
import { UnsavedGuard } from "@/components/workspace/unsaved-guard";
import { cn } from "@/lib/cn";

export const field = "min-h-10 w-full rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink focus:border-brand focus:outline-none";
export const fieldLabel = "flex flex-col gap-1 text-[13px] font-medium text-ink-2";

/**
 * One tab's form: holds its own copy of the fields, says when it differs
 * from what is saved, saves only that tab's fields, and puts back what was
 * saved on Discard. Errors come back by field name and are shown beside
 * the field that caused them.
 */
export function EditorForm<T>({
  listingId,
  initial,
  toPatch,
  children,
}: {
  listingId: string;
  initial: T;
  toPatch: (draft: T) => Record<string, unknown>;
  children: (draft: T, set: (next: T) => void, errors: PatchError[]) => ReactNode;
}) {
  const t = useTranslations("workspace.editor");
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<PatchError[]>([]);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  async function save() {
    setBusy(true);
    const r = await updateListing(listingId, toPatch(draft));
    setBusy(false);
    if (!r.ok) {
      setErrors(r.errors);
      toast.show({ title: t("notSaved"), tone: "crit" });
      return;
    }
    setErrors([]);
    setSaved(draft);
    toast.show({ title: t("saved"), tone: "ok" });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {children(draft, setDraft, errors)}
      {errors.length > 0 && (
        <p role="alert" className="rounded-ctl bg-crit-tint px-3 py-2 text-[14px] text-crit">
          {errors.map((e) => t(`errors.${e}`)).join(" ")}
        </p>
      )}
      <div className={cn("sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5", !dirty && "opacity-80")}>
        <span className="text-[13px] text-ink-3">{dirty ? t("unsaved") : t("allSaved")}</span>
        <span className="flex-1" />
        <button type="button" disabled={!dirty || busy} onClick={() => { setDraft(saved); setErrors([]); }} className="min-h-10 cursor-pointer rounded-ctl border border-line bg-surface px-4 text-[14px] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50">
          {t("discard")}
        </button>
        <button type="submit" disabled={!dirty || busy} className="min-h-10 cursor-pointer rounded-ctl bg-brand px-5 text-[14px] font-semibold text-on-brand hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? t("saving") : t("save")}
        </button>
      </div>
      <UnsavedGuard dirty={dirty} onDiscard={() => setDraft(saved)} />
    </form>
  );
}

export function FieldError({ show, children }: { show: boolean; children: ReactNode }) {
  return show ? <span className="text-[12.5px] font-normal text-crit">{children}</span> : null;
}
