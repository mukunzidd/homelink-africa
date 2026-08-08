"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { BedIcon, CarIcon, CompassIcon, KeyIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

/**
 * The four supply lanes as tabs, not as nav links.
 *
 * This replaces the intent doors from the landing page. The doors asked "what
 * brings you here?" once, on one screen, and had no answer for someone who
 * arrived on a listing page or changed their mind. A persistent tab strip asks
 * the same question everywhere and answers it reversibly.
 *
 * "Stays" and "Renting" are the same inventory under different intent, and the
 * names have to carry that or the pair is just two synonyms. A bed and a key
 * say it faster than either word does: one is a night, the other is a lease.
 */
const TABS = [
  { key: "stays", path: "/stays", href: "/stays", icon: BedIcon, lease: false },
  { key: "homes", path: "/stays", href: "/stays?band=long", icon: KeyIcon, lease: true },
  { key: "cars", path: "/cars", href: "/cars", icon: CarIcon, lease: false },
  {
    key: "experiences",
    path: "/experiences",
    href: "/experiences",
    icon: CompassIcon,
    lease: false,
  },
] as const;

export function VerticalTabs() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  // Stays and Renting share a path and differ only by the lease band, so the
  // active tab cannot be decided from the pathname alone.
  const isLease = useSearchParams().get("band") === "long";

  return (
    <nav
      aria-label={t("stays")}
      className="flex items-end justify-center gap-1 sm:gap-2"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const onPath =
          pathname === tab.path || (tab.path === "/stays" && pathname === "/");
        const active =
          onPath && (tab.path !== "/stays" || tab.lease === isLease);

        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              "group relative flex flex-col items-center gap-1.5 rounded-ctl px-3 pb-3 pt-1.5",
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
