"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Role } from "@/lib/domain/types";
import { usePreferences } from "@/lib/preferences/context";
import { useDismissable } from "@/lib/use-dismissable";
import { ChevronDownIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

/**
 * How anyone reaches their own screens.
 *
 * Until this existed, `/trips`, `/messages` and the role dashboards had
 * translations in the header block and no link anywhere in the product — every
 * one of them could only be reached by typing the URL, which meant nobody had
 * walked to them the way a user would.
 *
 * Destinations are role-derived rather than listed for everyone. A driver has
 * no trips and a guest has no payouts, and showing both to both is how a shell
 * quietly grows a navigation that no real account would ever see.
 *
 * A signed-out visitor gets nothing here on purpose. There is no auth yet, so
 * a "Sign in" button would be a control that cannot do the thing it names; a
 * missing button is the more honest gap, and the preview bar is how a role is
 * assumed while this milestone runs.
 */
type Destination = { href: string; key: string };

const GUEST: Destination[] = [
  { href: "/trips", key: "trips" },
  { href: "/messages", key: "messages" },
];

const SUPPLY: Destination[] = [
  { href: "/inventory", key: "inventory" },
  { href: "/messages", key: "messages" },
];

const OPS: Destination[] = [
  { href: "/queue", key: "queue" },
  { href: "/messages", key: "messages" },
];

const BY_ROLE: Record<Role, Destination[]> = {
  visitor: [],
  guest: GUEST,
  host: SUPPLY,
  driver: SUPPLY,
  guide: SUPPLY,
  ops: OPS,
  // Admin has no journey written for it (Product & UX §5 covers four), so it
  // borrows the ops destinations rather than inventing a fifth screen nobody
  // has specified. Revisit when there is an admin journey to build against.
  admin: OPS,
};

export function AccountMenu() {
  const t = useTranslations("header");
  const tRoles = useTranslations("roles");
  const { role } = usePreferences();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(wrapRef, open, close);

  const destinations = BY_ROLE[role];
  if (!destinations.length) return null;

  const initial = tRoles(role).trim().charAt(0).toUpperCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1.5 rounded-ctl border border-line bg-surface pl-1 pr-2",
          "text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {/* Initial rather than a photograph, for the same reason the inspector
            row uses initials: nothing here should look like a real person we
            have not got. */}
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full bg-surface-2 text-[12px] font-bold text-ink-2"
        >
          {initial}
        </span>
        <span className="sr-only">{tRoles(role)}</span>
        <ChevronDownIcon size={13} />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-[calc(100%+6px)] z-50 flex w-52 flex-col",
            "rounded-card border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]",
          )}
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
            {tRoles(role)}
          </p>
          {destinations.map((destination) => {
            const active = pathname === destination.href;
            return (
              <Link
                key={destination.href}
                role="menuitem"
                href={destination.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-[6px] px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {t(destination.key)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
