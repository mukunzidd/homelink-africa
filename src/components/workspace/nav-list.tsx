"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { sectionOf, type IconName, type NavGroup, type WorkspaceSection } from "@/lib/workspace/nav";
import * as Icons from "@/components/ui/icons";
import { cn } from "@/lib/cn";

export type Badges = Partial<Record<WorkspaceSection, number>>;

const ICONS = Icons as unknown as Record<IconName, (p: { size?: number; className?: string }) => React.ReactElement>;

/**
 * The sidebar's list, shared by the docked sidebar and the phone drawer so
 * the two can never disagree about what exists.
 *
 * Folded, each row is its icon alone and the label moves into a tooltip that
 * shows on hover and on keyboard focus; the accessible name stays the label
 * either way. The tooltip is one fixed-position element placed from the
 * row's rectangle, not a child of the row: a child would be clipped by the
 * list's scroll container, and admin's twenty-one rows do need to scroll on
 * a laptop screen. Counts stay visible folded, as a dot on the icon, because
 * "something is waiting in Asks" is the reason to look at the sidebar.
 */
export function NavList({
  groups,
  badges,
  collapsed = false,
  onNavigate,
}: {
  groups: NavGroup[];
  badges: Badges;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("workspace");
  const pathname = usePathname();
  const current = sectionOf(pathname);
  const [tip, setTip] = useState<{ text: string; top: number; left: number } | null>(null);
  const show = (text: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!collapsed) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ text, top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hide = () => setTip(null);

  return (
    <nav aria-label={t("label")} className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {collapsed ? (
            <span aria-hidden="true" className="mx-auto mb-1 h-px w-6 bg-line" />
          ) : (
            <p className="px-3 pb-1 text-[11.5px] font-medium tracking-wide text-ink-3">
              {t(`groups.${group.key}`)}
            </p>
          )}
          {group.items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = current === item.section;
            const count = badges[item.section] ?? 0;
            const label = t(`sections.${item.section}`);
            return (
              <Link
                key={item.section}
                href={item.href}
                onClick={onNavigate}
                onMouseEnter={show(count ? `${label} · ${count}` : label)}
                onMouseLeave={hide}
                onFocus={show(count ? `${label} · ${count}` : label)}
                onBlur={hide}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? (count ? `${label} (${count})` : label) : undefined}
                className={cn(
                  "group relative flex h-9 items-center rounded-ctl text-[14px] transition-colors duration-150",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  active
                    ? "bg-brand-tint font-medium text-brand-deep"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                <span className="relative">
                  {Icon ? <Icon size={17} /> : null}
                  {collapsed && count > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 size-2 rounded-full bg-brand ring-2 ring-surface"
                    />
                  )}
                </span>
                {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
                {!collapsed && count > 0 && (
                  <span
                    className={cn(
                      "tnum min-w-5 rounded-full px-1.5 text-center text-[11.5px] font-semibold leading-5",
                      active ? "bg-brand text-on-brand" : "bg-surface-2 text-ink-2 group-hover:bg-line",
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
      {collapsed && tip && (
        <span
          role="tooltip"
          style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-inner bg-ink px-2 py-1 text-[12.5px] font-medium text-canvas shadow-[var(--shadow-pop)]"
        >
          {tip.text}
        </span>
      )}
    </nav>
  );
}
