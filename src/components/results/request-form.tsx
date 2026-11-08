"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BellIcon, CheckIcon } from "@/components/ui/icons";

/**
 * "Tell the Kigali team what you are looking for."
 *
 * Preview only, and it says so: there is no backend to send it to yet, and a
 * form that pretended otherwise would be the one dishonest thing on a page
 * about verification. Phase 2 lands these in the ops queue beside add-on
 * requests, in the guest's own words.
 */
export function RequestForm({ lane, compact }: { lane: string; compact?: boolean }) {
  const t = useTranslations("list");
  const [sent, setSent] = useState(false);
  const [what, setWhat] = useState("");
  const [contact, setContact] = useState("");

  if (sent) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-ctl bg-ok-tint px-3 py-2.5 text-[14px] text-ink">
        <CheckIcon size={16} className="mt-0.5 text-ok" />
        <span>
          <span className="font-semibold">{t("requestNoted")}</span> {t("requestPreview")}
        </span>
      </p>
    );
  }

  return (
    <form
      data-lane={lane}
      onSubmit={(e) => {
        e.preventDefault();
        if (what.trim()) setSent(true);
      }}
      className={compact ? "flex flex-col gap-2" : "flex flex-col gap-2 sm:flex-row sm:items-start"}
    >
      <label className="sr-only" htmlFor={`req-what-${lane}`}>{t("requestWhat")}</label>
      <input
        id={`req-what-${lane}`}
        value={what}
        onChange={(e) => setWhat(e.target.value)}
        placeholder={t(`requestPlaceholder.${lane}`)}
        className="min-h-10 min-w-0 flex-[2] rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
      />
      <label className="sr-only" htmlFor={`req-contact-${lane}`}>{t("requestContact")}</label>
      <input
        id={`req-contact-${lane}`}
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder={t("requestContact")}
        className="min-h-10 min-w-0 flex-1 rounded-ctl border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-brand"
      />
      <button
        type="submit"
        className="inline-flex min-h-10 flex-none cursor-pointer items-center justify-center gap-2 rounded-ctl border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-tint"
      >
        <BellIcon size={15} />
        {t("requestSend")}
      </button>
    </form>
  );
}
