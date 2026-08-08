"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { CarIcon, CompassIcon, PinIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

/**
 * The four supply lanes as tabs, not as nav links.
 *
 * This replaces the intent doors from the landing page. The doors asked "what
 * brings you here?" once, on one screen, and then had no answer for someone
 * who arrived on a listing page or changed their mind. A persistent tab strip
 * asks the same question everywhere and answers it reversibly.
 *
 * Stays and Homes are the same inventory under different intent: a nightly
 * booking and a lease application are different products to the person paying,
 * even though Product & UX §3 rightly keeps them one entity underneath.
 */
const TABS = [
  { key: "stays", href: "/stays", icon: PinIcon },
  { key: "homes", href: "/stays?band=long", icon: PinIcon, match: "band=long" },
  { key: "cars", href: "/cars", icon: CarIcon },
  { key: "experiences", href: "/experiences", icon: CompassIcon },
] as const;

export function VerticalTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("stays")}
      className="flex items-end justify-center gap-1 sm:gap-2"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active =
          pathname === tab.href.split("?")[0] ||
          (tab.href === "/stays" && pathname === "/");

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "group relative flex flex-col items-center gap-1 rounded-ctl px-3 pb-2.5 pt-1",
              "transition-colors duration-150",
              active ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon size={20} />
            <span className="text-[13px] font-medium">{t(tab.key)}</span>

            {/* Underline rather than a filled pill: these are peers, and a
                filled state would compete with the search pill below. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-colors duration-150",
                active ? "bg-ink" : "bg-transparent group-hover:bg-line",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
