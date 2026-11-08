"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { CarIcon, CompassIcon, HomeIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { useTranslations } from "next-intl";

/**
 * Three lanes: Homes, Cars, Experiences.
 *
 * Stays and Renting used to be two tabs over the same inventory, and buying
 * would have made a third. A guest thinks "a place to live", then "for how
 * long, or for good" — so Homes is one lane, and Stay · Rent · Buy is a switch
 * inside it (`components/listing/homes-mode.tsx`).
 *
 * A lane is active anywhere under it, not only on its index: on a listing, a
 * checkout or a booking record the bar still says where you are. It used to
 * go blank one click in, which is exactly when people need it.
 */
const TABS = [
  { key: "homesLane", href: "/stays", icon: HomeIcon, match: ["/stays", "/buy", "/neighbourhoods"] },
  { key: "cars", href: "/cars", icon: CarIcon, match: ["/cars"] },
  { key: "experiences", href: "/experiences", icon: CompassIcon, match: ["/experiences"] },
] as const;

export function laneFor(pathname: string, kind?: string | null): (typeof TABS)[number]["key"] | null {
  if (pathname === "/") return "homesLane";
  // A fresh confirmation carries what was booked; it belongs to that lane.
  // A booking opened from Trips does not, and sits under the account instead.
  if (pathname.startsWith("/bookings/") && kind) {
    return kind === "car" ? "cars" : kind === "experience" ? "experiences" : "homesLane";
  }
  const tab = TABS.find((t) => t.match.some((m) => pathname === m || pathname.startsWith(`${m}/`)));
  return tab?.key ?? null;
}

export function VerticalTabs({ variant = "bar" }: { variant?: "bar" | "strip" }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const current = laneFor(pathname, useSearchParams().get("kind"));

  return (
    <nav
      aria-label={t("lanes")}
      className={cn(
        "flex items-stretch",
        variant === "bar" ? "h-16 gap-1" : "h-11 justify-center gap-1 px-2 sm:px-4",
      )}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = current === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex flex-none items-center gap-2 px-3 text-sm font-medium transition-colors duration-150",
              variant === "strip" && "flex-1 justify-center sm:flex-none",
              active ? "text-ink" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon size={16} />
            {t(tab.key)}
            {/* The indicator sits on the header's bottom hairline, so the
                active lane reads as joined to the page under it. */}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-colors duration-150",
                active ? "bg-ink" : "bg-transparent group-hover:bg-line",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
