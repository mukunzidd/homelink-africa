"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { usePreferences } from "@/lib/preferences/context";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { BY_ROLE } from "./account-menu";
import { PreferencesPanel } from "./preference-controls";
import { PreviewControls } from "./preview-bar";
import { cn } from "@/lib/cn";

/**
 * Everything the bar has no room for on a phone, in one sheet: who you are and
 * where your screens are, then how the page reads. Before this existed,
 * language and currency were simply hidden below 640px, so a guest on a phone
 * could not switch to French or see prices in francs at all.
 *
 * The lanes are not in here. They are the product's main navigation and stay
 * on screen as the strip under the bar.
 */
export function MobileMenu({ className }: { className?: string }) {
  const t = useTranslations("header");
  const tRoles = useTranslations("roles");
  const { role, setRole } = usePreferences();
  const router = useRouter();
  const tSignedOut = useTranslations("signedOut");
  const tDev = useTranslations("dev");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  const destinations = BY_ROLE[role];

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("menu")}
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 cursor-pointer place-items-center rounded-ctl text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <MenuIcon size={18} />
      </button>

      {/* Portalled to <body>: the header's backdrop blur makes it the
          containing block for fixed children, which clipped this sheet to the
          header's 100px instead of the screen. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            tabIndex={-1}
            aria-label={t("close")}
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-ink/40 animate-[fade_160ms_ease-out]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("menu")}
            className="absolute inset-y-0 right-0 flex w-[min(88vw,340px)] flex-col overflow-y-auto bg-surface shadow-[var(--shadow-pop)] animate-[slide_220ms_cubic-bezier(0.22,1,0.36,1)]"
          >
            <div className="flex h-14 flex-none items-center justify-between border-b border-line px-4">
              <span className="text-sm font-medium text-ink">{t("menu")}</span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("close")}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-ctl text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-4">
              {destinations.length > 0 && (
                <nav aria-label={tRoles(role)} className="flex flex-col gap-0.5">
                  <p className="px-2 pb-1 text-[12px] font-medium text-ink-3">{tRoles(role)}</p>
                  {destinations.map((d) => (
                    <Link
                      key={d.href}
                      href={d.href}
                      onClick={() => setOpen(false)}
                      aria-current={pathname === d.href ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center rounded-inner px-2 text-[15px] transition-colors duration-150",
                        pathname === d.href ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {t(d.key)}
                    </Link>
                  ))}
                </nav>
              )}
              {/* The desktop header offers preview sign-in to visitors; the
                  phone sheet is the only header a phone has, so it does too. */}
              {role === "visitor" && (
                <div className="flex flex-col gap-2 rounded-card border border-line p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setRole("guest");
                      setOpen(false);
                      router.refresh();
                    }}
                    className="flex min-h-11 w-full cursor-pointer items-center justify-center rounded-ctl bg-brand text-[15px] font-semibold text-on-brand hover:bg-brand-deep"
                  >
                    {tSignedOut("signIn")}
                  </button>
                  <p className="text-center text-[12px] text-ink-3">{tSignedOut("previewNote")}</p>
                </div>
              )}
              <PreferencesPanel onDone={() => setOpen(false)} />
              <section className="flex flex-col gap-2 border-t border-line pt-4">
                <p className="px-2 text-[12px] font-medium text-ink-3">{tDev("label")}</p>
                <PreviewControls className="px-2" />
              </section>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
