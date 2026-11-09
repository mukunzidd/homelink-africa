"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "profile", href: "/account/settings" },
  { key: "security", href: "/account/settings/security" },
  { key: "payment", href: "/account/settings/payment-methods" },
  { key: "notifications", href: "/account/settings/notifications" },
  { key: "preferences", href: "/account/settings/preferences" },
  { key: "privacy", href: "/account/settings/privacy" },
  { key: "id", href: "/account/verify-id" },
] as const;

/** Settings as a row of tabs that wraps rather than scrolls, so the last one is never hidden at 390px. */
export function SettingsNav() {
  const t = useTranslations("account.settings.tabs");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="flex flex-wrap gap-1.5">
      {TABS.map((x) => {
        const on = pathname === x.href;
        return (
          <Link key={x.key} href={x.href} aria-current={on ? "page" : undefined} className={cn("rounded-full border px-3.5 py-1.5 text-[13.5px] font-medium", on ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-surface text-ink-2 hover:border-brand")}>
            {t(x.key)}
          </Link>
        );
      })}
    </nav>
  );
}
