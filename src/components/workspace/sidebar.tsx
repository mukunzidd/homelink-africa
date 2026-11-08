"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { NavGroup } from "@/lib/workspace/nav";
import { ExitIcon, SidebarIcon } from "@/components/ui/icons";
import { Logo } from "@/components/shell/logo";
import { NavList, type Badges } from "./nav-list";
import { useSidebarCollapsed } from "./use-sidebar";
import { cn } from "@/lib/cn";

/**
 * The docked sidebar, from 1024px up. 248px open, a 64px icon rail folded.
 *
 * Sticky and full height rather than fixed, so the page scrolls as one
 * document (the body has no overflow rule, see globals.css) and nothing
 * needs a second scrollbar unless the list itself outgrows the screen.
 */
export function Sidebar({ groups, badges }: { groups: NavGroup[]; badges: Badges }) {
  const t = useTranslations("workspace");
  const [collapsed, toggle] = useSidebarCollapsed();

  // `[` folds and unfolds, the shortcut Linear and Notion taught people.
  // Ignored while typing, so it never eats a bracket in a form.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "[" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        "sticky top-0 hidden h-screen flex-none flex-col border-r border-line bg-surface lg:flex",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-16" : "w-[248px]",
      )}
    >
      <div className={cn("flex h-14 flex-none items-center border-b border-line", collapsed ? "justify-center" : "px-4")}>
        <Link href="/manage" className="rounded-ctl" aria-label="HomeLink">
          {collapsed ? <Logo showWordmark={false} /> : <Logo />}
        </Link>
      </div>

      <div className={cn("min-h-0 flex-1 overflow-y-auto py-4", collapsed ? "px-2" : "px-3")}>
        <NavList groups={groups} badges={badges} collapsed={collapsed} />
      </div>

      <div className={cn("flex flex-none flex-col gap-0.5 border-t border-line py-3", collapsed ? "px-2" : "px-3")}>
        <Link
          href="/"
          aria-label={collapsed ? t("backToSite") : undefined}
          className={cn(
            "flex h-9 items-center rounded-ctl text-[14px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
            collapsed ? "justify-center" : "gap-3 px-3",
          )}
        >
          <ExitIcon size={17} />
          {!collapsed && t("backToSite")}
        </Link>
        <button
          type="button"
          onClick={() => toggle()}
          aria-label={collapsed ? t("expand") : t("collapse")}
          aria-keyshortcuts="["
          title={t("collapseHint")}
          className={cn(
            "flex h-9 cursor-pointer items-center rounded-ctl text-[14px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
            collapsed ? "justify-center" : "gap-3 px-3",
          )}
        >
          <SidebarIcon size={17} />
          {!collapsed && (
            <span className="flex flex-1 items-center justify-between">
              {t("collapse")}
              <kbd className="rounded-chip border border-line px-1.5 font-mono text-[11px] text-ink-3">[</kbd>
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
