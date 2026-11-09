"use client";

import { useCallback, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { Role } from "@/lib/domain/types";
import { homeFor } from "@/lib/workspace/nav";
import { usePreferences } from "@/lib/preferences/context";
import { useDismissable } from "@/lib/use-dismissable";
import { BellIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, GlobeIcon, GridIcon, HomeIcon, MessageIcon, SlidersIcon, SuitcaseIcon } from "@/components/ui/icons";
import { PreferencesPanel } from "./preference-controls";
import { HoverLabel } from "@/components/ui/hover-label";
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
 * A signed-out visitor gets no menu. For a while they got no Sign in either,
 * because with no auth a "Sign in" button could not do the thing it names.
 * That changed when the signed-out Trips and Messages screens started offering
 * a preview sign-in (assume the guest role, refresh): once one screen does it,
 * the header not doing it is the inconsistency. `SignInLink` below is that
 * same action, kept quiet so it does not read as an account system.
 */
type Destination = { href: string; key: string };

/** Each row says what it is twice, in a word and a shape, so the menu reads at a glance. */
export const ICONS: Record<string, typeof HomeIcon> = {
  myHomeLink: HomeIcon,
  trips: SuitcaseIcon,
  messages: MessageIcon,
  notifications: BellIcon,
  settings: SlidersIcon,
  workspace: GridIcon,
};

const GUEST: Destination[] = [
  { href: "/account", key: "myHomeLink" },
  { href: "/trips", key: "trips" },
  { href: "/messages", key: "messages" },
  { href: "/notifications", key: "notifications" },
  { href: "/account/settings", key: "settings" },
];

/**
 * Everyone who works in the workspace reaches it from here, and their
 * messages and notifications live inside it rather than on the public site.
 */
const workspace = (home: string): Destination[] => [
  { href: home, key: "workspace" },
  { href: "/manage/inbox", key: "messages" },
  { href: "/manage/notifications", key: "notifications" },
];

export const BY_ROLE: Record<Role, Destination[]> = {
  visitor: [],
  guest: GUEST,
  driver: workspace("/manage/jobs"),
  guide: workspace("/manage/jobs"),
  ops: workspace("/manage/today"),
  admin: workspace("/manage/overview"),
};

export function AccountMenu({ className }: { className?: string }) {
  const t = useTranslations("header");
  const tRoles = useTranslations("roles");
  const { role, currency } = usePreferences();
  const locale = useLocale();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  // Language, currency and theme open in place, as a second view of the
  // same menu, rather than as a menu of their own in the bar.
  const [view, setView] = useState<"links" | "prefs">("links");
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    setView("links");
  }, []);
  useDismissable(wrapRef, open, close);

  const destinations = BY_ROLE[role];
  if (!destinations.length) return null;

  const initial = tRoles(role).trim().charAt(0).toUpperCase();
  // On one of the account's own screens, the trigger says so: that is the
  // "you are here" for pages that belong to no lane.
  const inAccount = destinations.some((d) => pathname === d.href || pathname.startsWith("/bookings/"));
  // From 1024px a guest's Messages icon marks that page itself; lighting
  // the avatar as well would mark one place twice.
  const barMarks = role === "guest" && pathname === "/messages";

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1 rounded-ctl pl-1 pr-1.5",
          "transition-colors duration-150",
          open || inAccount ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
          !open && barMarks && "lg:bg-transparent lg:text-ink-2 lg:hover:bg-surface-2",
        )}
      >
        {/* Initial rather than a photograph, for the same reason the inspector
            row uses initials: nothing here should look like a real person we
            have not got. */}
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full border border-line bg-brand-tint text-[12px] font-semibold text-brand-deep"
        >
          {initial}
        </span>
        <span className="sr-only">{tRoles(role)}</span>
        <ChevronDownIcon size={13} />
      </button>

      {open && view === "prefs" && (
        <div
          role="dialog"
          aria-label={t("preferences")}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-card border border-line bg-surface p-3 shadow-[var(--shadow-pop)]"
        >
          <button
            type="button"
            onClick={() => setView("links")}
            className="mb-2 flex h-8 cursor-pointer items-center gap-1 rounded-inner pr-2 text-[13px] font-semibold text-ink-2 hover:text-ink"
          >
            <ChevronLeftIcon size={14} />
            {tRoles(role)}
          </button>
          <PreferencesPanel onDone={close} />
        </div>
      )}

      {open && view === "links" && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-50 flex w-64 flex-col",
            "rounded-card border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]",
          )}
        >
          <div className="mb-1 flex items-center gap-2.5 border-b border-line-soft px-2.5 pb-2.5 pt-1.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-full border border-line bg-brand-tint text-[14px] font-semibold text-brand-deep"
            >
              {initial}
            </span>
            <p className="text-[13px] font-medium text-ink">{tRoles(role)}</p>
          </div>
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
                  "flex items-center gap-2.5 rounded-inner px-2.5 py-2 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-surface-2 text-ink"
                    : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {(() => {
                  const Icon = ICONS[destination.key];
                  return Icon ? <Icon size={16} className={active ? "text-ink" : "text-ink-3"} /> : null;
                })()}
                {t(destination.key)}
              </Link>
            );
          })}
          <div className="mt-1 border-t border-line-soft pt-1">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="dialog"
              aria-label={`${t("preferences")}: ${locale.toUpperCase()}, ${currency}`}
              onClick={() => setView("prefs")}
              className="flex w-full cursor-pointer items-center gap-2 rounded-inner px-2.5 py-2 text-left text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
            >
              <GlobeIcon size={15} className="text-ink-3" />
              <span className="flex-1 whitespace-nowrap">{t("languageCurrency")}</span>
              <span className="font-mono text-[12px] text-ink-3">
                {locale.toUpperCase()} · {currency}
              </span>
              <ChevronRightIcon size={14} className="text-ink-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The preview's sign-in, as a quiet text control for the bar.
 *
 * Same action as the signed-out screens: assume the guest role and refresh, so
 * the server components that read the role cookie render again.
 */
