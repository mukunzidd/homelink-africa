"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { sectionOf, type WorkspaceSection } from "@/lib/workspace/nav";
import { BanknoteIcon, ClockIcon, MenuIcon, MessageIcon, RouteIcon } from "@/components/ui/icons";
import type { Badges } from "./nav-list";
import { cn } from "@/lib/cn";

const TABS: { section: WorkspaceSection; href: string; Icon: typeof RouteIcon }[] = [
  { section: "jobs", href: "/manage/jobs", Icon: RouteIcon },
  { section: "schedule", href: "/manage/schedule", Icon: ClockIcon },
  { section: "inbox", href: "/manage/inbox", Icon: MessageIcon },
  { section: "earnings", href: "/manage/earnings", Icon: BanknoteIcon },
];

/**
 * Drivers and guides work from a phone, standing next to a car or at a
 * trailhead. Below 640px their four sections sit under the thumb, and More
 * opens the drawer for the rest. Staff do not get this: their work happens
 * at a desk, and twenty sections do not fit in a tab bar.
 */
export function BottomTabs({ badges, onMore }: { badges: Badges; onMore: () => void }) {
  const t = useTranslations("workspace");
  const current = sectionOf(usePathname());

  const cell =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium transition-colors";

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      {TABS.map(({ section, href, Icon }) => {
        const active = current === section;
        const count = badges[section] ?? 0;
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(cell, active ? "text-brand" : "text-ink-3 hover:text-ink")}
          >
            <span className="relative">
              <Icon size={20} />
              {count > 0 && (
                <span className="tnum absolute -right-2.5 -top-1.5 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-semibold leading-4 text-on-brand">
                  {count}
                </span>
              )}
            </span>
            {t(`sections.${section}`)}
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={cn(cell, "cursor-pointer text-ink-3 hover:text-ink")}>
        <MenuIcon size={20} />
        {t("more")}
      </button>
    </nav>
  );
}
