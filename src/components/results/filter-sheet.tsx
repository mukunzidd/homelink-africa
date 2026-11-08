"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { CloseIcon, SlidersIcon } from "@/components/ui/icons";

/**
 * Filters on a phone: a button in the sticky toolbar and a bottom sheet.
 *
 * It replaced an accordion halfway down the page that pushed the first result
 * off the screen when open and was easy to miss when shut. The filters inside
 * are the same component as the desktop sidebar and still write to the URL as
 * they change, so the list behind the sheet is already updated when it closes.
 */
export function FilterSheet({ count, children, resultCount }: { count: number; children: ReactNode; resultCount: number }) {
  const t = useTranslations("list");
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 flex-none cursor-pointer items-center gap-2 rounded-ctl border border-line bg-surface px-3 text-[14px] font-medium text-ink transition-colors hover:bg-surface-2 lg:hidden"
      >
        <SlidersIcon size={15} />
        {t("filters")}
        {count > 0 && (
          <span className="tnum grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-semibold text-on-brand">{count}</span>
        )}
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] lg:hidden">
            <button
              type="button"
              tabIndex={-1}
              aria-label={t("closeFilters")}
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-ink/40 animate-[fade_160ms_ease-out]"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("filters")}
              className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-card bg-surface shadow-[var(--shadow-pop)] animate-[rise_220ms_cubic-bezier(0.22,1,0.36,1)]"
            >
              <div className="flex h-14 flex-none items-center justify-between border-b border-line px-4">
                <span className="text-[15px] font-semibold text-ink">{t("filters")}</span>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("closeFilters")}
                  className="grid h-9 w-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto [&>div]:rounded-none [&>div]:border-0 [&>div>div:first-child>h2]:sr-only">{children}</div>
              <div className="flex-none border-t border-line p-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-ctl bg-brand text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
                >
                  {t("showResults", { count: resultCount })}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
