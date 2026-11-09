"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

export const ACCOUNT_SECTIONS = [
  "overview",
  "trips",
  "renting",
  "viewings",
  "payments",
  "saved",
  "notifications",
  "settings",
] as const;
export type AccountSection = (typeof ACCOUNT_SECTIONS)[number];

const HREF: Record<AccountSection, string> = {
  overview: "/account",
  trips: "/trips",
  renting: "/account/renting",
  viewings: "/account/viewings",
  payments: "/account/payments",
  saved: "/saved",
  notifications: "/notifications",
  settings: "/account/settings",
};

function activeSection(pathname: string): AccountSection | null {
  if (pathname === "/account") return "overview";
  if (pathname.startsWith("/trips") || pathname.startsWith("/bookings")) return "trips";
  // The ID check is a settings tab with its own address.
  if (pathname === "/account/verify-id") return "settings";
  for (const s of ACCOUNT_SECTIONS) {
    if (s !== "overview" && pathname.startsWith(HREF[s])) return s;
  }
  return null;
}

/**
 * A guest's own pages, as a menu inside the page rather than an app sidebar:
 * a 220px column from 1024px up, a strip of pills that scrolls sideways
 * below that. Renting and viewings appear only for a guest who has one, so
 * a weekend visitor is not shown a rent schedule they will never have.
 */
export function AccountNav({ has }: { has: { renting: boolean; viewings: boolean } }) {
  const t = useTranslations("account.nav");
  const pathname = usePathname();
  const current = activeSection(pathname);
  const sections = ACCOUNT_SECTIONS.filter(
    (s) => (s !== "renting" || has.renting) && (s !== "viewings" || has.viewings),
  );

  return (
    <nav aria-label={t("label")} className="min-w-0 lg:sticky lg:top-[calc(var(--header-offset)+24px)]">
      <p className="hidden px-3 pb-2 text-[12px] font-medium text-ink-3 lg:block">{t("label")}</p>
      <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0">
        {sections.map((s) => {
          const active = current === s;
          return (
            <li key={s} className="flex-none">
              <Link
                href={HREF[s]}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-[14px] transition-colors lg:rounded-ctl lg:border-0 lg:px-3",
                  active
                    ? "border-brand bg-brand-tint font-medium text-brand-deep"
                    : "border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink lg:bg-transparent",
                )}
              >
                {t(s)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
