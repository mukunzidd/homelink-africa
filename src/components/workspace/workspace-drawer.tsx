"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavGroup } from "@/lib/workspace/nav";
import { CloseIcon, ExitIcon } from "@/components/ui/icons";
import { Logo } from "@/components/shell/logo";
import { NavList, type Badges } from "./nav-list";

/**
 * The sidebar as a sheet from the left, below 1024px.
 *
 * Focus moves into it on open, Tab cycles inside it, Escape and the scrim
 * close it, and focus returns to the button that opened it. It closes itself
 * on navigation, so tapping a section is one action, not two.
 */
export function WorkspaceDrawer({
  open,
  onClose,
  groups,
  badges,
}: {
  open: boolean;
  onClose: () => void;
  groups: NavGroup[];
  badges: Badges;
}) {
  const t = useTranslations("workspace");
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const opened = useRef(pathname);

  // A navigation closes the drawer.
  useEffect(() => {
    if (open && pathname !== opened.current) onClose();
    opened.current = pathname;
  }, [pathname, open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>("a, button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("closeMenu")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/40 animate-[fade_160ms_ease-out]"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t("label")}
        className="absolute inset-y-0 left-0 flex w-[min(86vw,300px)] flex-col bg-surface shadow-[var(--shadow-pop)] animate-[slide-left_220ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex h-14 flex-none items-center justify-between border-b border-line px-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("closeMenu")}
            className="grid size-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          <NavList groups={groups} badges={badges} onNavigate={onClose} />
        </div>
        <div className="flex-none border-t border-line px-3 py-3">
          <Link
            href="/"
            className="flex h-10 items-center gap-3 rounded-ctl px-3 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink"
          >
            <ExitIcon size={17} />
            {t("backToSite")}
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}
