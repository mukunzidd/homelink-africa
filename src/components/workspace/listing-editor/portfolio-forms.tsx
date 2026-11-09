"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createListing, setListingPublished } from "@/app/actions/portfolio";
import { useToast } from "@/components/notifications/toaster";
import { field, fieldLabel } from "./editor-form";
import { cn } from "@/lib/cn";

/** A new home starts as an unpublished draft, then opens in the editor. */
export function NewListing({ neighbourhoods, from }: { neighbourhoods: string[]; from?: { name: string; where: string } }) {
  const t = useTranslations("workspace.editor");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(from?.name ?? "");
  const [where, setWhere] = useState(from?.where ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function create() {
    setBusy(true);
    const r = await createListing(name, where);
    setBusy(false);
    if (!r.ok) return setError(true);
    router.push(`/manage/portfolio/${r.slug}`);
  }

  if (from) {
    return (
      <button type="button" disabled={busy} onClick={() => void create()} className="min-h-9 cursor-pointer rounded-ctl border border-brand px-3 text-[13px] font-semibold text-brand hover:bg-brand-tint disabled:opacity-50">
        {t("startListing")}
      </button>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-10 cursor-pointer self-start rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand hover:bg-brand-deep">
        {t("newListing")}
      </button>
    );
  }
  return (
    <form
      className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        void create();
      }}
    >
      <label className={cn(fieldLabel, "flex-1")}>
        {t("name")}
        <input required value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className={field} />
      </label>
      <label className={cn(fieldLabel, "sm:w-56")}>
        {t("neighbourhood")}
        <input required list="hl-neighbourhoods" value={where} maxLength={60} onChange={(e) => setWhere(e.target.value)} className={field} />
        <datalist id="hl-neighbourhoods">{neighbourhoods.map((n) => <option key={n} value={n} />)}</datalist>
      </label>
      <button type="submit" disabled={busy || !name.trim() || !where.trim()} className="min-h-10 cursor-pointer rounded-ctl bg-brand px-4 text-[14px] font-semibold text-on-brand disabled:opacity-50">{t("createDraft")}</button>
      <button type="button" onClick={() => setOpen(false)} className="min-h-10 cursor-pointer rounded-ctl border border-line px-4 text-[14px] font-semibold text-ink">{t("cancel")}</button>
      {error && <p role="alert" className="text-[13px] text-crit">{t("notSaved")}</p>}
    </form>
  );
}

/** Live or not. Putting a home live is refused until someone has inspected it. */
export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const t = useTranslations("workspace.editor");
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const r = await setListingPublished(id, !published);
        setBusy(false);
        toast.show({ title: r.ok ? (published ? t("unpublished") : t("published")) : t("notInspected"), tone: r.ok ? "ok" : "crit" });
      }}
      className={cn(
        "min-h-10 cursor-pointer rounded-ctl px-4 text-[14px] font-semibold disabled:opacity-50",
        published ? "border border-line bg-surface text-ink hover:border-crit hover:text-crit" : "bg-brand text-on-brand hover:bg-brand-deep",
      )}
    >
      {published ? t("unpublish") : t("publish")}
    </button>
  );
}