export function SignInLink({ className }: { className?: string }) {
  const t = useTranslations("header");
  const { role } = usePreferences();
  const pathname = usePathname();
  if (role !== "visitor") return null;
  // Back to this page afterwards; safeNext on the sign-in screen keeps it on this site.
  return (
    <div className={className}>
      <Link
        href={`/sign-in?next=${encodeURIComponent(pathname)}`}
        className="flex h-9 items-center rounded-ctl px-3 text-sm font-semibold text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        {t("signIn")}
      </Link>
    </div>
  );
}

/**
 * The role's own screens in the bar.
 *
 * A guest gets Messages as an icon, beside Saved and the bell: a reply is
 * the one thing worth a dot in the bar. Trips lives in the avatar menu with
 * the rest of the account, and so do language and currency; as words in
 * the bar they read as more lanes beside Homes, Cars and Experiences.
 * The icon names itself on hover and focus.
 *
 * Everyone else has one door, into the workspace, where their messages are
 * too. That stays a word: it is the only one, and there is no icon that
 * says "where I work" without a label.
 *
 * `unread` comes from the server for every role at once, because the role is
 * client state here: the layout is static, and reading the role cookie in the
 * header would make every page in the product dynamic. Only booleans cross,
 * never a thread. Phase 2 replaces this with a per-user count.
 */
export function AccountLinks({
  unread,
  className,
}: {
  unread: Partial<Record<Role, boolean>>;
  className?: string;
}) {
  const t = useTranslations("header");
  const { role } = usePreferences();
  const pathname = usePathname();
  if (role === "visitor") return null;

  const home = homeFor(role);
  if (home) {
    return (
      <nav aria-label={t("yourScreens")} className={cn("items-center", className)}>
        <Link
          href={home}
          className="flex h-9 items-center whitespace-nowrap rounded-ctl px-3 text-sm font-medium text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
        >
          {t("workspace")}
        </Link>
      </nav>
    );
  }
  const hasUnread = !!unread[role];

  const link = (href: string, icon: React.ReactNode, name: string, label: string, dot = false) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative grid size-9 place-items-center rounded-ctl transition-colors duration-150",
          active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {icon}
        {dot && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-surface" />}
        <HoverLabel>{name}</HoverLabel>
      </Link>
    );
  };

  return (
    <nav aria-label={t("yourScreens")} className={cn("items-center gap-1", className)}>
      {link("/messages", <MessageIcon size={17} />, t("messages"), hasUnread ? t("messagesUnread") : t("messages"), hasUnread)}
    </nav>
  );
}
