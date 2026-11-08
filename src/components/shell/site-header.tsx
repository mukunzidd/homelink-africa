import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";
import { VerticalTabs } from "./vertical-tabs";
import { PreferencesMenu } from "./preference-controls";
import { SavedLink } from "./saved-link";
import { AccountLinks, AccountMenu, SignInLink } from "./account-menu";
import { repos } from "@/lib/repos";
import type { Role } from "@/lib/domain/types";
import { MobileMenu } from "./mobile-menu";
import { SmartSearchTrigger } from "@/components/search/smart-search";
import { NotificationBell } from "@/components/notifications/bell";
import { TripPill } from "@/components/cart/trip-pill";

/**
 * One 64px bar on a desktop. Below 1024px the lanes drop to a 44px strip of
 * their own, because the bar cannot hold the logo, four lanes and the actions
 * without either wrapping the wordmark or pushing the account menu off the
 * edge — both of which it used to do, at 768 and below.
 *
 * Only the search field has a border, from 1280px up. Everything else is a
 * borderless control that gets a surface on hover: six boxes of equal weight
 * read as a toolbar, and the bar is not where anybody does their work.
 *
 * On phones the preferences and the account move into the menu sheet, so the
 * bar is logo, search, saved and the menu, with nothing hidden that cannot be
 * reached.
 *
 * From 1024px up a guest also gets Messages as an icon, in one run with
 * Saved and the bell; a workspace role gets one word, into the workspace; a
 * visitor gets language and currency and a quiet Sign in. Search is an icon
 * at every width, and the trip pill shows only once a trip has something in
 * it.
 */
const SIGNED_IN: Role[] = ["guest", "driver", "guide", "ops", "admin"];
export async function SiteHeader() {
  const t = await getTranslations("header");
  const unread = Object.fromEntries(
    await Promise.all(
      SIGNED_IN.map(async (role) => [
        role,
        (await repos().messaging.forRole(role)).some((c) => c.unreadCount > 0),
      ] as const),
    ),
  ) as Partial<Record<Role, boolean>>;

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-ctl focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        {t("skipToContent")}
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex-none rounded-ctl">
            <Logo />
          </Link>

          {/* The tabs read the lease band from the query to tell Stays from
              Renting, and `useSearchParams` opts a route out of static
              rendering unless it sits behind a boundary. The fallback
              reserves the bar's height so nothing jumps as they hydrate. */}
          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <Suspense fallback={<div className="h-16" />}>
              <VerticalTabs />
            </Suspense>
          </div>

          <div className="ml-auto flex flex-none items-center gap-1 lg:ml-0">
            <TripPill />
            <SmartSearchTrigger />
            <PreferencesMenu className="hidden sm:block" />
            {/* What is yours, as one run of icons: messages, saved, and the
                bell beside the avatar. Trips, language and currency are in
                the avatar menu; a visitor keeps language and currency here. */}
            <AccountLinks unread={unread} className="hidden lg:flex" />
            <SavedLink />
            <NotificationBell allHref="/notifications" />
            <AccountMenu className="hidden sm:block" />
            <SignInLink className="hidden sm:block" />
            <MobileMenu className="sm:hidden" />
          </div>
        </div>

        <div className="border-t border-line-soft lg:hidden">
          <Suspense fallback={<div className="h-11" />}>
            <VerticalTabs variant="strip" />
          </Suspense>
        </div>
      </header>
    </>
  );
}
