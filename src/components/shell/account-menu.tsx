"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import type { Role } from "@/lib/domain/types";
import { homeFor } from "@/lib/workspace/nav";
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
 * A signed-out visitor gets no menu. For a while they got no Sign in either,
 * because with no auth a "Sign in" button could not do the thing it names.
 * That changed when the signed-out Trips and Messages screens started offering
 * a preview sign-in (assume the guest role, refresh): once one screen does it,
 * the header not doing it is the inconsistency. `SignInLink` below is that
 * same action, kept quiet so it does not read as an account system.
 */
type Destination = { href: string; key: string };

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
  const { role } = usePreferences();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismissable(wrapRef, open, close);

  const destinations = BY_ROLE[role];
  if (!destinations.length) return null;

  const initial = tRoles(role).trim().charAt(0).toUpperCase();
  // On one of the account's own screens, the trigger says so: that is the
  // "you are here" for pages that belong to no lane.
  const inAccount = destinations.some((d) => pathname === d.href || pathname.startsWith("/bookings/"));

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-1 rounded-ctl pl-1 pr-1.5",
          "transition-colors duration-150",
          open || inAccount ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
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

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-[calc(100%+8px)] z-50 flex w-52 flex-col",
            "rounded-card border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)]",
          )}
        >
          {/* Who the menu belongs to, as the avatar and the role under it. The
              trigger only shows an initial, and "G" alone does not say guest. */}
          <div className="mb-1 flex flex-col items-start gap-1.5 border-b border-line-soft px-2.5 pb-2.5 pt-1.5">
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
                  "rounded-inner px-2.5 py-2 text-sm font-medium transition-colors duration-150",
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

/**
 * The preview's sign-in, as a quiet text control for the bar.
 *
 * Same action as the signed-out screens: assume the guest role and refresh, so
 * the server components that read the role cookie render again.
 */
export function SignInLink({ className }: { className?: string }) {
  const t = useTranslations("header");
  const { role, setRole } = usePreferences();
  const router = useRouter();
  if (role !== "visitor") return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => {
          setRole("guest");
          router.refresh();
        }}
        className="flex h-9 cursor-pointer items-center rounded-ctl px-3 text-sm font-semibold text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        {t("signIn")}
      </button>
    </div>
  );
}

/**
 * The role's own screen and Messages, as text in the bar.
 *
 * The avatar menu already lists both, but a menu is a place people have to
 * think to open. The destination a role comes back for every day (a guest's
 * trips, a host's homes, the ops queue) earns a place on the bar itself.
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

  // A guest's two screens sit in the bar; everyone else has one door, into
  // the workspace, where their messages are too.
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
  const primary = { href: "/trips", label: t("trips") };
  const hasUnread = !!unread[role];

  const link = (href: string, children: React.ReactNode, label?: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-9 items-center gap-1.5 whitespace-nowrap rounded-ctl px-3 text-sm font-medium transition-colors duration-150",
          active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav aria-label={t("yourScreens")} className={cn("items-center", className)}>
      {link(primary.href, primary.label)}
      {link(
        "/messages",
        <>
          {t("messages")}
          {hasUnread && (
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
          )}
        </>,
        hasUnread ? t("messagesUnread") : undefined,
      )}
    </nav>
  );
}
