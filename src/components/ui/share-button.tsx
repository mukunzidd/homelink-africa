"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, ShareIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * The system share sheet where there is one (phones), the clipboard where
 * there is not. Either way the thing shared is the page's own URL, which
 * already carries the dates and party, because the search is the URL.
 */
export function ShareButton({ title, className }: { title: string; className?: string }) {
  const t = useTranslations("share");
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed: fall through to copying, which is harmless.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(t("copyPrompt"), url);
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-ctl border border-line bg-surface px-3 text-sm font-semibold text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      {copied ? <CheckIcon className="text-ok" /> : <ShareIcon />}
      <span aria-live="polite">{copied ? t("copied") : t("share")}</span>
    </button>
  );
}
