"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";

/**
 * Asks before throwing away an edit.
 *
 * Inside the page (another tab, the sidebar, any link) it is an in-page
 * dialog: a click on a link is caught before the router sees it. Closing
 * or reloading the browser tab can only be asked through `beforeunload`,
 * whose wording the browser decides, so that is the only place it is used.
 */
export function UnsavedGuard({ dirty, onDiscard }: { dirty: boolean; onDiscard: () => void }) {
  const t = useTranslations("workspace.editor");
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin) return;
      if (a.pathname + a.search === location.pathname + location.search) return;
      e.preventDefault();
      e.stopPropagation();
      // The router adds the locale itself; strip the one already in the link.
      setPending(a.pathname.replace(/^\/(en|fr|rw|sw)(?=\/|$)/, "") + a.search || "/");
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  return (
    <Dialog
      open={!!pending}
      onClose={() => setPending(null)}
      title={t("leaveTitle")}
      description={t("leaveBody")}
      size="sm"
      footer={
        <>
          <button type="button" onClick={() => setPending(null)} className="min-h-11 cursor-pointer rounded-ctl border border-line px-4 text-[15px] font-semibold text-ink">
            {t("stay")}
          </button>
          <button
            type="button"
            onClick={() => {
              const to = pending!;
              setPending(null);
              onDiscard();
              router.push(to);
            }}
            className="min-h-11 cursor-pointer rounded-ctl bg-crit px-4 text-[15px] font-semibold text-white"
          >
            {t("leave")}
          </button>
        </>
      }
    />
  );
}
