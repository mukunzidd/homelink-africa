"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "./icons";
import { cn } from "@/lib/cn";

/**
 * Every in-page confirmation in the product, instead of the browser's own
 * `confirm()`, which cannot be styled, translated or tested, and which
 * blocks the whole tab.
 *
 * Focus moves in on open and is kept inside; Escape and the scrim close it
 * (unless `dismissable` is false, for a step the person must answer, like a
 * bank's code); focus returns to whatever opened it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissable = true,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  dismissable?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>(
      "input, select, textarea, button:not([data-close]), a[href]",
    );
    (first ?? panel.current)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissable) onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [
        ...panel.current.querySelectorAll<HTMLElement>("input, select, textarea, button, a[href]"),
      ].filter((el) => !el.hasAttribute("disabled"));
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open, onClose, dismissable]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={dismissable ? onClose : undefined}
        className="absolute inset-0 cursor-default bg-ink/45 animate-[fade_160ms_ease-out]"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-card bg-surface shadow-[var(--shadow-pop)] sm:rounded-card",
          "animate-[rise_200ms_ease-out]",
          size === "sm" ? "sm:max-w-[420px]" : size === "lg" ? "sm:max-w-[720px]" : "sm:max-w-[520px]",
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="font-display text-[22px] font-semibold leading-tight text-ink">
              {title}
            </h2>
            {description && (
              <div id={descId} className="text-[14px] leading-relaxed text-ink-2">
                {description}
              </div>
            )}
          </div>
          {dismissable && (
            <button
              type="button"
              data-close
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 grid size-9 flex-none cursor-pointer place-items-center rounded-ctl text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <CloseIcon />
            </button>
          )}
        </div>
        {children && <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
